"""Port of create-household, join-household, and create-invite edge functions."""

import hashlib
import os
import base64
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_user, get_service_client
from ..models.household import (
    CreateHouseholdRequest,
    JoinHouseholdRequest,
    CreateInviteRequest,
    UpdateHouseholdRequest,
)
from ..config import settings
from ..services.db import maybe_single_data

router = APIRouter()


# ─── Token helpers ────────────────────────────────────────────────────────────


def _generate_invite_token() -> tuple[str, str]:
    """Return a (token, sha256_hex_hash) pair. Token is URL-safe base64."""
    raw = os.urandom(32)
    token = base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _serialize_household(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "createdBy": row["created_by"],
        "managedMealSlots": row.get("managed_meal_slots") or [],
        "shoppingDays": row.get("shopping_days") or [],
        "batchCookDays": row.get("batch_cook_days") or 1,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _serialize_member(row: dict) -> dict:
    profile = row.get("profiles") or {}
    return {
        "id": row["id"],
        "householdId": row["household_id"],
        "userId": row["user_id"],
        "displayName": profile.get("display_name"),
        "role": row["role"],
        "status": row.get("status") or "active",
        "joinedAt": row["joined_at"],
    }


def _attach_profiles_to_members(client, members: list[dict]) -> list[dict]:
    user_ids = [row["user_id"] for row in members if row.get("user_id")]
    if not user_ids:
        return members

    profiles_res = (
        client.from_("profiles")
        .select("id, display_name")
        .in_("id", user_ids)
        .execute()
    )
    profiles_by_id = {row["id"]: row for row in (profiles_res.data or [])}

    hydrated: list[dict] = []
    for row in members:
        profile = profiles_by_id.get(row["user_id"])
        hydrated.append({**row, "profiles": profile})
    return hydrated


# ─── Routes ──────────────────────────────────────────────────────────────────


@router.post("")
def create_household(
    body: CreateHouseholdRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Create a new household, add caller as owner, return default invite link."""
    if not body.name.strip():
        raise HTTPException(400, detail="name is required")

    client = get_service_client()

    # Create household
    hh_res = (
        client.from_("households")
        .insert(
            {
                "name": body.name.strip(),
                "created_by": user_id,
                "managed_meal_slots": body.managedMealSlots,
                "shopping_days": body.shoppingDays,
                "batch_cook_days": body.batchCookDays,
            }
        )
        .execute()
    )
    if not hh_res.data:
        raise HTTPException(500, detail="Failed to create household")
    household_id = hh_res.data[0]["id"]

    # Add creator as owner
    member_res = (
        client.from_("household_members")
        .insert({"household_id": household_id, "user_id": user_id, "role": "owner"})
        .execute()
    )
    if member_res.data is None:
        raise HTTPException(500, detail="Failed to add owner member")

    # Create default invite token (non-fatal)
    invite_link = f"{settings.APP_SCHEME}://invite/"
    try:
        token, token_hash = _generate_invite_token()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        client.from_("household_invites").insert(
            {
                "household_id": household_id,
                "token_hash": token_hash,
                "created_by": user_id,
                "expires_at": expires_at,
            }
        ).execute()
        invite_link = f"{settings.APP_SCHEME}://invite/{token}"
    except Exception:  # noqa: BLE001
        pass  # non-fatal

    return {"householdId": household_id, "inviteLink": invite_link}


@router.post("/mine")
def list_my_households(
    _body: dict | None = None,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Return all households the current user belongs to."""
    client = get_service_client()

    memberships_res = (
        client.from_("household_members")
        .select("household_id")
        .eq("user_id", user_id)
        .execute()
    )
    memberships = memberships_res.data or []
    household_ids = [m["household_id"] for m in memberships]

    if not household_ids:
        return {"households": []}

    households_res = (
        client.from_("households")
        .select("*")
        .in_("id", household_ids)
        .order("created_at")
        .execute()
    )
    households = households_res.data or []
    return {"households": [_serialize_household(row) for row in households]}


@router.post("/join")
def join_household(
    body: JoinHouseholdRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Validate invite token and add the calling user to the household."""
    client = get_service_client()

    token_hash = _hash_token(body.token)
    invite = maybe_single_data(
        client.from_("household_invites")
        .select("*, households(id, name)")
        .eq("token_hash", token_hash)
        .maybe_single()
        .execute()
    )
    if not invite:
        raise HTTPException(404, detail="Invite not found")

    if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(410, detail="This invite link has expired")

    if invite["usage_limit"] is not None and invite["uses_count"] >= invite["usage_limit"]:
        raise HTTPException(410, detail="This invite link has reached its usage limit")

    household = invite.get("households")
    if not household:
        raise HTTPException(404, detail="Household not found")

    # Idempotent: already a member
    existing = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", household["id"])
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if existing:
        return {"householdId": household["id"], "householdName": household["name"]}

    # Add member
    client.from_("household_members").insert(
        {"household_id": household["id"], "user_id": user_id, "role": "member"}
    ).execute()

    # Increment uses_count
    client.from_("household_invites").update(
        {"uses_count": invite["uses_count"] + 1}
    ).eq("id", invite["id"]).execute()

    return {"householdId": household["id"], "householdName": household["name"]}


@router.post("/{household_id}/members")
def list_household_members(
    household_id: str,
    _body: dict | None = None,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Return all members of a household the caller belongs to."""
    client = get_service_client()

    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", household_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden: not a member of this household")

    members_res = (
        client.from_("household_members")
        .select("*")
        .eq("household_id", household_id)
        .order("joined_at")
        .execute()
    )
    members = _attach_profiles_to_members(client, members_res.data or [])
    return {"members": [_serialize_member(row) for row in members]}


@router.post("/{household_id}/invite")
def create_invite(
    household_id: str,
    body: CreateInviteRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Generate a fresh invite link for a household, invalidating existing ones."""
    client = get_service_client()

    # Verify membership
    membership = maybe_single_data(
        client.from_("household_members")
        .select("role")
        .eq("household_id", household_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden: not a member of this household")

    # Delete existing invites
    client.from_("household_invites").delete().eq("household_id", household_id).execute()

    # Create new invite
    token, token_hash = _generate_invite_token()
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=body.expiryDays)
    ).isoformat()

    insert_res = (
        client.from_("household_invites")
        .insert(
            {
                "household_id": household_id,
                "token_hash": token_hash,
                "created_by": user_id,
                "expires_at": expires_at,
                "usage_limit": body.usageLimit,
            }
        )
        .execute()
    )
    if insert_res.data is None:
        raise HTTPException(500, detail="Failed to create invite")

    invite_link = f"{settings.APP_SCHEME}://invite/{token}"
    return {"inviteLink": invite_link, "expiresAt": expires_at}


@router.post("/{household_id}/update")
def update_household(
    household_id: str,
    body: UpdateHouseholdRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Update household settings. Only owners can edit."""
    client = get_service_client()

    membership = maybe_single_data(
        client.from_("household_members")
        .select("role")
        .eq("household_id", household_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(403, detail="Forbidden: not a member of this household")
    if membership["role"] != "owner":
        raise HTTPException(403, detail="Forbidden: only owners can update a household")

    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.managedMealSlots is not None:
        updates["managed_meal_slots"] = body.managedMealSlots
    if body.shoppingDays is not None:
        updates["shopping_days"] = body.shoppingDays
    if body.batchCookDays is not None:
        updates["batch_cook_days"] = body.batchCookDays

    updated_res = (
        client.from_("households")
        .update(updates)
        .eq("id", household_id)
        .execute()
    )
    if not updated_res.data:
        raise HTTPException(500, detail="Failed to update household")

    return {"household": _serialize_household(updated_res.data[0])}


@router.post("/{household_id}/leave")
def leave_household(
    household_id: str,
    _body: dict | None = None,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Remove the current user from a household."""
    client = get_service_client()

    membership = maybe_single_data(
        client.from_("household_members")
        .select("id")
        .eq("household_id", household_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not membership:
        raise HTTPException(404, detail="Membership not found")

    client.from_("household_members").delete().eq("id", membership["id"]).execute()
    return {"ok": True}
