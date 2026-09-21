"""
FraudX AI — Transaction Model
Stores AMLSim transactions enriched with cooperative-society context.

Source: IBM AMLSim synthetic transaction simulator.
Fields prefixed with comments indicate their origin:
  [AMLSIM]    — comes directly from AMLSim CSV output
  [SYNTHETIC] — synthetic cooperative-society enrichment added by our pipeline
  [ML]        — computed by the Isolation Forest scoring pipeline
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class TransactionStatus(str, enum.Enum):
    completed = "Completed"
    under_review = "Under Review"
    flagged = "Flagged"
    monitoring = "Monitoring"
    blocked = "Blocked"
    frozen = "Frozen"


class RiskLevel(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # FraudX internal stable ID
    transaction_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )

    # ── AMLSim source fields ──────────────────────────────────────────────
    amlsim_step: Mapped[int] = mapped_column(Integer, nullable=False)              # [AMLSIM] simulation step
    amlsim_type: Mapped[str] = mapped_column(String(20), nullable=False)           # [AMLSIM] TRANSFER|CASH_IN|CASH_OUT|DEBIT|PAYMENT
    amount: Mapped[float] = mapped_column(Float, nullable=False)                   # [AMLSIM] transaction amount (INR)
    old_balance_orig: Mapped[float] = mapped_column(Float, default=0.0)            # [AMLSIM] sender balance before
    new_balance_orig: Mapped[float] = mapped_column(Float, default=0.0)            # [AMLSIM] sender balance after
    old_balance_dest: Mapped[float] = mapped_column(Float, default=0.0)            # [AMLSIM] receiver balance before
    new_balance_dest: Mapped[float] = mapped_column(Float, default=0.0)            # [AMLSIM] receiver balance after
    is_fraud_label: Mapped[bool] = mapped_column(Boolean, default=False)           # [AMLSIM] synthetic fraud label
    is_flagged_fraud: Mapped[bool] = mapped_column(Boolean, default=False)         # [AMLSIM] AMLSim rule-based flag

    # ── Participant links ─────────────────────────────────────────────────
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id"), nullable=False)

    # ── Synthetic cooperative-society context ─────────────────────────────
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)      # [SYNTHETIC] UPI|NEFT|RTGS|IMPS|etc.
    device: Mapped[str | None] = mapped_column(String(50))                         # [SYNTHETIC] channel/device
    location_city: Mapped[str | None] = mapped_column(String(100))                 # [SYNTHETIC]
    location_state: Mapped[str | None] = mapped_column(String(100))                # [SYNTHETIC]
    lat: Mapped[float | None] = mapped_column(Float)                               # [SYNTHETIC] city centroid ± jitter
    lng: Mapped[float | None] = mapped_column(Float)                               # [SYNTHETIC]

    # Cooperative-specific purpose fields [SYNTHETIC]
    purpose: Mapped[str | None] = mapped_column(String(100))   # e.g. Loan EMI, Share Purchase, Savings
    loan_ref: Mapped[str | None] = mapped_column(String(30))

    # ── ML-computed fields ────────────────────────────────────────────────
    risk_score: Mapped[float | None] = mapped_column(Float)                        # [ML] 0–100
    risk_level: Mapped[RiskLevel | None] = mapped_column(Enum(RiskLevel))          # [ML]
    anomaly_score: Mapped[float | None] = mapped_column(Float)                     # [ML] raw Isolation Forest score
    anomaly_factors: Mapped[list | None] = mapped_column(JSON)                     # [ML] list of explanatory strings

    # ── Status / Timestamps ───────────────────────────────────────────────
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.completed
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────────
    sender: Mapped["Member"] = relationship(  # type: ignore[name-defined]  # noqa
        "Member", back_populates="sent_transactions", foreign_keys=[sender_id]
    )
    receiver: Mapped["Member"] = relationship(  # noqa
        "Member", back_populates="received_transactions", foreign_keys=[receiver_id]
    )
    alert: Mapped["Alert | None"] = relationship(  # noqa
        "Alert", back_populates="transaction", uselist=False
    )
    risk_scores: Mapped[list["RiskScore"]] = relationship(  # noqa
        "RiskScore", back_populates="transaction"
    )

    def __repr__(self) -> str:
        return f"<Transaction {self.transaction_id} ₹{self.amount:.2f} {self.risk_level}>"
