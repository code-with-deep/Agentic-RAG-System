"""
Auth Router — Registration and Login with JWT tokens.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.database import User, get_db

logger = logging.getLogger("agentic_rag.routers.auth")

router = APIRouter(tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TOKEN_EXPIRY_HOURS = 72


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    token: str
    user: dict


def _create_token(user: User) -> str:
    """Create a signed JWT for the given user."""
    payload = {
        "sub": user.sub,
        "email": user.email,
        "name": user.full_name or "",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _user_dict(user: User) -> dict:
    return {
        "name": user.full_name or "",
        "email": user.email,
        "avatar_initials": (user.full_name or "U")[:2].upper(),
        "joined_date": user.created_at.isoformat() if user.created_at else "",
        "plan": "free",
    }


@router.post("/auth/register")
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account and return a JWT."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    import uuid
    user = User(
        sub=str(uuid.uuid4()),
        email=request.email,
        full_name=request.name,
        password_hash=pwd_context.hash(request.password),
    )
    db.add(user)
    await db.flush()

    token = _create_token(user)
    logger.info("New user registered: %s", request.email)

    return {"token": token, "user": _user_dict(user)}


@router.post("/auth/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = _create_token(user)
    logger.info("User logged in: %s", request.email)

    return {"token": token, "user": _user_dict(user)}
