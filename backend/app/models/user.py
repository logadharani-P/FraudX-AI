"""
FraudX AI — User Model
Represents system users: customers who log in, analysts, and organisation admins.
A User is NOT the same as a Member (cooperative society participant).
"""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    analyst = "analyst"
    organisation = "organisation"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    organisation_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Role-specific profile attributes
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    analyst_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    clearance_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Optional link: a customer user may be associated with a Member record.
    member_id: Mapped[Optional[str]] = mapped_column(
        String(20), ForeignKey("members.member_id"), nullable=True
    )

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    member: Mapped[Optional["Member"]] = relationship(  # type: ignore[name-defined]  # noqa
        "Member", back_populates="user", foreign_keys=[member_id]
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"

