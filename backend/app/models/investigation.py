"""
FraudX AI — Investigation and Investigation Action Models
Tracks analyst cases, findings, actions taken, and case resolutions.
"""
import enum
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvestigationStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class InvestigationOutcome(str, enum.Enum):
    PENDING = "Pending"
    LEGITIMATE = "Legitimate"
    CONFIRMED_FRAUD = "Confirmed Fraud"
    INCONCLUSIVE = "Inconclusive"


class ActionType(str, enum.Enum):
    BLOCKED = "Blocked"
    FROZE = "Froze"
    ESCALATED = "Escalated"
    MONITORED = "Monitored"
    WHITELISTED = "Whitelisted"
    NOTE_ADDED = "NoteAdded"


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    alert_id: Mapped[str] = mapped_column(String(50), ForeignKey("alerts.alert_id"), index=True, nullable=False)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Analyst email/name
    status: Mapped[InvestigationStatus] = mapped_column(
        SQLEnum(InvestigationStatus, name="investigation_status_enum"),
        default=InvestigationStatus.OPEN,
        nullable=False,
    )
    outcome: Mapped[InvestigationOutcome] = mapped_column(
        SQLEnum(InvestigationOutcome, name="investigation_outcome_enum"),
        default=InvestigationOutcome.PENDING,
        nullable=False,
    )
    priority: Mapped[str] = mapped_column(String(20), default="Medium")  # Low, Medium, High, Critical
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    alert = relationship("Alert", back_populates="investigations", foreign_keys=[alert_id])
    actions = relationship("InvestigationAction", back_populates="investigation", cascade="all, delete-orphan")


class InvestigationAction(Base):
    __tablename__ = "investigation_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    investigation_id: Mapped[int] = mapped_column(Integer, ForeignKey("investigations.id"), nullable=False)
    action_type: Mapped[ActionType] = mapped_column(
        SQLEnum(ActionType, name="action_type_enum"),
        nullable=False,
    )
    actor: Mapped[str] = mapped_column(String(100), nullable=False)  # User email or 'System'
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    investigation = relationship("Investigation", back_populates="actions")
