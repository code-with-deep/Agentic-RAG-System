import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select

from app.config import settings
from app.models.database import User, get_db

logger = logging.getLogger("agentic_rag.dependencies")

# OAuth2PasswordBearer is a class that tells FastAPI that we use a Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db = Depends(get_db)
) -> User:
    """
    Verified JWT-based authentication.
    1. Extracts Bearer token from Authorization header.
    2. Verifies signature and expiration.
    3. Load/Upsert user in SQLite based on stable 'sub' claim.
    4. Returns the full User record.
    """
    if not token:
        # Check if we are in development and want to allow a fallback (for testing)
        # But per PR feedback, we should be strict.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token. Use 'Authorization: Bearer <jwt>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # 1. Decode and verify JWT
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        sub: str = payload.get("sub")
        email: Optional[str] = payload.get("email")
        name: Optional[str] = payload.get("name")

        if sub is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing 'sub' claim",
            )
            
    except JWTError as e:
        logger.error("JWT Verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Load/Upsert user in DB
    try:
        stmt = select(User).where(User.sub == sub)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # First time this user is seen, create them
            logger.info("Creating new user record for sub: %s", sub)
            user = User(
                sub=sub,
                email=email,
                full_name=name
            )
            db.add(user)
            await db.flush() # Ensure ID is generated
            
        return user

    except Exception as e:
        logger.error("User sync failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error during user synchronization",
        )
