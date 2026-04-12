"""Database response helpers."""

from typing import Any


def maybe_single_data(response: Any) -> dict | None:
    """Return the row payload from a maybe_single() response, if present."""
    if response is None:
        return None
    return response.data
