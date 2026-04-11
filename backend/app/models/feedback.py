from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    recipeId: str
    plannedMealId: str | None = None
    tasteRating: int | None = Field(default=None, ge=1, le=5)
    portionRating: int | None = Field(default=None, ge=1, le=5)
    wouldRepeat: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)
