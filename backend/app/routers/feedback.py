"""Port of process-feedback edge function."""

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_user, get_service_client
from ..models.feedback import FeedbackRequest

router = APIRouter()


@router.post("/feedback")
def process_feedback(
    body: FeedbackRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Record meal feedback and optionally add main ingredients to the blacklist."""
    client = get_service_client()

    insert_res = (
        client.from_("meal_feedback")
        .insert(
            {
                "user_id": user_id,
                "planned_meal_id": body.plannedMealId,
                "recipe_id": body.recipeId,
                "taste_rating": body.tasteRating,
                "portion_rating": body.portionRating,
                "would_repeat": body.wouldRepeat,
                "notes": body.notes,
            }
        )
        .execute()
    )
    if not insert_res.data:
        raise HTTPException(500, detail="Failed to insert feedback")

    if body.wouldRepeat is False:
        _add_ingredients_to_blacklist(client, user_id, body.recipeId)

    return {"feedback": insert_res.data[0]}


def _add_ingredients_to_blacklist(client, user_id: str, recipe_id: str) -> None:
    """Add top 3 main ingredients of a disliked recipe to the user's blacklist."""
    recipe_res = (
        client.from_("recipes")
        .select("ingredients, title")
        .eq("id", recipe_id)
        .single()
        .execute()
    )
    if not recipe_res.data:
        return

    ingredients = recipe_res.data.get("ingredients") or []
    main_ingredients = [
        i["name"].lower().strip()
        for i in sorted(
            [i for i in ingredients if (i.get("category") or "").lower() not in ("spice", "pantry")],
            key=lambda i: i.get("amount", 0),
            reverse=True,
        )[:3]
    ]
    if not main_ingredients:
        return

    prefs_res = (
        client.from_("user_preferences")
        .select("disliked_ingredients")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    existing: list[str] = (prefs_res.data or {}).get("disliked_ingredients") or []
    merged = list(dict.fromkeys(existing + main_ingredients))

    client.from_("user_preferences").update({"disliked_ingredients": merged}).eq(
        "user_id", user_id
    ).execute()
