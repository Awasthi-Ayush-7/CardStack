"""
Authentication routes - register, login, forgot/reset password.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user_id, create_access_token
from ..models import User
from ..schemas import (
    User as UserSchema,
    UserRegister,
    UserLogin,
    TokenResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
)
from ..services.user_service import (
    get_user_by_id,
    get_user_by_email,
    create_user,
    verify_password,
    create_reset_token,
    get_user_by_reset_token,
    update_password,
)
from ..services.email_service import send_password_reset_email, FRONTEND_URL

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    """Normalize email for consistent lookup (matches create_user)."""
    return email.lower().strip()


@router.post("/register", response_model=UserSchema, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    """
    # Check if email already exists
    existing = get_user_by_email(db, _normalize_email(data.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = create_user(db, _normalize_email(data.email), data.password)
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password. Returns JWT access token.
    """
    # Find user (normalize email to match how it was stored)
    user = get_user_by_email(db, _normalize_email(data.email))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create and return token
    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset. Always returns same message (no user enumeration).
    """
    user = get_user_by_email(db, _normalize_email(data.email))
    if user:
        raw_token = create_reset_token(db, user)
        reset_link = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
        send_password_reset_email(user.email, reset_link)
    return ForgotPasswordResponse()


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using token from email. Token is single-use.
    """
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = get_user_by_reset_token(db, data.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    update_password(db, user, data.new_password)
    return {"message": "Password updated. Please log in."}


@router.get("/me", response_model=UserSchema)
def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Get current authenticated user profile.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
