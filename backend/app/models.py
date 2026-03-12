"""
Database models for credit cards, reward categories, and rules.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Date, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from .database import Base


class CapPeriod(enum.Enum):
    """Enum for reward cap periods."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class UserRole(enum.Enum):
    """Enum for user roles."""
    ADMIN = "admin"
    USER = "user"
    TEST = "test"


class SuggestionStatus(enum.Enum):
    """Enum for card suggestion statuses."""
    PENDING = "pending"
    REVIEWED = "reviewed"
    ADDED = "added"
    DECLINED = "declined"


class User(Base):
    """User model for email/password authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)  # bcrypt hashed password
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    role = Column(String, nullable=False, default="user", server_default="user")
    # Forgot password: token hash and expiry (single-use, clear after reset)
    password_reset_token_hash = Column(String, nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)

    # Relationships
    user_cards = relationship("UserCard", back_populates="user", cascade="all, delete-orphan")
    suggestions = relationship("CardSuggestion", back_populates="user", cascade="all, delete-orphan")


class CardIssuer(Base):
    """Card issuer model (Chase, Amex, Capital One, etc.)."""
    __tablename__ = "card_issuers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    # Relationships
    credit_cards = relationship("CreditCard", back_populates="issuer", cascade="all, delete-orphan")


class CreditCard(Base):
    """Credit card model."""
    __tablename__ = "credit_cards"

    id = Column(Integer, primary_key=True, index=True)
    issuer_id = Column(Integer, ForeignKey("card_issuers.id"), nullable=False)
    name = Column(String, nullable=False)  # No longer unique - same name can exist for different issuers
    network = Column(String, nullable=False)  # Visa, Mastercard, Amex, etc.
    annual_fee = Column(Float, nullable=False, default=0.0, server_default="0.0")

    # Relationships
    issuer = relationship("CardIssuer", back_populates="credit_cards")
    reward_rules = relationship("RewardRule", back_populates="credit_card", cascade="all, delete-orphan")
    user_cards = relationship("UserCard", back_populates="credit_card", cascade="all, delete-orphan")


class RewardCategory(Base):
    """Reward category model (Dining, Travel, Groceries, etc.)."""
    __tablename__ = "reward_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    # Relationships
    reward_rules = relationship("RewardRule", back_populates="category")


class RewardRule(Base):
    """Reward rule model - defines multipliers for card/category combinations."""
    __tablename__ = "reward_rules"

    id = Column(Integer, primary_key=True, index=True)
    credit_card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("reward_categories.id"), nullable=False)
    multiplier = Column(Float, nullable=False)  # e.g., 1.5, 3, 5
    cap_amount = Column(Float, nullable=True)  # Optional spending cap
    cap_period = Column(Enum(CapPeriod), nullable=True)  # monthly, quarterly, yearly, or null
    is_rotating = Column(Boolean, default=False)  # True for rotating category cards
    start_date = Column(Date, nullable=False)  # When rule becomes active
    end_date = Column(Date, nullable=True)  # When rule expires (null = no expiration)
    notes = Column(String, nullable=True)  # Additional context

    # Relationships
    credit_card = relationship("CreditCard", back_populates="reward_rules")
    category = relationship("RewardCategory", back_populates="reward_rules")


class UserCard(Base):
    """User's credit cards - maps users to their credit cards."""
    __tablename__ = "user_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    credit_card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="user_cards")
    credit_card = relationship("CreditCard", back_populates="user_cards")


class CardSuggestion(Base):
    """Card suggestions submitted by users for cards not yet in the system."""
    __tablename__ = "card_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_name = Column(String, nullable=False)
    issuer_name = Column(String, nullable=False)
    network = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending", server_default="pending")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="suggestions")
