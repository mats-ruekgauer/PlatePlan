"""Port of supabase/functions/_shared/deepseek.ts"""

import re
import time
import json
import logging

import httpx
from fastapi import HTTPException

from ..config import settings

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

logger = logging.getLogger(__name__)


def call_deepseek_json(
    *,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    max_attempts: int = 3,
    request_label: str = "deepseek",
) -> object:
    """Call the DeepSeek chat API and return a parsed JSON object.

    Retries with exponential backoff on failure. Strips markdown fences from
    the response before parsing.
    """
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = httpx.post(
                DEEPSEEK_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
                timeout=120.0,
            )

            if not response.is_success:
                raise RuntimeError(
                    f"DeepSeek API error ({response.status_code}): {response.text}"
                )

            data = response.json()
            raw_content: str | None = (
                data.get("choices", [{}])[0].get("message", {}).get("content")
            )
            if not raw_content or not raw_content.strip():
                raise RuntimeError("DeepSeek returned empty content")

            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_content, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()

            return json.loads(cleaned)

        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("[%s] attempt %d failed: %s", request_label, attempt, exc)
            if attempt < max_attempts:
                time.sleep(0.5 * (2 ** (attempt - 1)))

    raise HTTPException(
        status_code=503,
        detail=f"DeepSeek request failed after {max_attempts} attempts: {last_error}",
    )
