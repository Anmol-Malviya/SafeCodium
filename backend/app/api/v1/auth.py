"""Safe Vibe AI — Authentication & Identity Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import (
    create_access_token,
    generate_api_key,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.common import ApiResponse

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)
    role: Optional[str] = "analyst"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int
    user_id: str
    username: str
    role: str


class UserProfileResponse(BaseModel):
    id: str
    username: str
    role: str
    api_key: Optional[str]
    is_active: bool


@router.post("/register", response_model=ApiResponse[UserProfileResponse], status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Registers a new user account."""
    existing_res = await db.execute(select(User).where(User.username == req.username.strip()))
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken.",
        )

    role = "admin" if req.role == "admin" else "analyst"
    user = User(
        username=req.username.strip(),
        hashed_password=hash_password(req.password),
        role=role,
        api_key=generate_api_key(),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return ApiResponse(
        success=True,
        message="User successfully registered",
        data=UserProfileResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            api_key=user.api_key,
            is_active=user.is_active,
        ),
    )


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates credentials and returns signed JWT access token."""
    user_res = await db.execute(select(User).where(User.username == req.username.strip()))
    user = user_res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    token = create_access_token(user_id=user.id, username=user.username, role=user.role)
    return ApiResponse(
        success=True,
        message="Authentication successful",
        data=TokenResponse(
            access_token=token,
            token_type="Bearer",
            expires_in_minutes=1440,
            user_id=user.id,
            username=user.username,
            role=user.role,
        ),
    )


@router.get("/me", response_model=ApiResponse[UserProfileResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile for the authenticated caller."""
    return ApiResponse(
        success=True,
        message="User profile retrieved",
        data=UserProfileResponse(
            id=current_user.id,
            username=current_user.username,
            role=current_user.role,
            api_key=current_user.api_key,
            is_active=current_user.is_active,
        ),
    )


@router.post("/api-key", response_model=ApiResponse[dict])
async def refresh_api_key(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generates a new secure API key for the caller."""
    new_key = generate_api_key()
    current_user.api_key = new_key
    await db.commit()
    await db.refresh(current_user)

    return ApiResponse(
        success=True,
        message="New API key generated",
        data={"api_key": new_key},
    )

