import unittest
from unittest.mock import patch

import jwt as pyjwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.config import settings
from app.dependencies import _jwks_cache, get_current_user


class GetCurrentUserTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_secret = settings.SUPABASE_JWT_SECRET
        _jwks_cache.clear()

    def tearDown(self) -> None:
        settings.SUPABASE_JWT_SECRET = self.original_secret
        _jwks_cache.clear()

    def test_decodes_hs256_tokens_with_legacy_secret(self) -> None:
        secret = "test-secret-with-minimum-length-for-hs256"
        settings.SUPABASE_JWT_SECRET = secret
        token = pyjwt.encode({"sub": "user-123"}, secret, algorithm="HS256")

        user_id = get_current_user(f"Bearer {token}")

        self.assertEqual(user_id, "user-123")

    def test_decodes_es256_tokens_via_jwks_public_key(self) -> None:
        private_key = ec.generate_private_key(ec.SECP256R1())
        token = pyjwt.encode(
            {"sub": "user-es256"},
            private_key,
            algorithm="ES256",
            headers={"kid": "kid-1"},
        )

        with patch("app.dependencies._get_public_key", return_value=private_key.public_key()):
            user_id = get_current_user(f"Bearer {token}")

        self.assertEqual(user_id, "user-es256")

    def test_rejects_es256_tokens_without_kid(self) -> None:
        private_key = ec.generate_private_key(ec.SECP256R1())
        token = pyjwt.encode({"sub": "user-es256"}, private_key, algorithm="ES256")

        with self.assertRaises(HTTPException) as ctx:
            get_current_user(f"Bearer {token}")

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Token missing key id")


if __name__ == "__main__":
    unittest.main()
