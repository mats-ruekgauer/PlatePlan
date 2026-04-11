from pydantic import BaseModel


class GenerateShoppingListRequest(BaseModel):
    planId: str
