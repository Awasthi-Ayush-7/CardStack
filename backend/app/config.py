"""
Application configuration from environment variables.
Single place for env handling and deployment config.
"""
import os


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


settings = Settings()
