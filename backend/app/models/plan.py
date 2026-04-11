from typing import Literal
from pydantic import BaseModel, Field


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
    caloriesPerServing: float = Field(gt=0)
    proteinPerServingG: float = Field(ge=0)
    carbsPerServingG: float = Field(ge=0)
    fatPerServingG: float = Field(ge=0)
    servings: int = Field(gt=0)
    cookTimeMinutes: float = Field(gt=0)
    cuisine: str
    tags: list[str]
    isSeasonal: bool
    season: Literal["spring", "summer", "autumn", "winter", "all"]
    estimatedPriceEur: float = Field(ge=0)


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
