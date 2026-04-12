import unittest

from postgrest.exceptions import APIError

from app.models.plan import Recipe
from app.routers.plan import (
    _build_recipe_payload,
    _is_invalid_integer_input,
    _is_missing_recipe_source_column,
)


class PlanRouterTests(unittest.TestCase):
    def test_detects_missing_recipe_source_column_error(self) -> None:
        exc = APIError(
            {
                "message": "column recipes.source does not exist",
                "code": "42703",
                "hint": None,
                "details": None,
            }
        )

        self.assertTrue(_is_missing_recipe_source_column(exc))

    def test_ignores_other_api_errors(self) -> None:
        exc = APIError(
            {
                "message": "permission denied for table recipes",
                "code": "42501",
                "hint": None,
                "details": None,
            }
        )

        self.assertFalse(_is_missing_recipe_source_column(exc))

    def test_detects_unique_constraint_mismatch_for_upsert(self) -> None:
        exc = APIError(
            {
                "message": "there is no unique or exclusion constraint matching the ON CONFLICT specification",
                "code": "42P10",
                "hint": None,
                "details": None,
            }
        )

        self.assertEqual(exc.code, "42P10")

    def test_detects_invalid_integer_insert_error(self) -> None:
        exc = APIError(
            {
                "message": 'invalid input syntax for type integer: "70.0"',
                "code": "22P02",
                "hint": None,
                "details": None,
            }
        )

        self.assertTrue(_is_invalid_integer_input(exc))

    def test_recipe_model_coerces_float_like_numeric_fields_to_ints(self) -> None:
        recipe = Recipe.model_validate(
            {
                "title": "Test Recipe",
                "description": "Simple test recipe",
                "ingredients": [{"name": "Rice", "amount": 200, "unit": "g", "category": "pantry"}],
                "steps": ["Cook the rice"],
                "caloriesPerServing": "450.0",
                "proteinPerServingG": 32.6,
                "carbsPerServingG": "70.4",
                "fatPerServingG": 18.2,
                "servings": "2.0",
                "cookTimeMinutes": 24.6,
                "cuisine": "Test",
                "tags": ["quick"],
                "isSeasonal": False,
                "season": "all",
                "estimatedPriceEur": 2.8,
            }
        )

        payload = _build_recipe_payload("user-1", recipe)

        self.assertEqual(payload["calories_per_serving"], 450)
        self.assertEqual(payload["protein_per_serving_g"], 33)
        self.assertEqual(payload["carbs_per_serving_g"], 70)
        self.assertEqual(payload["fat_per_serving_g"], 18)
        self.assertEqual(payload["servings"], 2)
        self.assertEqual(payload["cook_time_minutes"], 25)
        self.assertEqual(payload["estimated_price_eur"], 2.8)


if __name__ == "__main__":
    unittest.main()
