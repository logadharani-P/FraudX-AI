"""
FraudX AI — Alert Model
A fraud alert is raised when ML analysis flags a transaction as requiring review.

IMPORTANT: A high risk score means the transaction is UNUSUAL and requires human review.
It does NOT automatically mean the transaction is fraud.
Legitimate transactions can generate alerts (false positives).
Alerts must never be deleted — they must be resolved with a reason and audit record.
"""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class AlertStatus(str, enum.Enum):
    open = "Open"
    investigating = "Investigating"
    blocked = "Blocked"
    frozen = "Frozen"
    monitoring = "Monitoring"
    whitelisted = "Whitelisted"
    resolved = "Resolved"       # Determined to be legitimate
    dismissed = "Dismissed"     # Confirmed suspicious / closed


class AlertCategory(str, enum.Enum):
    unusual_amount = "Unusual Amount"
    frequency_anomaly = "Frequency Anomaly"
    location_anomaly = "Location Anomaly"
    device_anomaly = "Device Anomaly"
    rapid_fund_movement = "Rapid Fund Movement"
    suspicious_network_pattern = "Suspicious Network Pattern"
    velocity_anomaly = "Velocity Anomaly"
    new_counterparty = "New Counterparty"
    balance_discrepancy = "Balance Discrepancy"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    # Link to transaction that triggered the alert
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False
    )

    # ML-derived classification
    category: Mapped[AlertCategory] = mapped_column(
        Enum(AlertCategory), nullable=False
    )
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Human-readable explanation (generated from ML evidence, NOT hardcoded)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Lifecycle
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus), default=AlertStatus.open, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    resolution_note: Mapped[str | None] = mapped_column(Text)

    # Relationships
    transaction: Mapped["Transaction"] = relationship(  # type: ignore[name-defined]  # noqa
        "Transaction", back_populates="alert"
    )
    resolver: Mapped["User | None"] = relationship(  # noqa
        "User", foreign_keys=[resolved_by]
    )
    investigations: Mapped[list["Investigation"]] = relationship(  # noqa
        "Investigation", back_populates="alert", cascade="all"
    )

    @property
    def investigation(self) -> "Investigation | None":
        if hasattr(self, "investigations") and self.investigations and len(self.investigations) > 0:
            return self.investigations[-1]
        return None

    def __repr__(self) -> str:
        return f"<Alert {self.alert_id} [{self.status}] risk={self.risk_score:.0f}>"


class RiskScore(Base):
    """Stores individual ML model scoring outputs for auditability."""
    __tablename__ = "risk_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False, index=True
    )
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    factors: Mapped[list | None] = mapped_column(__import__("sqlalchemy").JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    transaction: Mapped["Transaction"] = relationship(  # noqa
        "Transaction", back_populates="risk_scores"
    )
