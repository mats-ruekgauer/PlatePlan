"""User favorites write endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies import get_current_user, get_service_client
from ..services.db import maybe_single_data

router = APIRouter()


class ToggleFavoriteRequest(BaseModel):
    recipeId: str


class AddCustomFavoriteRequest(BaseModel):
    customName: str
    notes: str | None = None


class RemoveFavoriteRequest(BaseModel):
    favoriteId: str


@router.post("/toggle")
def toggle_favorite(
    body: ToggleFavoriteRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Add or remove a recipe from favorites (idempotent toggle)."""
    client = get_service_client()

    existing = maybe_single_data(
        client.from_("user_favorites")
        .select("id")
        .eq("user_id", user_id)
        .eq("recipe_id", body.recipeId)
        .maybe_single()
        .execute()
    )

    if existing:
        client.from_("user_favorites").delete().eq("id", existing["id"]).execute()
        return {"action": "removed"}

    client.from_("user_favorites").insert(
        {"user_id": user_id, "recipe_id": body.recipeId}
    ).execute()
    return {"action": "added"}


@router.post("/add-custom")
def add_custom_favorite(
    body: AddCustomFavoriteRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Add a custom (non-recipe) favorite by name."""
    client = get_service_client()

    client.from_("user_favorites").insert(
        {"user_id": user_id, "custom_name": body.customName, "notes": body.notes}
    ).execute()
    return {"success": True}


@router.post("/remove")
def remove_favorite(
    body: RemoveFavoriteRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Remove a favorite by its ID."""
    client = get_service_client()

    # Verify ownership before deleting
    existing = maybe_single_data(
        client.from_("user_favorites")
        .select("id")
        .eq("id", body.favoriteId)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing:
        raise HTTPException(404, detail="Favorite not found")

    client.from_("user_favorites").delete().eq("id", body.favoriteId).execute()
    return {"success": True}
