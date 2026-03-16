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
    annual_fee: float = 0.0
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
    annual_fee: float = 0.0
    is_general_fallback: bool = False  # True when showing General rate (no specific rule for category)


class BestOverallItem(BaseModel):
    card: str
    issuer: str
    multiplier: float
    explanation: str
    card_id: int
    annual_fee: float = 0.0
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


# Portfolio Optimizer Schemas
class SpendingEntry(BaseModel):
    category: str
    monthly_amount: float


class SpendingProfile(BaseModel):
    spending: List[SpendingEntry]


class PortfolioCategoryResult(BaseModel):
    category: str
    monthly_amount: float
    best_card: Optional[str] = None       # best card name from user's wallet (None if no cards)
    multiplier: float = 0.0
    annual_rewards: float = 0.0           # multiplier * monthly_amount * 12
    annual_fee: float = 0.0
    net_annual_value: float = 0.0         # annual_rewards - prorated annual_fee


class SuggestedCard(BaseModel):
    card_name: str
    issuer: str
    annual_fee: float
    improvement: float                    # additional net annual value vs. current best


class PortfolioResponse(BaseModel):
    per_category: List[PortfolioCategoryResult]
    total_estimated_rewards: float        # sum of annual_rewards across categories
    total_net_value: float                # after each card's fee counted once
    suggested_additions: List[SuggestedCard]  # top 3 catalog cards not in wallet


# Admin User View Schema
class AdminUser(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Redemption Concierge Schemas
# ---------------------------------------------------------------------------

class ConciergeSearchRequest(BaseModel):
    origin: str = "New York"               # departure city, e.g. "Los Angeles"
    destination: str
    travel_month: str                       # e.g. "October 2026"
    cabin: str = "economy"                  # "economy" | "business" | "first"
    point_balances: dict[int, int] = {}     # {user_card_id: balance}


class TransferPath(BaseModel):
    source_currency: str
    partner_program: str
    destination: str
    cabin: str
    points_required: int
    effective_points_needed: int
    user_balance: int
    points_available_after_transfer: int
    can_afford: bool
    cash_price_usd: int
    taxes_fees_usd: int
    cpp: float
    is_great_deal: bool
    transfer_ratio: float
    bonus_ratio: Optional[float] = None
    bonus_expires: Optional[str] = None
    portal_url: Optional[str] = None
    award_search_url: Optional[str] = None
    award_notes: Optional[str] = None
    is_estimated: bool = False
    live_cash_price: Optional[float] = None


class BookingInstructionCard(BaseModel):
    source_currency: str
    partner_program: str
    cabin: str
    cpp: float
    is_great_deal: bool
    can_afford: bool
    steps: List[str]
    portal_url: Optional[str] = None


class ConciergeSearchResponse(BaseModel):
    destination: str
    travel_month: str
    cabin: str
    paths: List[TransferPath]
    booking_cards: List[BookingInstructionCard]
    claude_analysis: str
    best_path: Optional[TransferPath] = None


class TransferPartnerOut(BaseModel):
    id: int
    source_currency: str
    partner_program: str
    transfer_ratio: float
    bonus_ratio: Optional[float] = None
    bonus_expires: Optional[date] = None
    is_active: bool
    portal_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserCardBalanceUpdate(BaseModel):
    point_balance: Optional[int] = None


class UserCardWithBalance(BaseModel):
    id: int
    user_id: int
    credit_card_id: int
    credit_card: CreditCard
    point_balance: Optional[int] = None

    class Config:
        from_attributes = True
