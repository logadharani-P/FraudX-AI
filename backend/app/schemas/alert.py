"""
FraudX AI — Pydantic Schemas for Alerts and Risk Treatments
Provides comprehensive alert details, detected anomalies, behavioral indicators,
investigation summaries, and persistent risk treatment action models.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.alert import AlertCategory, AlertStatus


class InvestigationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    status: str
    outcome: str
    priority: str
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class TreatmentActionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_type: str
    actor: str
    notes: Optional[str] = None
    created_at: datetime


class AlertBase(BaseModel):
    alert_id: str
    transaction_id: int
    category: AlertCategory
    risk_level: str
    risk_score: float
    reason: str
    description: Optional[str] = None
    status: AlertStatus = AlertStatus.open


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    resolution_note: Optional[str] = None
    action: Optional[str] = None
    notes: Optional[str] = None


class AlertTreatmentRequest(BaseModel):
    action: str  # Block Transaction | Freeze Account | Enhanced Monitoring | Whitelist | Escalate
    notes: Optional[str] = None
    reason: Optional[str] = None


class AlertResponse(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolved_by_name: Optional[str] = None
    resolution_note: Optional[str] = None

    # Transaction summary & identifiers
    transaction_ref_id: Optional[str] = None
    transaction_db_id: Optional[int] = None
    amount: Optional[float] = None
    amount_formatted: Optional[str] = None
    transaction_type: Optional[str] = None
    channel: Optional[str] = None
    device: Optional[str] = None
    purpose: Optional[str] = None
    loan_ref: Optional[str] = None
    timestamp: Optional[datetime] = None
    date_formatted: Optional[str] = None
    time_formatted: Optional[str] = None

    # Participant identities
    sender_id: Optional[int] = None
    sender_member_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_account_id: Optional[str] = None
    sender_bank: Optional[str] = None
    sender_city: Optional[str] = None

    receiver_id: Optional[int] = None
    receiver_member_id: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_account_id: Optional[str] = None
    receiver_bank: Optional[str] = None
    receiver_city: Optional[str] = None

    # Geographic location
    location: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Complete ML & Behavioral Intelligence
    detection_reason: Optional[str] = None
    detected_anomalies: List[str] = []
    behavioral_indicators: Dict[str, Any] = {}
    amlsim_typology: Optional[str] = None
    amlsim_type: Optional[str] = None
    is_amlsim_ground_truth: bool = False

    # Investigation & persistent treatment action history
    investigation: Optional[InvestigationSummary] = None
    actions: List[TreatmentActionSummary] = []
    treatment_history: List[TreatmentActionSummary] = []
    demo_enforcement_status: Optional[str] = None


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    pages: int
    limit: int
