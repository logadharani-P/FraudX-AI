"""
FraudX AI — Pydantic Schemas for FraudX Intelligence Agent
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AgentChatContext(BaseModel):
    transaction_id: Optional[str] = None
    member_id: Optional[str] = None
    alert_id: Optional[str] = None
    case_id: Optional[str] = None


class AgentChatRequest(BaseModel):
    message: str
    context: Optional[AgentChatContext] = None


class EvidenceItem(BaseModel):
    title: str
    description: str
    type: str  # ml_score, network, behavioral, baseline
    severity: str  # info, warning, danger


class AgentChatResponse(BaseModel):
    reply: str
    evidence: List[EvidenceItem] = []
    sources: List[str] = []
    suggested_actions: List[str] = []
    raw_data: Optional[Dict[str, Any]] = None
