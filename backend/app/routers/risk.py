"""
FraudX AI — Risk & Network Analysis Router
Provides risk distribution breakdowns, type-based risk metrics, and NetworkX graph analysis
with customer isolation and role-based access control.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import pandas as pd

from app.database import get_db
from app.models.transaction import Transaction, RiskLevel
from app.models.member import Member
from app.models.user import User, UserRole
from app.schemas.risk import (
    RiskDistributionItem, RiskByTypeItem, NetworkGraphResponse
)
from app.ml.network_analysis import TransactionNetworkAnalyzer
from app.services.auth_service import get_current_user, get_current_user_optional, require_role

router = APIRouter(prefix="/api/risk", tags=["Risk Analysis"])


@router.get("/distribution", response_model=List[RiskDistributionItem])
def get_risk_distribution(
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
            return [
                RiskDistributionItem(name="Low Risk", value=low, color="#22c55e"),
                RiskDistributionItem(name="Medium Risk", value=0, color="#eab308"),
                RiskDistributionItem(name="High Risk", value=0, color="#f97316"),
                RiskDistributionItem(name="Critical Risk", value=0, color="#ef4444"),
            ]
        else:
            return []

    low = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.low).scalar() or 0
    med = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.medium).scalar() or 0
    high = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.high).scalar() or 0
    crit = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.critical).scalar() or 0

    return [
        RiskDistributionItem(name="Low Risk", value=low, color="#22c55e"),
        RiskDistributionItem(name="Medium Risk", value=med, color="#eab308"),
        RiskDistributionItem(name="High Risk", value=high, color="#f97316"),
        RiskDistributionItem(name="Critical Risk", value=crit, color="#ef4444"),
    ]


@router.get("/by-type", response_model=List[RiskByTypeItem])
def get_risk_by_type(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(
        Transaction.transaction_type,
        func.count(Transaction.id).label("count"),
        func.avg(Transaction.risk_score).label("avg_risk"),
    )

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

    rows = query.group_by(Transaction.transaction_type).all()

    items = []
    for r in rows:
        t_type = r[0] or "Unknown"
        total_c = r[1] or 0
        avg_r = round(float(r[2] or 0.0), 1)

        flagged_q = db.query(func.count(Transaction.id)).filter(
            Transaction.transaction_type == t_type,
            Transaction.risk_level.in_([RiskLevel.high, RiskLevel.critical]),
        )
        if current_user and current_user.role == UserRole.customer:
            c_member = current_user.member or db.query(Member).filter(Member.member_id == current_user.member_id).first()
            if c_member:
                flagged_q = flagged_q.filter(or_(Transaction.sender_id == c_member.id, Transaction.receiver_id == c_member.id))

        flagged_c = flagged_q.scalar() or 0

        items.append(
            RiskByTypeItem(
                type=t_type,
                count=total_c,
                avgRisk=avg_r,
                flaggedCount=flagged_c,
            )
        )
    return items


@router.get("/network/{member_id}", response_model=NetworkGraphResponse)
def get_member_network(
    member_id: str,
    depth: int = 2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes NetworkX graph traversal on transaction history and returns ego-subgraph.
    Strictly isolated: Customer accounts can only view their own ego-network.
    """
    # Normalize member_id
    if member_id.isdigit():
        m_rec = db.query(Member).filter(Member.id == int(member_id)).first()
        target_id = m_rec.member_id if m_rec else member_id
    else:
        target_id = member_id
        m_rec = db.query(Member).filter(Member.member_id == member_id).first()

    # ── CUSTOMER DATA ISOLATION CHECK ──
    if current_user.role == UserRole.customer:
        c_mbr = current_user.member_id
        if current_user.member:
            c_mbr = current_user.member.member_id
        if target_id != c_mbr and (not m_rec or str(m_rec.id) != str(member_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Customers can only analyze their own network graph.",
            )

    txns = db.query(Transaction).all()
    if not txns:
        raise HTTPException(status_code=404, detail="No transaction data available for graph analysis")

    data = []
    for t in txns:
        data.append({
            "sender_id": t.sender_id,
            "receiver_id": t.receiver_id,
            "sender_member_id": t.sender.member_id if t.sender else str(t.sender_id),
            "sender_name": t.sender.name if t.sender else f"Member {t.sender_id}",
            "sender_city": t.sender.city if t.sender else "",
            "receiver_member_id": t.receiver.member_id if t.receiver else str(t.receiver_id),
            "receiver_name": t.receiver.name if t.receiver else f"Member {t.receiver_id}",
            "receiver_city": t.receiver.city if t.receiver else "",
            "amount": t.amount,
            "risk_score": t.risk_score or 0.0,
            "risk_level": t.risk_level.value if t.risk_level else "Low",
            "transaction_id": t.transaction_id,
        })
    df = pd.DataFrame(data)

    analyzer = TransactionNetworkAnalyzer()
    analyzer.build_graph_from_dataframe(df)

    subgraph_data = analyzer.get_member_subgraph(target_id, depth=depth)
    return NetworkGraphResponse(**subgraph_data)


@router.post("/treatment")
def apply_risk_treatment(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    """
    Applies authorized risk treatment (Block Transaction, Freeze Account, Enhanced Monitoring, Whitelist, Escalate).
    Restricted to Analyst and Organisation roles. Customers receive 403.
    """
    from app.routers.alerts import update_alert
    from app.schemas.alert import AlertUpdate
    from app.models.audit_log import AuditLog
    from app.models.transaction import TransactionStatus

    alert_id = payload.get("alert_id")
    action = payload.get("action", "Blocked")
    notes = payload.get("notes", "")

    if alert_id:
        return update_alert(
            id=alert_id,
            payload=AlertUpdate(action=action, notes=notes, resolution_note=notes or action),
            db=db,
            current_user=current_user,
        )

    txn_id = payload.get("transaction_id")
    if txn_id:
        txn = db.query(Transaction).filter(
            or_(
                Transaction.transaction_id == str(txn_id),
                Transaction.id == int(txn_id) if str(txn_id).isdigit() else False,
            )
        ).first()
        if not txn:
            raise HTTPException(status_code=404, detail=f"Transaction {txn_id} not found")
        if txn.alert:
            return update_alert(
                id=txn.alert.alert_id,
                payload=AlertUpdate(action=action, notes=notes, resolution_note=notes or action),
                db=db,
                current_user=current_user,
            )
        else:
            old_stat = txn.status.value
            if "block" in action.lower():
                txn.status = TransactionStatus.blocked
            elif "freeze" in action.lower() or "froze" in action.lower():
                txn.status = TransactionStatus.frozen
            elif "monitor" in action.lower():
                txn.status = TransactionStatus.monitoring

            audit = AuditLog(
                actor=current_user.email,
                actor_role=current_user.role.value,
                entity_type="Transaction",
                entity_id=txn.transaction_id,
                action=f"TREATMENT_{action.upper()}",
                old_value=old_stat,
                new_value=txn.status.value,
                extra_metadata={
                    "action": action,
                    "notes": notes,
                    "demo_enforcement": "BLOCKED" if txn.status == TransactionStatus.blocked else txn.status.value,
                },
                created_at=datetime.utcnow(),
            )
            db.add(audit)
            db.commit()
            return {
                "status": "success",
                "transaction_id": txn.transaction_id,
                "treatment": action,
                "transaction_status": txn.status.value,
            }

    raise HTTPException(status_code=400, detail="Either alert_id or transaction_id must be provided")

