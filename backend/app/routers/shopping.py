"""Port of generate-shopping-list edge function."""

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies import get_current_user, get_service_client
from ..models.shopping import GenerateShoppingListRequest
from ..services.db import maybe_single_data

router = APIRouter()
logger = logging.getLogger(__name__)

CATEGORY_ORDER = ["Produce", "Meat & Fish", "Dairy", "Pantry", "Other"]
DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _normalise_category(raw: str) -> str:
    lower = (raw or "other").lower()
    if lower in ("produce", "vegetable", "fruit"):
        return "Produce"
    if lower in ("meat", "fish", "seafood", "poultry"):
        return "Meat & Fish"
    if lower in ("dairy", "cheese", "milk"):
        return "Dairy"
    if lower in ("pantry", "spice", "condiment", "grain"):
        return "Pantry"
    return "Other"


def _group_by_category(items: list[dict]) -> list[dict]:
    cat_map: dict[str, list] = {}
    for item in items:
        cat = _normalise_category(item.get("category", "other"))
        cat_map.setdefault(cat, []).append(item)
    result = [{"category": c, "items": cat_map[c]} for c in CATEGORY_ORDER if c in cat_map]
    # Append any unexpected categories
    for c, its in cat_map.items():
        if c not in CATEGORY_ORDER:
            result.append({"category": c, "items": its})
    return result


def _date_for_day(week_start: date, dow: int) -> date:
    """Return the date in the week for a given ISO day-of-week (1=Mon, 7=Sun).

    Note: JS uses 0=Sun, 1=Mon. Python's weekday() uses 0=Mon.
    The shopping_days field uses JS convention.
    """
    # Convert JS dow (0=Sun, 1=Mon..6=Sat) to Mon-based offset
    offset = 6 if dow == 0 else dow - 1
    return week_start + timedelta(days=offset)


def _save_shopping_list(client, household_id: str, plan_id: str, items: list[dict]) -> str | None:
    existing = maybe_single_data(
        client.from_("shopping_lists")
        .select("id")
        .eq("household_id", household_id)
        .eq("plan_id", plan_id)
        .maybe_single()
        .execute()
    )

    if existing:
        saved = (
            client.from_("shopping_lists")
            .update({"items": items})
            .eq("id", existing["id"])
            .execute()
        )
        if saved.data:
            return saved.data[0]["id"]
        return existing["id"]

    inserted = (
        client.from_("shopping_lists")
        .insert({"household_id": household_id, "plan_id": plan_id, "items": items})
        .execute()
    )
    if inserted.data:
        return inserted.data[0]["id"]
    return None


def _group_by_shopping_day(
    items: list[dict],
    planned_meals: list[dict],
    shopping_days: list[int],
    week_start: date,
) -> list[dict]:
    if not shopping_days:
        return [
            {
                "shoppingDate": week_start.isoformat(),
                "label": "This week's shop",
                "categories": _group_by_category(items),
            }
        ]

    sorted_days = sorted(shopping_days, key=lambda d: 6 if d == 0 else d - 1)

    groups = [
        {
            "shoppingDate": _date_for_day(week_start, dow).isoformat(),
            "label": f"{DAY_NAMES[dow]}'s shop",
            "categories": [],
        }
        for dow in sorted_days
    ]
    group_recipe_titles: list[set] = [set() for _ in sorted_days]

    for pm in planned_meals:
        meal_offset = pm["day_of_week"]  # Mon-based (0=Mon)
        recipe = (
            pm.get("chosen_recipe") if pm.get("chosen_recipe_id") else pm.get("recipes")
        )
        if not recipe:
            continue

        group_idx = 0
        for i in range(len(sorted_days) - 1, -1, -1):
            shopping_offset = 6 if sorted_days[i] == 0 else sorted_days[i] - 1
            if shopping_offset <= meal_offset:
                group_idx = i
                break
        group_recipe_titles[group_idx].add(recipe["title"])

    for item in items:
        assigned = -1
        for gi, titles in enumerate(group_recipe_titles):
            if any(title in titles for title in item.get("forMeals", [])):
                assigned = gi
                break
        if assigned == -1:
            assigned = 0

        group = groups[assigned]
        cat_label = _normalise_category(item.get("category", "other"))
        cat_entry = next((c for c in group["categories"] if c["category"] == cat_label), None)
        if cat_entry is None:
            cat_entry = {"category": cat_label, "items": []}
            group["categories"].append(cat_entry)
        cat_entry["items"].append(item)

    for group in groups:
        group["categories"].sort(
            key=lambda c: CATEGORY_ORDER.index(c["category"])
            if c["category"] in CATEGORY_ORDER
            else len(CATEGORY_ORDER)
        )

    return [g for g in groups if g["categories"]]


