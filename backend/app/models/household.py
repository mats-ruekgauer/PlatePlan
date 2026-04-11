from pydantic import BaseModel


class CreateHouseholdRequest(BaseModel):
    name: str
    managedMealSlots: list[str] = ["dinner"]
    shoppingDays: list[int] = [1]
    batchCookDays: int = 1


class JoinHouseholdRequest(BaseModel):
    token: str


class CreateInviteRequest(BaseModel):
    usageLimit: int | None = None
    expiryDays: int = 7
