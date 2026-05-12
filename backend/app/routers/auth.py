"""
Auth Router — Registration and Login with JWT tokens.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.database import User, get_db
from app.models.schemas import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_password_email

logger = logging.getLogger("agentic_rag.routers.auth")

router = APIRouter(tags=["auth"])

# Using pbkdf2_sha256 for maximum compatibility and security on all platforms (Windows/Linux)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

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
        id=str(uuid.uuid4()),
        sub=str(uuid.uuid4()),
        email=request.email,
        full_name=request.name,
        # pbkdf2_sha256 has no length limits and is robust on Windows
        password_hash=pwd_context.hash(request.password),
        created_at=datetime.now(timezone.utc)
    )
    db.add(user)
    await db.commit() # Using commit instead of flush to ensure DB is updated
    await db.refresh(user)

    token = _create_token(user)
    logger.info("New user registered: %s", request.email)

    return {"token": token, "user": _user_dict(user)}


@router.post("/auth/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # No truncation needed for pbkdf2_sha256
    if not user or not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = _create_token(user)
    logger.info("User logged in: %s", request.email)

    return {"token": token, "user": _user_dict(user)}


@router.post("/auth/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Request a password reset link."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found. Please register as a new user."
        )

    # Create a stateless reset token by embedding the current password hash.
    # If the password changes, the hash changes, invalidating this token.
    payload = {
        "sub": user.sub,
        "purpose": "reset_password",
        "hash": user.password_hash[-20:],  # Just need a chunk to verify it hasn't changed
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    # Use the first configured frontend URL or default to localhost
    base_url = settings.allowed_origins[0] if settings.allowed_origins and settings.allowed_origins[0] != "*" else "http://localhost:5173"
    reset_link = f"{base_url}/reset-password?token={token}"

    background_tasks.add_task(send_reset_password_email, user.email, reset_link)
    
    logger.info("Password reset requested for: %s", request.email)
    return {"message": "Reset password link has been sent successfully to your registered email."}


@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset the password using a valid token."""
    try:
        payload = jwt.decode(request.token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "reset_password":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token purpose.")
            
        user_sub = payload.get("sub")
        token_hash = payload.get("hash")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired.")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token.")

    stmt = select(User).where(User.sub == user_sub)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Validate that the password hasn't been changed since the token was issued
    if user.password_hash[-20:] != token_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token has already been used.")

    # Update password
    user.password_hash = pwd_context.hash(request.new_password)
    await db.commit()
    
    logger.info("Password successfully reset for user: %s", user.email)
    return {"message": "Password has been successfully reset."}
