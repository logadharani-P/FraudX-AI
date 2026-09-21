"""
FraudX AI — SQLAlchemy Database Setup
Provides engine, session factory, and declarative Base.
Supports both PostgreSQL and SQLite (fallback / local testing).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

db_url = settings.database_url
is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(
    db_url,
    echo=False,
    **engine_kwargs
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db():
    """
    FastAPI dependency — yield a database session and ensure it is closed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables() -> None:
    """
    Create all tables whose models have been imported and ensure schema columns exist.
    """
    from sqlalchemy import text
    from app.models import (  # noqa: F401
        alert, audit_log, investigation, member, transaction, user
    )
    Base.metadata.create_all(bind=engine)

    # Auto-migration for SQLite/Postgres to ensure User columns exist without losing data
    with engine.begin() as conn:
        try:
            # Check users table columns
            if is_sqlite:
                cursor = conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = {row[1] for row in cursor.fetchall()}
                new_cols = [
                    ("designation", "VARCHAR(100)"),
                    ("specialization", "VARCHAR(100)"),
                    ("analyst_id", "VARCHAR(50)"),
                    ("clearance_level", "VARCHAR(50)"),
                    ("mfa_secret", "VARCHAR(100)"),
                    ("mfa_enabled", "BOOLEAN DEFAULT 0"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
        except Exception as ex:
            print(f"Table inspection note: {ex}")

