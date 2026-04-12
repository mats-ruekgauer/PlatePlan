"""Port of generate-plan and regenerate-meal edge functions."""

from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from postgrest.exceptions import APIError

from ..dependencies import get_current_user, get_service_client
from ..models.plan import (
    GeneratePlanRequest,
    RegenerateMealRequest,
    PlanResponse,
    SingleMealResponse,
    Recipe,
)
from ..services.db import maybe_single_data
from ..services.deepseek import call_deepseek_json
from ..services.prompts import (
    PLAN_GENERATION_SYSTEM_PROMPT,
    build_plan_generation_user_prompt,
)
from ..services.preferences import merge_preferences

router = APIRouter()
logger = logging.getLogger(__name__)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ─── Helpers ─────────────────────────────────────────────────────────────────


def upsert_recipe(client, user_id: str, recipe: Recipe) -> str:
    """Insert or reuse a recipe by title+user_id. Returns the recipe UUID."""
    existing = maybe_single_data(
        client.from_("recipes")
        .select("id")
        .eq("user_id", user_id)
        .eq("title", recipe.title)
        .maybe_single()
        .execute()
    )
    if existing:
        return existing["id"]

    payload = _build_recipe_payload(user_id, recipe)
    try:
        inserted = client.from_("recipes").insert(payload).execute()
    except APIError as exc:
        if _is_missing_recipe_source_column(exc):
            logger.warning("recipes.source missing in DB; retrying insert without source column")
            payload.pop("source", None)
            inserted = client.from_("recipes").insert(payload).execute()
        elif _is_invalid_integer_input(exc):
            logger.error("recipes insert rejected numeric payload: %s | payload=%s", exc, payload)
            raise HTTPException(502, detail="AI recipe values could not be normalized for the database") from exc
        else:
            raise
    if not inserted.data:
        raise HTTPException(500, detail=f'Failed to insert recipe "{recipe.title}"')
    return inserted.data[0]["id"]


def _is_missing_recipe_source_column(exc: APIError) -> bool:
    return exc.code == "42703" and "recipes.source" in str(exc)


def _is_invalid_integer_input(exc: APIError) -> bool:
    return exc.code == "22P02" and "type integer" in str(exc)


def _build_recipe_payload(user_id: str, recipe: Recipe) -> dict:
    return {
        "user_id": user_id,
        "title": recipe.title,
        "description": recipe.description,
        "ingredients": [i.model_dump() for i in recipe.ingredients],
        "steps": recipe.steps,
        "calories_per_serving": recipe.caloriesPerServing,
        "protein_per_serving_g": recipe.proteinPerServingG,
        "carbs_per_serving_g": recipe.carbsPerServingG,
        "fat_per_serving_g": recipe.fatPerServingG,
        "servings": recipe.servings,
        "cook_time_minutes": recipe.cookTimeMinutes,
        "cuisine": recipe.cuisine,
        "tags": recipe.tags,
        "is_seasonal": recipe.isSeasonal,
        "season": recipe.season,
        "estimated_price_eur": recipe.estimatedPriceEur,
        "source": "ai_generated",
    }


