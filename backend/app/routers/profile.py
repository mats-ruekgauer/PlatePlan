"""Profile and user-preferences write endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies import get_current_user, get_service_client
from ..services.db import maybe_single_data

router = APIRouter()


class UpdateDisplayNameRequest(BaseModel):
    displayName: str


class UpdatePreferencesRequest(BaseModel):
    calorieTarget: int | None = None
    proteinTargetG: int | None = None
    weightKg: float | None = None
    heightCm: float | None = None
    age: int | None = None
    dietaryRestrictions: list[str] | None = None
    dislikedIngredients: list[str] | None = None
    likedCuisines: list[str] | None = None
    unmanagedSlotCalories: dict[str, float] | None = None
    maxCookTimeMinutes: int | None = None
    pantryStaples: list[str] | None = None
    preferredLanguage: str | None = None


@router.post("/update-display-name")
def update_display_name(
    body: UpdateDisplayNameRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Update the display name for the current user's profile."""
    client = get_service_client()

    res = (
        client.from_("profiles")
        .update({"display_name": body.displayName})
        .eq("id", user_id)
        .execute()
    )
    if res.data is None:
        raise HTTPException(500, detail="Failed to update display name")
    return {"success": True}


@router.post("/update-preferences")
def update_preferences(
    body: UpdatePreferencesRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Partially update user preferences for the current user."""
    client = get_service_client()

    db_updates: dict = {}
    if body.calorieTarget is not None:
        db_updates["calorie_target"] = body.calorieTarget
    if body.proteinTargetG is not None:
        db_updates["protein_target_g"] = body.proteinTargetG
    if body.weightKg is not None:
        db_updates["weight_kg"] = body.weightKg
    if body.heightCm is not None:
        db_updates["height_cm"] = body.heightCm
    if body.age is not None:
        db_updates["age"] = body.age
    if body.dietaryRestrictions is not None:
        db_updates["dietary_restrictions"] = body.dietaryRestrictions
    if body.dislikedIngredients is not None:
        db_updates["disliked_ingredients"] = body.dislikedIngredients
    if body.likedCuisines is not None:
        db_updates["liked_cuisines"] = body.likedCuisines
    if body.unmanagedSlotCalories is not None:
        db_updates["unmanaged_slot_calories"] = body.unmanagedSlotCalories
    if body.maxCookTimeMinutes is not None:
        db_updates["max_cook_time_minutes"] = body.maxCookTimeMinutes
    if body.pantryStaples is not None:
        db_updates["pantry_staples"] = body.pantryStaples
    if body.preferredLanguage is not None:
        db_updates["preferred_language"] = body.preferredLanguage

    if not db_updates:
        return {"success": True}

    existing = maybe_single_data(
        client.from_("user_preferences")
        .select("id")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if existing:
        client.from_("user_preferences").update(db_updates).eq("user_id", user_id).execute()
    else:
        client.from_("user_preferences").insert({"user_id": user_id, **db_updates}).execute()

    return {"success": True}
