"""
FraudX AI — Pydantic Schemas for Cooperative Society Members
"""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.member import RiskStatus


class MemberBase(BaseModel):
    member_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: str
    state: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    bank: str
    account_id: str
    account_type: str = "Savings"
    join_date: Optional[date] = None
    verified: bool = True
    share_capital: float = 0.0
    savings_balance: float = 0.0
    loan_outstanding: float = 0.0
    risk_status: RiskStatus = RiskStatus.low


class MemberResponse(MemberBase):
    id: int
    created_at: datetime
    transaction_count: Optional[int] = 0
    total_amount: Optional[float] = 0.0
    fraud_count: Optional[int] = 0

    class Config:
        from_attributes = True


class MemberDetailResponse(MemberResponse):
    recent_transactions: Optional[List[dict]] = []
    active_alerts: Optional[List[dict]] = []


class MemberListResponse(BaseModel):
    items: List[MemberResponse]
    total: int
    page: int
    pages: int
    limit: int
