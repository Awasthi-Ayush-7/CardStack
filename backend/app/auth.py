"""
JWT authentication for email/password auth.
We sign and validate our own tokens. Shared get_current_user_db for protected routes.
"""
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from .config import settings
from .database import get_db
from .models import User
from .services.user_service import get_user_by_id

# Security scheme for JWT tokens (auto_error=False so we can handle missing token ourselves)
security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, email: str) -> str:
    """Create a JWT token for the given user."""
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_jwt_payload(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> int:
    """Extract user ID from JWT token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    payload = get_jwt_payload(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    return int(user_id)


def get_current_user_email(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Optional[str]:
    """Extract user email from JWT token."""
    if not credentials:
        return None
    try:
        payload = get_jwt_payload(credentials.credentials)
        return payload.get("email")
    except Exception:
        return None


def get_current_user_db(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """Shared dependency: get current user from DB (for protected routes)."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user_db)) -> User:
    """Dependency that enforces the current user has the admin role."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
