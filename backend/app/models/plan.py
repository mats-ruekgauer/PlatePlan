from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class GeneratePlanRequest(BaseModel):
    weekStart: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    householdId: str


class RegenerateMealRequest(BaseModel):
    plannedMealId: str


# ─── DeepSeek response models (validation) ────────────────────────────────────

class Ingredient(BaseModel):
    name: str = Field(min_length=1)
    amount: float = Field(gt=0)
    unit: str = Field(min_length=1)
    category: str | None = None


class Recipe(BaseModel):
    title: str = Field(min_length=1)
    description: str
    ingredients: list[Ingredient] = Field(min_length=1)
    steps: list[str] = Field(min_length=1)
    caloriesPerServing: int = Field(gt=0)
    proteinPerServingG: int = Field(ge=0)
    carbsPerServingG: int = Field(ge=0)
    fatPerServingG: int = Field(ge=0)
    servings: int = Field(gt=0)
    cookTimeMinutes: int = Field(gt=0)
    cuisine: str
    tags: list[str]
    isSeasonal: bool
    season: Literal["spring", "summer", "autumn", "winter", "all"]
    estimatedPriceEur: float = Field(ge=0)

    @field_validator(
        "caloriesPerServing",
        "proteinPerServingG",
        "carbsPerServingG",
        "fatPerServingG",
        "servings",
        "cookTimeMinutes",
        mode="before",
    )
    @classmethod
    def _coerce_integer_fields(cls, value):
        if isinstance(value, bool):
            raise ValueError("must be an integer")
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        if isinstance(value, str):
            try:
                parsed = Decimal(value)
            except InvalidOperation as exc:
                raise ValueError("must be an integer") from exc
            return int(parsed.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        raise ValueError("must be an integer")


class MealSlot(BaseModel):
    slot: Literal["breakfast", "lunch", "dinner", "snack"]
    recipe: Recipe
    alternativeRecipe: Recipe


class Day(BaseModel):
    dayOfWeek: int = Field(ge=0, le=6)
    meals: list[MealSlot] = Field(min_length=1)


class PlanResponse(BaseModel):
    days: list[Day] = Field(min_length=1)


class SingleMealResponse(BaseModel):
    recipe: Recipe
    alternativeRecipe: Recipe