def load_manual_recipes(client, user_id: str) -> list[dict]:
    try:
        manual_rows = (
            client.from_("recipes")
            .select("title, description, cuisine, tags")
            .eq("user_id", user_id)
            .eq("source", "manual")
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as exc:
        if not _is_missing_recipe_source_column(exc):
            raise

        logger.warning(
            "recipes.source missing in DB; falling back to all user recipes for manual recipe prompt context"
        )
        manual_rows = (
            client.from_("recipes")
            .select("title, description, cuisine, tags")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

    return [
        {
            "title": r["title"],
            "description": r["description"],
            "cuisine": r["cuisine"],
            "tags": r["tags"] or [],
        }
        for r in (manual_rows.data or [])
    ]


def _save_meal_plan(client, household_id: str, week_start: str) -> dict:
    existing_res = (
        client.from_("meal_plans")
        .select("*")
        .eq("household_id", household_id)
        .eq("week_start", week_start)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    existing = (existing_res.data or [None])[0]

    if existing:
        updated = (
            client.from_("meal_plans")
            .update({"status": "active"})
            .eq("id", existing["id"])
            .execute()
        )
        if updated.data:
            return updated.data[0]
        return existing

    inserted = (
        client.from_("meal_plans")
        .insert({"household_id": household_id, "week_start": week_start, "status": "active"})
        .execute()
    )
    if not inserted.data:
        raise HTTPException(500, detail="Failed to save meal plan")
    return inserted.data[0]


def _save_planned_meal(
    client,
    *,
    plan_id: str,
    day_of_week: int,
    meal_slot: str,
    recipe_id: str,
    alternative_recipe_id: str,
) -> dict:
    existing_res = (
        client.from_("planned_meals")
        .select("*")
        .eq("plan_id", plan_id)
        .eq("day_of_week", day_of_week)
        .eq("meal_slot", meal_slot)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    existing = (existing_res.data or [None])[0]

    payload = {
        "plan_id": plan_id,
        "day_of_week": day_of_week,
        "meal_slot": meal_slot,
        "recipe_id": recipe_id,
        "alternative_recipe_id": alternative_recipe_id,
    }

    if existing:
        updated = (
            client.from_("planned_meals")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        )
        if updated.data:
            return updated.data[0]
        return existing

    inserted = client.from_("planned_meals").insert(payload).execute()
    if not inserted.data:
        raise HTTPException(500, detail="Failed to save planned meal")
    return inserted.data[0]


# ─── Routes ──────────────────────────────────────────────────────────────────


@router.post("/generate")
def generate_plan(
    body: GeneratePlanRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Generate a full weekly meal plan for a household."""
    client = get_service_client()

    # Verify caller is a household member
    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", body.householdId)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden: not a member of this household")

    # Load all member user IDs
    members_res = (
        client.from_("household_members")
        .select("user_id")
        .eq("household_id", body.householdId)
        .execute()
    )
    if not members_res.data:
        raise HTTPException(500, detail="Failed to load household members")
    member_ids = [m["user_id"] for m in members_res.data]

    # Load all members' preferences
    prefs_res = (
        client.from_("user_preferences")
        .select("*")
        .in_("user_id", member_ids)
        .execute()
    )
    if not prefs_res.data:
        raise HTTPException(404, detail="No preferences found for household members")

    merged = merge_preferences(prefs_res.data)

    # Load household-level planning settings (managed slots, batch cook days)
    household_res = (
        client.from_("households")
        .select("managed_meal_slots, batch_cook_days")
        .eq("id", body.householdId)
        .single()
        .execute()
    )
    household = household_res.data or {}
    merged["managedMealSlots"] = household.get("managed_meal_slots") or ["dinner"]
    merged["batchCookDays"] = household.get("batch_cook_days") or 1

    # Load the requesting user's preferred language
    lang_res = maybe_single_data(
        client.from_("user_preferences")
        .select("preferred_language")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    merged["preferredLanguage"] = (lang_res or {}).get("preferred_language", "en")

    # Load manual recipes
    manual_recipes = load_manual_recipes(client, user_id)

    # Load last 10 feedback entries
    feedback_rows = (
        client.from_("meal_feedback")
        .select("recipe_id, taste_rating, portion_rating, would_repeat, notes, recipes(title)")
        .in_("user_id", member_ids)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    feedback_history = [
        {
            "recipeTitle": (row.get("recipes") or {}).get("title", "Unknown"),
            "tasteRating": row["taste_rating"],
            "portionRating": row["portion_rating"],
            "wouldRepeat": row["would_repeat"],
            "notes": row["notes"],
        }
        for row in (feedback_rows.data or [])
    ]

    # Load favourite dishes
    favs_rows = (
        client.from_("user_favorites")
        .select("custom_name, recipes(title, cuisine)")
        .in_("user_id", member_ids)
        .execute()
    )
    favorite_dishes = [
        {
            "name": (row.get("recipes") or {}).get("title") or row.get("custom_name"),
            "cuisine": (row.get("recipes") or {}).get("cuisine"),
        }
        for row in (favs_rows.data or [])
        if (row.get("recipes") or {}).get("title") or row.get("custom_name")
    ]

    # Build prompt and call DeepSeek
    week_date = date.fromisoformat(body.weekStart)
    current_month = week_date.strftime("%B")
    user_prompt = build_plan_generation_user_prompt(
        week_start=body.weekStart,
        preferences=merged,
        feedback_history=feedback_history,
        favorite_dishes=favorite_dishes,
        manual_recipes=manual_recipes,
        current_month=current_month,
        member_count=merged.get("memberCount", 1),
    )

    raw = call_deepseek_json(
        system_prompt=PLAN_GENERATION_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=8192,
        request_label="generate-plan",
    )

    try:
        plan = PlanResponse.model_validate(raw)
    except ValidationError as exc:
        logger.error("[generate-plan] DeepSeek response validation failed: %s", exc)
        raise HTTPException(502, detail="AI response validation failed") from exc

    meal_plan = _save_meal_plan(client, body.householdId, body.weekStart)

    inserted_meals = []
    for day in plan.days:
        for slot in day.meals:
            primary_id = upsert_recipe(client, user_id, slot.recipe)
            alt_id = upsert_recipe(client, user_id, slot.alternativeRecipe)

            pm_res = _save_planned_meal(
                client,
                plan_id=meal_plan["id"],
                day_of_week=day.dayOfWeek,
                meal_slot=slot.slot,
                recipe_id=primary_id,
                alternative_recipe_id=alt_id,
            )
            inserted_meals.append(pm_res)

    return {"planId": meal_plan["id"], "meals": inserted_meals}


@router.post("/regenerate-meal")
def regenerate_meal(
    body: RegenerateMealRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Regenerate a single meal slot in an existing plan."""
    client = get_service_client()

    # Load planned meal + plan context
    pm_res = (
        client.from_("planned_meals")
        .select("*, meal_plans(*), recipes!planned_meals_recipe_id_fkey(title)")
        .eq("id", body.plannedMealId)
        .single()
        .execute()
    )
    if not pm_res.data:
        raise HTTPException(404, detail="Planned meal not found")
    planned_meal = pm_res.data
    plan = planned_meal["meal_plans"]

    # Verify caller is a household member
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

    # Load other meal titles to avoid duplicates
    existing_meals = (
        client.from_("planned_meals")
        .select("recipes!planned_meals_recipe_id_fkey(title)")
        .eq("plan_id", plan["id"])
        .neq("id", body.plannedMealId)
        .execute()
    )
    existing_titles = [
        m["recipes"]["title"]
        for m in (existing_meals.data or [])
        if m.get("recipes") and m["recipes"].get("title")
    ]

    # Load household member preferences
    members_res = (
        client.from_("household_members")
        .select("user_id")
        .eq("household_id", plan["household_id"])
        .execute()
    )
    member_ids = [m["user_id"] for m in (members_res.data or [])] or [user_id]

    prefs_res = (
        client.from_("user_preferences")
        .select("*")
        .in_("user_id", member_ids)
        .execute()
    )
    prefs = merge_preferences(prefs_res.data) if prefs_res.data else {}

    current_title = (planned_meal.get("recipes") or {}).get("title", "current meal")
    day_name = DAY_NAMES[planned_meal["day_of_week"]] if planned_meal["day_of_week"] < 7 else str(planned_meal["day_of_week"])

    user_prompt = f"""
Generate a single meal replacement for the following slot:
- Day: {day_name}
- Slot: {planned_meal["meal_slot"]}
- Current meal (to replace): "{current_title}"
- Meals already in this week's plan (do NOT repeat these): {existing_titles}

User preferences:
{prefs}

Current month: {date.fromisoformat(plan["week_start"]).strftime("%B")}

Respond ONLY with a valid JSON object conforming to this exact structure:
{{
  "recipe": {{ ...RecipeObject }},
  "alternativeRecipe": {{ ...RecipeObject }}
}}
""".strip()

    raw = call_deepseek_json(
        system_prompt=PLAN_GENERATION_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=4096,
        request_label="regenerate-meal",
    )

    try:
        validated = SingleMealResponse.model_validate(raw)
    except ValidationError as exc:
        raise HTTPException(502, detail="AI response validation failed") from exc

    primary_id = upsert_recipe(client, user_id, validated.recipe)
    alt_id = upsert_recipe(client, user_id, validated.alternativeRecipe)

    update_res = (
        client.from_("planned_meals")
        .update(
            {
                "recipe_id": primary_id,
                "alternative_recipe_id": alt_id,
                "chosen_recipe_id": None,
                "status": "recommended",
            }
        )
        .eq("id", body.plannedMealId)
        .execute()
    )
    if update_res.data is None:
        raise HTTPException(500, detail="Failed to update planned meal")

    return {"success": True}
