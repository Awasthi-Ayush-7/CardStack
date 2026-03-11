"""
Database seeding — delegates to card_sync_service which reads card_data.json.
To update card data, edit backend/card_data.json and restart the server
(or call POST /admin/sync-cards).
"""
from sqlalchemy import text, inspect
from .database import SessionLocal, engine, Base
from .services.card_sync_service import sync_from_file


def _run_migrations():
    """Apply lightweight schema migrations for SQLite (no Alembic)."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        # Add 'role' column to users if it doesn't exist
        if "users" in inspector.get_table_names():
            existing_cols = [c["name"] for c in inspector.get_columns("users")]
            if "role" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"))
                conn.commit()
                print("Migration: added 'role' column to users table")


def seed_database():
    """Sync card data from card_data.json into the database on startup."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    db = SessionLocal()
    try:
        result = sync_from_file(db)
        print(
            f"Card sync complete: {result['issuers']} issuers, "
            f"{result['cards']} cards, {result['rules']} rules"
        )
    except Exception as e:
        db.rollback()
        print(f"Card sync error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
