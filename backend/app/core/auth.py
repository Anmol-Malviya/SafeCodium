"""Safe Vibe AI — Cryptographic Authentication & RBAC Authorization Engine."""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional, Tuple
from fastapi import Depends, Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.project import Project

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Computes PBKDF2-HMAC-SHA256 password hash (600,000 rounds)."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        600_000,
    )
    return f"pbkdf2_sha256$600000${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Timing-safe verification of PBKDF2 password hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_key = parts[3]
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return secrets.compare_digest(key.hex(), expected_key)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding and padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def create_access_token(user_id: str, username: str, role: str, expires_in_minutes: Optional[int] = None) -> str:
    """Generates a cryptographically signed HMAC-SHA256 JWT access token."""
    expire_minutes = expires_in_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = int(time.time())
    exp = now + (expire_minutes * 60)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "iat": now,
        "exp": exp,
        "iss": "safecodium-auth",
    }

    hdr_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{hdr_b64}.{payload_b64}".encode("utf-8")

    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{hdr_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict:
    """Verifies signature, expiration, and claims of JWT token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")

    hdr_b64, payload_b64, sig_b64 = parts
    signing_input = f"{hdr_b64}.{payload_b64}".encode("utf-8")

    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)

    if not secrets.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token payload")

    # Expiration check
    exp = payload.get("exp", 0)
    if int(time.time()) > exp:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

    return payload


def generate_api_key() -> str:
    """Generates a secure API key."""
    return f"sk_safe_{secrets.token_urlsafe(32)}"


async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validates token or API key to authenticate caller.
    Applies least privilege and server-side authentication.
    """
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials.strip()

    # 1. API Key authentication via header
    api_key_candidate = x_api_key or (token if token and token.startswith("sk_safe_") else None)

    # Check bootstrap / admin master API key if configured
    if settings.ADMIN_API_KEY and api_key_candidate and secrets.compare_digest(api_key_candidate, settings.ADMIN_API_KEY):
        return User(
            id="system-admin-bootstrap",
            username="admin",
            role="admin",
            hashed_password="",
            is_active=True,
        )

    if api_key_candidate:
        user_res = await db.execute(select(User).where(User.api_key == api_key_candidate, User.is_active == True))
        user = user_res.scalar_one_or_none()
        if user:
            return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked API key")

    # 2. JWT Bearer token authentication
    if token:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        user_res = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
        user = user_res.scalar_one_or_none()
        if user:
            return user
        # Allow token payload user if valid signature
        if payload.get("username") and payload.get("role"):
            return User(
                id=payload.get("sub"),
                username=payload.get("username"),
                role=payload.get("role"),
                hashed_password="",
                is_active=True,
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided. Provide 'Authorization: Bearer <token>' or 'X-API-Key'.",
    )


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces administrator role for privileged endpoints."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: administrator privileges required.",
        )
    return current_user


def verify_project_access(project: Project, user: User) -> None:
    """Enforces server-side authorization check to prevent IDOR / cross-user tampering."""
    if user.role == "admin":
        return
    if project.owner_id and project.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have permission to access or modify this project.",
        )
