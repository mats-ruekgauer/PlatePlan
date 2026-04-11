import unittest

from postgrest.exceptions import APIError

from app.routers.plan import _is_missing_recipe_source_column


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


if __name__ == "__main__":
    unittest.main()
