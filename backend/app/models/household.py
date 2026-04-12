from pydantic import BaseModel


class CreateHouseholdRequest(BaseModel):
    name: str
    managedMealSlots: list[str] = ["dinner"]
    shoppingDays: list[int] = [1]
    batchCookDays: int = 1


class JoinHouseholdRequest(BaseModel):
    token: str | None = None
    shortCode: str | None = None


class CreateInviteRequest(BaseModel):
    usageLimit: int | None = None
    expiryHours: int = 6


class UpdateHouseholdRequest(BaseModel):
    name: str | None = None
    managedMealSlots: list[str] | None = None
    shoppingDays: list[int] | None = None
    batchCookDays: int | None = None
