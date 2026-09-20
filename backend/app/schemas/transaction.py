"""
FraudX AI — Pydantic Schemas for Transactions
Provides complete real transaction fields, persistent geographic coordinates,
sender/receiver metadata, and evidence-backed anomaly explanations.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.transaction import RiskLevel, TransactionStatus


class MemberSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    member_id: str
    name: str
    city: str
    state: str
    bank: str
    account_id: str


class TransactionBase(BaseModel):
    transaction_id: str
    amount: float
    transaction_type: str
    device: Optional[str] = None
    channel: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    purpose: Optional[str] = None
    loan_ref: Optional[str] = None
    status: TransactionStatus = TransactionStatus.completed
    timestamp: datetime


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    member_id: Optional[str] = None
    sender_member_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_account_id: Optional[str] = None
    sender_bank: Optional[str] = None
    sender_city: Optional[str] = None
    receiver_member_id: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_account_id: Optional[str] = None
    receiver_bank: Optional[str] = None
    receiver_city: Optional[str] = None
    sender: Optional[MemberSummary] = None
    receiver: Optional[MemberSummary] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    anomaly_score: Optional[float] = None
    anomaly_factors: Optional[List[str]] = None
    detection_reason: Optional[str] = None
    is_fraud_label: bool = False
    is_flagged_fraud: bool = False
    amount_formatted: Optional[str] = None
    date_formatted: Optional[str] = None
    time_formatted: Optional[str] = None
    created_at: Optional[datetime] = None


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    pages: int
    limit: int


class MapPointResponse(BaseModel):
    id: int
    transaction_id: str
    lat: float
    lng: float
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    amount: float
    location_city: Optional[str] = None
    sender_name: Optional[str] = None
