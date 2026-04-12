"""Automations write endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies import get_current_user, get_service_client
from ..services.db import maybe_single_data

router = APIRouter()


class UpsertAutomationRequest(BaseModel):
    type: str
    enabled: bool
    config: dict


class DeleteAutomationRequest(BaseModel):
    automationId: str


@router.post("/upsert")
def upsert_automation(
    body: UpsertAutomationRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Create or update an automation for the current user (by user_id + type)."""
    client = get_service_client()

    existing = maybe_single_data(
        client.from_("automations")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", body.type)
        .maybe_single()
        .execute()
    )

    if existing:
        client.from_("automations").update(
            {"enabled": body.enabled, "config": body.config}
        ).eq("id", existing["id"]).execute()
        return {"success": True, "action": "updated"}

    client.from_("automations").insert(
        {"user_id": user_id, "type": body.type, "enabled": body.enabled, "config": body.config}
    ).execute()
    return {"success": True, "action": "created"}


@router.post("/delete")
def delete_automation(
    body: DeleteAutomationRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Delete an automation by ID (ownership enforced)."""
    client = get_service_client()

    existing = maybe_single_data(
        client.from_("automations")
        .select("id")
        .eq("id", body.automationId)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing:
        raise HTTPException(404, detail="Automation not found")

    client.from_("automations").delete().eq("id", body.automationId).execute()
    return {"success": True}
