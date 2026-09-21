"""
FraudX AI — Pydantic Schemas for Dashboard Aggregations
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.schemas.alert import AlertResponse


class DashboardStats(BaseModel):
    totalTransactions: int
    totalAmount: float
    fraudCount: int
    legitimateCount: int
    avgAmount: float
    maxAmount: float
    highRiskCount: int
    mediumRiskCount: int
    lowRiskCount: int
    criticalAlerts: int
    openAlerts: int
    typeCounts: Dict[str, int]
    cityCounts: Dict[str, int]
    fraudRate: str  # Calculated actual rate e.g. "1.45"
    evaluationMetrics: Optional[Dict[str, float]] = None


class ActivityPoint(BaseModel):
    hour: str
    transactions: int
    flagged: int
    amount: float


class RiskOverview(BaseModel):
    lowRiskCount: int
    mediumRiskCount: int
    highRiskCount: int
    criticalRiskCount: int
    riskDistribution: List[Dict[str, Any]]
