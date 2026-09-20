"""
FraudX AI — Member Model
Represents a cooperative society member whose transactions are monitored.
Uses a single stable string identifier: MBR-XXXXXX.

SYNTHETIC ENRICHMENT NOTE:
Fields marked [SYNTHETIC] below are generated values that do not come from
real banking data. They are added to provide cooperative-society context for
the demo system and are clearly identified as synthetic.
"""
import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class RiskStatus(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Stable cooperative-society identifier (MBR-XXXXXX)
    member_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    # AMLSim account identifier (C1234567890 / M1234567890)
    amlsim_account_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20))

    # Location — city mapped from account ID, GPS from city centroid  [SYNTHETIC]
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)

    # Financial institution [SYNTHETIC]
    bank: Mapped[str] = mapped_column(String(100), nullable=False)
    account_id: Mapped[str] = mapped_column(String(30), nullable=False)
    account_type: Mapped[str] = mapped_column(String(30), default="Savings")

    # Cooperative membership [SYNTHETIC]
    join_date: Mapped[date | None] = mapped_column(Date)
    verified: Mapped[bool] = mapped_column(Boolean, default=True)
    share_capital: Mapped[float] = mapped_column(Float, default=0.0)       # [SYNTHETIC]
    savings_balance: Mapped[float] = mapped_column(Float, default=0.0)    # [SYNTHETIC]
    loan_outstanding: Mapped[float] = mapped_column(Float, default=0.0)   # [SYNTHETIC]

    # ML-derived risk status (updated by scoring pipeline)
    risk_status: Mapped[RiskStatus] = mapped_column(
        Enum(RiskStatus), default=RiskStatus.low
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa
        "User", back_populates="member", foreign_keys="User.member_id"
    )
    sent_transactions: Mapped[list["Transaction"]] = relationship(  # noqa
        "Transaction", back_populates="sender", foreign_keys="Transaction.sender_id"
    )
    received_transactions: Mapped[list["Transaction"]] = relationship(  # noqa
        "Transaction", back_populates="receiver", foreign_keys="Transaction.receiver_id"
    )

    def __repr__(self) -> str:
        return f"<Member {self.member_id} ({self.name})>"