@router.post("/generate")
def generate_shopping_list(
    body: GenerateShoppingListRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Aggregate ingredients from a meal plan into a grouped shopping list."""
    client = get_service_client()

    # Load plan (RLS enforces membership via the service client, but we verify below)
    plan_res = (
        client.from_("meal_plans")
        .select("id, week_start, household_id")
        .eq("id", body.planId)
        .single()
        .execute()
    )
    if not plan_res.data:
        raise HTTPException(404, detail="Plan not found")
    plan = plan_res.data

    # Verify user is a household member
    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", plan["household_id"])
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden")

    # Load planned meals with recipes
    meals_res = (
        client.from_("planned_meals")
        .select(
            """
            id,
            day_of_week,
            meal_slot,
            chosen_recipe_id,
            recipe_id,
            recipes!planned_meals_recipe_id_fkey (title, ingredients, servings),
            chosen_recipe:recipes!planned_meals_chosen_recipe_id_fkey (title, ingredients, servings)
            """
        )
        .eq("plan_id", body.planId)
        .execute()
    )
    planned_meals = meals_res.data or []

    # Load pantry staples from user preferences (personal setting)
    prefs = maybe_single_data(
        client.from_("user_preferences")
        .select("pantry_staples")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    pantry_staples = [s.lower().strip() for s in (prefs or {}).get("pantry_staples") or []]

    # Load shopping days from the household (household-level setting)
    household_res = (
        client.from_("households")
        .select("shopping_days")
        .eq("id", plan["household_id"])
        .single()
        .execute()
    )
    shopping_days: list[int] = (household_res.data or {}).get("shopping_days") or []

    # Aggregate ingredients by name+unit
    merged: dict[str, dict] = {}
    for pm in planned_meals:
        recipe = pm.get("chosen_recipe") if pm.get("chosen_recipe_id") else pm.get("recipes")
        if not recipe:
            continue
        for ing in recipe.get("ingredients") or []:
            norm_name = ing["name"].lower().strip()
            norm_unit = ing["unit"].lower().strip()

            # Skip pantry staples
            if any(s in norm_name or norm_name in s for s in pantry_staples if s):
                continue

            key = f"{norm_name}||{norm_unit}"
            if key in merged:
                merged[key]["amount"] += ing["amount"]
                if recipe["title"] not in merged[key]["forMeals"]:
                    merged[key]["forMeals"].append(recipe["title"])
            else:
                merged[key] = {
                    "name": norm_name,
                    "amount": ing["amount"],
                    "unit": norm_unit,
                    "category": ing.get("category") or "other",
                    "checked": False,
                    "forMeals": [recipe["title"]],
                }

    all_items = list(merged.values())
    week_start = date.fromisoformat(plan["week_start"])
    grouped = _group_by_shopping_day(all_items, planned_meals, shopping_days, week_start)

    # Persist shopping list
    list_id = _save_shopping_list(client, plan["household_id"], body.planId, all_items)
    if not list_id:
        logger.warning("[generate-shopping-list] save warning: no data returned")

    return {
        "listId": list_id,
        "grouped": grouped,
        "allItems": all_items,
    }


# ─── Simple write endpoints ───────────────────────────────────────────────────


class ToggleShoppingItemRequest(BaseModel):
    listId: str
    planId: str
    itemName: str
    unit: str


class MarkListExportedRequest(BaseModel):
    listId: str


@router.post("/toggle-item")
def toggle_shopping_item(
    body: ToggleShoppingItemRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Toggle the checked state of a shopping item."""
    client = get_service_client()

    list_res = (
        client.from_("shopping_lists")
        .select("id, household_id, items")
        .eq("id", body.listId)
        .single()
        .execute()
    )
    if not list_res.data:
        raise HTTPException(404, detail="Shopping list not found")
    row = list_res.data

    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", row["household_id"])
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden")

    items = row["items"] or []
    updated = [
        {**item, "checked": not item.get("checked", False)}
        if item.get("name") == body.itemName and item.get("unit") == body.unit
        else item
        for item in items
    ]

    client.from_("shopping_lists").update({"items": updated}).eq("id", body.listId).execute()
    return {"items": updated}


@router.post("/mark-exported")
def mark_list_exported(
    body: MarkListExportedRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Set exported_at timestamp on a shopping list."""
    from datetime import datetime, timezone

    client = get_service_client()

    list_res = (
        client.from_("shopping_lists")
        .select("id, household_id")
        .eq("id", body.listId)
        .single()
        .execute()
    )
    if not list_res.data:
        raise HTTPException(404, detail="Shopping list not found")

    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", list_res.data["household_id"])
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden")

    exported_at = datetime.now(timezone.utc).isoformat()
    client.from_("shopping_lists").update({"exported_at": exported_at}).eq(
        "id", body.listId
    ).execute()
    return {"exportedAt": exported_at}
