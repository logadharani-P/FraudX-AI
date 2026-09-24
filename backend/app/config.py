"""
FraudX AI — Application Configuration
Reads from .env via pydantic-settings.
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────
    database_url: str = "postgresql://fraudx_user:password@localhost:5432/fraudx_db"

    # ── JWT ───────────────────────────────────────────────
    jwt_secret_key: str = "CHANGE_THIS_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # ── CORS ──────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── LLM (Optional) ────────────────────────────────────
    google_api_key: str | None = None
    openai_api_key: str | None = None

    @property
    def llm_enabled(self) -> bool:
        return bool(self.google_api_key or self.openai_api_key)

    # ── ML ────────────────────────────────────────────────
    ml_contamination: float = 0.05
    alert_threshold: float = 55.0
    model_dir: str = "data/models"

    # ── Email Delivery (Verification Codes / MFA) ─────────
    email_provider: str = "auto"  # "smtp", "resend", "sendgrid", "brevo", or "auto"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "security@fraudx.ai"
    smtp_from_name: str = "FraudX AI Security"
    resend_api_key: str | None = None
    sendgrid_api_key: str | None = None
    brevo_api_key: str | None = None

    # ── App ───────────────────────────────────────────────
    app_env: str = "development"
    app_version: str = "1.0.0"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
