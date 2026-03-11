"""
User service for email/password authentication.
Uses bcrypt directly (passlib has compatibility issues with newer bcrypt).
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from sqlalchemy.orm import Session
from ..models import User


def _to_bcrypt_input(password: str) -> bytes:
    """
    Pre-hash with SHA-256 so bcrypt never receives > 72 bytes.
    SHA-256 hexdigest is always 64 bytes.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    hashed = bcrypt.hashpw(_to_bcrypt_input(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        _to_bcrypt_input(plain_password),
        hashed_password.encode("utf-8"),
    )


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password: str) -> User:
    """Create a new user with hashed password."""
    user = User(
        email=email.lower().strip(),
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Password reset ---

RESET_TOKEN_EXPIRE_HOURS = 1


def _hash_token(token: str) -> str:
    """Hash a reset token for storage (SHA-256)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_reset_token(db: Session, user: User) -> str:
    """
    Generate a reset token, store its hash and expiry on user.
    Returns the raw token to send in the email link.
    """
    raw_token = secrets.token_urlsafe(32)
    user.password_reset_token_hash = _hash_token(raw_token)
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    db.commit()
    return raw_token


def get_user_by_reset_token(db: Session, token: str) -> Optional[User]:
    """
    Find user by valid reset token. Returns None if invalid or expired.
    """
    token_hash = _hash_token(token)
    user = db.query(User).filter(
        User.password_reset_token_hash == token_hash,
        User.password_reset_expires_at.isnot(None),
    ).first()
    if not user or user.password_reset_expires_at < datetime.utcnow():
        return None
    return user


def clear_reset_token(db: Session, user: User) -> None:
    """Clear reset token and expiry after successful reset."""
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()


def update_password(db: Session, user: User, new_password: str) -> None:
    """Update user password and clear reset token."""
    user.password_hash = hash_password(new_password)
    clear_reset_token(db, user)
    db.refresh(user)
