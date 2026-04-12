import unittest

from app.routers.household import _attach_profiles_to_members


class _FakeExecuteResult:
    def __init__(self, data):
        self.data = data


class _FakeProfilesQuery:
    def __init__(self, data):
        self._data = data

    def select(self, _fields: str):
        return self

    def in_(self, _column: str, _values: list[str]):
        return self

    def execute(self):
        return _FakeExecuteResult(self._data)


class _FakeClient:
    def __init__(self, profiles_data):
        self._profiles_data = profiles_data

    def from_(self, table_name: str):
        if table_name != "profiles":
            raise AssertionError(f"Unexpected table requested: {table_name}")
        return _FakeProfilesQuery(self._profiles_data)


class HouseholdRouterTests(unittest.TestCase):
    def test_attach_profiles_to_members_adds_display_name_payload(self) -> None:
        members = [
            {"id": "m1", "household_id": "h1", "user_id": "u1", "role": "owner", "joined_at": "2026-04-12"},
            {"id": "m2", "household_id": "h1", "user_id": "u2", "role": "member", "joined_at": "2026-04-12"},
        ]
        client = _FakeClient(
            [
                {"id": "u1", "display_name": "Jakob"},
                {"id": "u2", "display_name": "Alex"},
            ]
        )

        result = _attach_profiles_to_members(client, members)

        self.assertEqual(result[0]["profiles"]["display_name"], "Jakob")
        self.assertEqual(result[1]["profiles"]["display_name"], "Alex")

    def test_attach_profiles_to_members_keeps_missing_profiles_as_null(self) -> None:
        members = [
            {"id": "m1", "household_id": "h1", "user_id": "u1", "role": "owner", "joined_at": "2026-04-12"},
            {"id": "m2", "household_id": "h1", "user_id": "u2", "role": "member", "joined_at": "2026-04-12"},
        ]
        client = _FakeClient([{"id": "u1", "display_name": "Jakob"}])

        result = _attach_profiles_to_members(client, members)

        self.assertEqual(result[0]["profiles"]["display_name"], "Jakob")
        self.assertIsNone(result[1]["profiles"])


if __name__ == "__main__":
    unittest.main()
