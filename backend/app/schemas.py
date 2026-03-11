"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# User Schemas
class UserBase(BaseModel):
    email: str


class User(UserBase):
    id: int
    created_at: datetime
    role: str = "user"

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    message: str = "If an account exists, we sent instructions to reset your password."


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# Card Issuer Schemas
class CardIssuerBase(BaseModel):
    name: str


class CardIssuer(CardIssuerBase):
    id: int

    class Config:
        from_attributes = True


# Credit Card Schemas
class CreditCardBase(BaseModel):
    name: str
    network: str


class CreditCardCreate(CreditCardBase):
    issuer_id: int


class CreditCard(CreditCardBase):
    id: int
    issuer_id: int
    issuer: Optional[CardIssuer] = None

    class Config:
        from_attributes = True


# Reward Category Schemas
class RewardCategoryBase(BaseModel):
    name: str


class RewardCategory(RewardCategoryBase):
    id: int

    class Config:
        from_attributes = True


# Reward Rule Schemas
class RewardRuleBase(BaseModel):
    credit_card_id: int
    category_id: int
    multiplier: float
    cap_amount: Optional[float] = None
    cap_period: Optional[str] = None  # "monthly", "quarterly", "yearly", or null
    is_rotating: bool = False
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class RewardRule(RewardRuleBase):
    id: int

    class Config:
        from_attributes = True


# User Card Schemas
class UserCardBase(BaseModel):
    credit_card_id: int


class UserCardCreate(UserCardBase):
    pass


class UserCard(UserCardBase):
    id: int
    user_id: int
    credit_card: CreditCard

    class Config:
        from_attributes = True


# Recommendation Schemas
class RecommendationItem(BaseModel):
    card: str
    multiplier: float
    explanation: str
    card_id: int
    is_general_fallback: bool = False  # True when showing General rate (no specific rule for category)


class BestOverallItem(BaseModel):
    card: str
    issuer: str
    multiplier: float
    explanation: str
    card_id: int
    user_owns: bool  # True if the user already has this card in their collection


class RecommendationResponse(BaseModel):
    category: str
    recommendations: List[RecommendationItem]
    best_overall: Optional[BestOverallItem] = None  # Best card in catalog for this category


# Card Suggestion Schemas
class CardSuggestionCreate(BaseModel):
    card_name: str
    issuer_name: str
    network: Optional[str] = None
    notes: Optional[str] = None


class CardSuggestion(BaseModel):
    id: int
    user_id: int
    card_name: str
    issuer_name: str
    network: Optional[str] = None
    notes: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None  # Populated for admin view

    class Config:
        from_attributes = True


class CardSuggestionStatusUpdate(BaseModel):
    status: str  # pending, reviewed, added, declined
    admin_notes: Optional[str] = None


# Admin User View Schema
class AdminUser(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
