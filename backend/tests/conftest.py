"""
Test configuration and fixtures.

Sets DATABASE_URL to a separate test SQLite file before importing any app
modules, so the test database is fully isolated from development data.
"""
import os
import pytest

# Override settings before any app module is imported
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_credit_cards.db")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")

from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import CardIssuer, CreditCard, RewardCategory, RewardRule, User
from app.services.user_service import hash_password
from app.auth import create_access_token

TEST_DATABASE_URL = "sqlite:///./test_credit_cards.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create tables once for the test session, drop them at the end."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Remove test DB file
    if os.path.exists("./test_credit_cards.db"):
        os.remove("./test_credit_cards.db")


@pytest.fixture()
def db():
    """Yield a fresh database session, rolling back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """FastAPI TestClient with the test DB injected."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed helpers — return model instances added to the test session
# ---------------------------------------------------------------------------

@pytest.fixture()
def seed_cards(db):
    """Seed minimal card catalog for tests: 2 issuers, 3 cards, 4 categories, rules."""
    # Issuers
    chase = CardIssuer(name="Chase")
    amex = CardIssuer(name="American Express")
    db.add_all([chase, amex])
    db.flush()

    # Cards
    freedom = CreditCard(issuer_id=chase.id, name="Freedom Unlimited", network="Visa", annual_fee=0.0)
    sapphire = CreditCard(issuer_id=chase.id, name="Sapphire Preferred", network="Visa", annual_fee=95.0)
    gold = CreditCard(issuer_id=amex.id, name="Gold", network="American Express", annual_fee=325.0)
    db.add_all([freedom, sapphire, gold])
    db.flush()

    # Categories
    dining = RewardCategory(name="Dining")
    travel = RewardCategory(name="Travel")
    groceries = RewardCategory(name="Groceries")
    general = RewardCategory(name="General")
    db.add_all([dining, travel, groceries, general])
    db.flush()

    # Reward rules
    rules = [
        RewardRule(credit_card_id=freedom.id, category_id=general.id,  multiplier=1.5, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=freedom.id, category_id=dining.id,   multiplier=3.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=sapphire.id, category_id=dining.id,  multiplier=3.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=sapphire.id, category_id=travel.id,  multiplier=5.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=sapphire.id, category_id=general.id, multiplier=1.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=gold.id,     category_id=dining.id,  multiplier=4.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=gold.id,     category_id=groceries.id, multiplier=4.0, start_date=date(2024, 1, 1)),
        RewardRule(credit_card_id=gold.id,     category_id=general.id, multiplier=1.0, start_date=date(2024, 1, 1)),
    ]
    db.add_all(rules)
    db.flush()

    return {
        "issuers": {"chase": chase, "amex": amex},
        "cards": {"freedom": freedom, "sapphire": sapphire, "gold": gold},
        "categories": {"dining": dining, "travel": travel, "groceries": groceries, "general": general},
    }


@pytest.fixture()
def regular_user(db):
    """Create a regular user in the test DB."""
    user = User(
        email="user@test.com",
        password_hash=hash_password("password123"),
        role="user",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def admin_user(db):
    """Create an admin user in the test DB."""
    user = User(
        email="admin@test.com",
        password_hash=hash_password("adminpass123"),
        role="admin",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def user_token(regular_user):
    """JWT token for the regular user."""
    return create_access_token(regular_user.id, regular_user.email)


@pytest.fixture()
def admin_token(admin_user):
    """JWT token for the admin user."""
    return create_access_token(admin_user.id, admin_user.email)
