"""
FraudX AI — Pydantic Schemas for Investigations and Case Actions
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.investigation import InvestigationStatus, InvestigationOutcome, ActionType


class InvestigationActionBase(BaseModel):
    action_type: ActionType
    notes: Optional[str] = None


class InvestigationActionCreate(InvestigationActionBase):
    pass


class InvestigationActionResponse(InvestigationActionBase):
    id: int
    investigation_id: int
    actor: str
    created_at: datetime

    class Config:
        from_attributes = True


class InvestigationBase(BaseModel):
    alert_id: str
    assigned_to: Optional[str] = None
    priority: str = "Medium"
    notes: Optional[str] = None


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationUpdate(BaseModel):
    status: Optional[InvestigationStatus] = None
    outcome: Optional[InvestigationOutcome] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class InvestigationResponse(InvestigationBase):
    id: int
    case_id: str
    status: InvestigationStatus
    outcome: InvestigationOutcome
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    actions: List[InvestigationActionResponse] = []

    # Joined alert info for context
    alert_category: Optional[str] = None
    alert_risk_level: Optional[str] = None
    alert_risk_score: Optional[float] = None
    transaction_id: Optional[str] = None
    transaction_amount: Optional[float] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


class InvestigationListResponse(BaseModel):
    items: List[InvestigationResponse]
    total: int
    page: int
    pages: int
    limit: int
