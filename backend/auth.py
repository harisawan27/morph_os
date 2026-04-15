"""
Auth helpers — validates next-auth HS256 session JWTs from cookies.

next-auth is configured on the frontend to use HS256 (instead of the default JWE),
so the backend can verify the same token with NEXTAUTH_SECRET.
"""

import os
from fastapi import Cookie, HTTPException
from jose import jwt, JWTError

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")

# Cookie name differs between http (dev) and https (prod)
_DEV_COOKIE  = "next-auth.session-token"
_PROD_COOKIE = "__Secure-next-auth.session-token"


def _decode(token: str) -> dict:
    if not NEXTAUTH_SECRET:
        raise HTTPException(status_code=500, detail="NEXTAUTH_SECRET not configured")
    try:
        return jwt.decode(token, NEXTAUTH_SECRET, algorithms=["HS256"])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid session: {e}")


def get_current_user(
    dev_token:  str | None = Cookie(None, alias=_DEV_COOKIE),
    prod_token: str | None = Cookie(None, alias=_PROD_COOKIE),
) -> dict:
    """Dependency — raises 401 if not authenticated."""
    token = dev_token or prod_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode(token)


def get_optional_user(
    dev_token:  str | None = Cookie(None, alias=_DEV_COOKIE),
    prod_token: str | None = Cookie(None, alias=_PROD_COOKIE),
) -> dict | None:
    """Dependency — returns payload or None (for public endpoints)."""
    token = dev_token or prod_token
    if not token or not NEXTAUTH_SECRET:
        return None
    try:
        return jwt.decode(token, NEXTAUTH_SECRET, algorithms=["HS256"])
    except JWTError:
        return None
