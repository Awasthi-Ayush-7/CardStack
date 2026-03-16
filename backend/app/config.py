"""
Application configuration from environment variables.
Single place for env handling and deployment config.
"""
import os
from pathlib import Path

# Load .env file if present (no-op if file doesn't exist or dotenv not installed)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass


class Settings:
    """Load once, use everywhere."""

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./credit_cards.db")

    # JWT
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    jwt_expire_hours: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

    # Email (for password reset)
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    from_email: str = os.getenv("FROM_EMAIL", "noreply@example.com")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # CORS (comma-separated list of allowed origins)
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")

    # Anthropic API (for Redemption Concierge AI reasoning — paid)
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Google Gemini API (for Redemption Concierge AI reasoning — free tier)
    # Get a free key at https://aistudio.google.com/app/apikey
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # Aviation Stack API (for IATA airport code lookup)
    # Free tier: 500 requests/month — https://aviationstack.com
    aviationstack_api_key: str = os.getenv("AVIATIONSTACK_API_KEY", "")

    # SerpAPI (Google Flights cash price lookup for accurate CPP)
    # Free tier: 250 searches/month — https://serpapi.com
    serpapi_api_key: str = os.getenv("SERPAPI_API_KEY", "")


settings = Settings()
