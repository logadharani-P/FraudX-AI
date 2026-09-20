"""
FraudX AI — Audit Log Model
Stores immutable audit records of all security-critical operations,
investigation status changes, alert resolutions, and user actions.
"""
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # Email, User ID, or 'System'
    actor_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Alert, Investigation, Transaction, User
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # e.g. STATUS_CHANGED, RESOLVED, ASSIGNED, NOTE_ADDED
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.actor} - {self.action} on {self.entity_type}:{self.entity_id}>"
