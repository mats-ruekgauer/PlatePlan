import logging
import json
from typing import Any

import httpx
import jwt as pyjwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from jwt.exceptions import InvalidTokenError
from fastapi import Header, HTTPException, status
from supabase import create_client, Client

from .config import settings

logger = logging.getLogger(__name__)

# Module-level JWKS cache: kid -> public key object
_jwks_cache: dict[str, Any] = {}


def _load_jwks() -> None:
    """Fetch Supabase JWKS and populate the cache."""
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
        _jwks_cache.clear()
        for k in keys:
            kid = k.get("kid")
            if not kid:
                continue
            kty = k.get("kty")
            if kty == "EC":
                _jwks_cache[kid] = ECAlgorithm.from_jwk(json.dumps(k))
            elif kty == "RSA":
                _jwks_cache[kid] = RSAAlgorithm.from_jwk(json.dumps(k))
        logger.info("Loaded %d JWKS key(s) from Supabase", len(_jwks_cache))
    except Exception as exc:
        logger.warning("Could not load JWKS: %s", exc)


def _get_public_key(kid: str):
    """Return cached public key for kid, refreshing once if missing."""
    if kid not in _jwks_cache:
        _load_jwks()
    return _jwks_cache.get(kid)


def _decode_hs256(token: str) -> dict[str, Any]:
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="HS256 token received but SUPABASE_JWT_SECRET is not configured",
        )

    return pyjwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )


def _decode_asymmetric(token: str, alg: str, kid: str | None) -> dict[str, Any]:
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing key id",
        )

    public_key = _get_public_key(kid)
    if public_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unknown signing key: {kid}",
        )

    return pyjwt.decode(
        token,
        public_key,
        algorithms=[alg],
        options={"verify_aud": False},
    )


def get_current_user(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    token = authorization.removeprefix("Bearer ")
    try:
        header = pyjwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            payload = _decode_hs256(token)
        elif alg in ("ES256", "RS256"):
            payload = _decode_asymmetric(token, alg, header.get("kid"))
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported token algorithm: {alg}",
            )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim",
            )
        return user_id

    except HTTPException:
        raise
    except InvalidTokenError as exc:
        logger.error("JWT decode failed: %s | header: %s", exc, header if "header" in locals() else None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc


def get_service_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
