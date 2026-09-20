"""
FraudX AI — Dashboard Aggregations Router
Computes live statistics, activity timeline, and risk distributions directly from the database
with customer data isolation and role-aware aggregations.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.transaction import Transaction, RiskLevel
from app.models.alert import Alert, AlertStatus
from app.models.member import Member
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardStats, ActivityPoint, RiskOverview
from app.services.auth_service import get_current_user_optional

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    txn_query = db.query(Transaction)

    # Scoped calculations for Customer
    if current_user and current_user.role == UserRole.customer:
        c_member = current_user.member
        if not c_member and current_user.member_id:
            c_member = db.query(Member).filter(Member.member_id == current_user.member_id).first()

        if c_member:
            txn_query = txn_query.filter(
                or_(
                    Transaction.sender_id == c_member.id,
                    Transaction.receiver_id == c_member.id,
                )
            )
            total_txns = txn_query.count()
            total_amount = txn_query.with_entities(func.sum(Transaction.amount)).scalar() or 0.0
            avg_amount = txn_query.with_entities(func.avg(Transaction.amount)).scalar() or 0.0
            max_amount = txn_query.with_entities(func.max(Transaction.amount)).scalar() or 0.0

            type_rows = (
                txn_query.with_entities(Transaction.transaction_type, func.count(Transaction.id))
                .group_by(Transaction.transaction_type)
                .all()
            )
            type_counts = {row[0]: row[1] for row in type_rows if row[0]}
            city_counts = {c_member.city: total_txns}

            return DashboardStats(
                totalTransactions=total_txns,
                totalAmount=round(float(total_amount), 2),
                fraudCount=0,
                legitimateCount=total_txns,
                avgAmount=round(float(avg_amount), 2),
                maxAmount=round(float(max_amount), 2),
                highRiskCount=0,
                mediumRiskCount=0,
                lowRiskCount=total_txns,
                criticalAlerts=0,
                openAlerts=0,
                typeCounts=type_counts,
                cityCounts=city_counts,
                fraudRate="0.00",
            )
        else:
            return DashboardStats(
                totalTransactions=0,
                totalAmount=0.0,
                fraudCount=0,
                legitimateCount=0,
                avgAmount=0.0,
                maxAmount=0.0,
                highRiskCount=0,
                mediumRiskCount=0,
                lowRiskCount=0,
                criticalAlerts=0,
                openAlerts=0,
                typeCounts={},
                cityCounts={},
                fraudRate="0.00",
            )

    # Organisation / Analyst global stats
    total_txns = db.query(func.count(Transaction.id)).scalar() or 0
    total_amount = db.query(func.sum(Transaction.amount)).scalar() or 0.0
    avg_amount = db.query(func.avg(Transaction.amount)).scalar() or 0.0
    max_amount = db.query(func.max(Transaction.amount)).scalar() or 0.0

    high_risk_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.high).scalar() or 0
    critical_risk_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.critical).scalar() or 0
    medium_risk_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.medium).scalar() or 0
    low_risk_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.low).scalar() or 0

    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.open).scalar() or 0
    total_alerts = db.query(func.count(Alert.id)).scalar() or 0

    type_rows = db.query(Transaction.transaction_type, func.count(Transaction.id)).group_by(Transaction.transaction_type).all()
    type_counts = {row[0]: row[1] for row in type_rows if row[0]}

    city_rows = db.query(Transaction.location_city, func.count(Transaction.id)).group_by(Transaction.location_city).all()
    city_counts = {row[0]: row[1] for row in city_rows if row[0]}

    fraud_count = high_risk_count + critical_risk_count
    legit_count = max(0, total_txns - fraud_count)
    fraud_rate = f"{(fraud_count / total_txns * 100):.2f}" if total_txns > 0 else "0.00"

    return DashboardStats(
        totalTransactions=total_txns,
        totalAmount=round(float(total_amount), 2),
        fraudCount=fraud_count,
        legitimateCount=legit_count,
        avgAmount=round(float(avg_amount), 2),
        maxAmount=round(float(max_amount), 2),
        highRiskCount=high_risk_count,
        mediumRiskCount=medium_risk_count,
        lowRiskCount=low_risk_count,
        criticalAlerts=critical_risk_count,
        openAlerts=open_alerts,
        typeCounts=type_counts,
        cityCounts=city_counts,
        fraudRate=fraud_rate,
    )


@router.get("/activity", response_model=List[ActivityPoint])
def get_dashboard_activity(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Transaction)
    if current_user and current_user.role == UserRole.customer:
        c_member = current_user.member
        if not c_member and current_user.member_id:
            c_member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if c_member:
            query = query.filter(
                or_(
                    Transaction.sender_id == c_member.id,
                    Transaction.receiver_id == c_member.id,
                )
            )
        else:
            return []

    txns = query.order_by(Transaction.timestamp.asc()).all()
    if not txns:
        return []

    buckets: Dict[int, Dict[str, float]] = {i: {"total": 0, "flagged": 0, "amount": 0.0} for i in range(12)}
    chunk_size = max(1, len(txns) // 12)

    for idx, t in enumerate(txns):
        b_idx = min(11, idx // chunk_size)
        buckets[b_idx]["total"] += 1
        buckets[b_idx]["amount"] += t.amount
        if t.risk_level in [RiskLevel.high, RiskLevel.critical]:
            buckets[b_idx]["flagged"] += 1

    timeline = []
    for i in range(12):
        hour_label = f"{i * 2:02d}:00"
        timeline.append(
            ActivityPoint(
                hour=hour_label,
                transactions=buckets[i]["total"],
                flagged=buckets[i]["flagged"],
                amount=round(buckets[i]["amount"], 2),
            )
        )
    return timeline


@router.get("/risk-overview", response_model=RiskOverview)
def get_risk_overview(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Transaction)
    if current_user and current_user.role == UserRole.customer:
        c_member = current_user.member
        if not c_member and current_user.member_id:
            c_member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if c_member:
            query = query.filter(
                or_(
                    Transaction.sender_id == c_member.id,
                    Transaction.receiver_id == c_member.id,
                )
            )
            low = query.filter(Transaction.risk_level == RiskLevel.low).count()
            return RiskOverview(
                lowRiskCount=low,
                mediumRiskCount=0,
                highRiskCount=0,
                criticalRiskCount=0,
                riskDistribution=[
                    {"name": "Low", "value": low},
                    {"name": "Medium", "value": 0},
                    {"name": "High", "value": 0},
                    {"name": "Critical", "value": 0},
                ],
            )
        else:
            return RiskOverview(
                lowRiskCount=0,
                mediumRiskCount=0,
                highRiskCount=0,
                criticalRiskCount=0,
                riskDistribution=[],
            )

    low = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.low).scalar() or 0
    medium = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.medium).scalar() or 0
    high = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.high).scalar() or 0
    critical = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.critical).scalar() or 0

    return RiskOverview(
        lowRiskCount=low,
        mediumRiskCount=medium,
        highRiskCount=high,
        criticalRiskCount=critical,
        riskDistribution=[
            {"name": "Low", "value": low},
            {"name": "Medium", "value": medium},
            {"name": "High", "value": high},
            {"name": "Critical", "value": critical},
        ],
    )

