"""
FraudX AI — Pydantic Schemas for Risk & Network Analysis
"""
from typing import Dict, List, Optional
from pydantic import BaseModel


class RiskDistributionItem(BaseModel):
    name: str  # Low, Medium, High, Critical
    value: int
    color: str


class RiskByTypeItem(BaseModel):
    type: str
    count: int
    avgRisk: float
    flaggedCount: int


class NetworkNode(BaseModel):
    id: str
    label: str
    type: str  # member, counterparty, hub
    risk_level: str
    city: Optional[str] = None
    account_id: Optional[str] = None


class NetworkEdge(BaseModel):
    source: str
    target: str
    amount: float
    count: int
    risk_score: float
    type: str


class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    stats: Dict[str, float]
    suspicious_patterns: List[str]
