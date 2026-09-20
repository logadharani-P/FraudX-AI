"""
FraudX AI — Transactions Router
Provides paginated list, search/filters, transaction detail, and GPS map points
with strict role-based access control and customer data isolation.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.transaction import Transaction, RiskLevel, TransactionStatus
from app.models.member import Member
from app.models.user import User, UserRole
from app.schemas.transaction import (
    TransactionResponse, TransactionListResponse, MapPointResponse
)
from app.services.auth_service import get_current_user_optional, get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _serialize_transaction(t: Transaction) -> TransactionResponse:
    sender = t.sender
    receiver = t.receiver

    anomalies: List[str] = []
    if t.anomaly_factors and isinstance(t.anomaly_factors, list):
        anomalies = [af for af in t.anomaly_factors if af and "multi-dimensional" not in af.lower()]

    if len(anomalies) == 0:
        from app.ml.risk_explainer import explain_transaction_risk
        t_dict = {
            "amount": t.amount,
            "old_balance_orig": t.old_balance_orig,
            "new_balance_orig": t.new_balance_orig,
            "old_balance_dest": t.old_balance_dest,
            "new_balance_dest": t.new_balance_dest,
            "sender_savings_balance": sender.savings_balance if sender else 25000,
            "sender_mean_amount": 15000,
            "step_velocity": t.amlsim_step,
            "is_fraud_label": t.is_fraud_label,
            "transaction_type": t.transaction_type,
            "device": t.device,
            "location_city": t.location_city,
            "location_state": t.location_state,
            "sender_city": sender.city if sender else None,
            "receiver_city": receiver.city if receiver else None,
            "receiver_name": receiver.name if receiver else None,
            "purpose": t.purpose,
            "amlsim_type": t.amlsim_type,
        }
        anomalies = explain_transaction_risk(t_dict, t.risk_score or 0.0)

    sender_summary = None
    if sender:
        from app.schemas.transaction import MemberSummary
        sender_summary = MemberSummary(
            id=sender.id,
            member_id=sender.member_id,
            name=sender.name,
            city=sender.city,
            state=sender.state,
            bank=sender.bank,
            account_id=sender.account_id,
        )

    receiver_summary = None
    if receiver:
        from app.schemas.transaction import MemberSummary
        receiver_summary = MemberSummary(
            id=receiver.id,
            member_id=receiver.member_id,
            name=receiver.name,
            city=receiver.city,
            state=receiver.state,
            bank=receiver.bank,
            account_id=receiver.account_id,
        )

    date_str, time_str = None, None
    if t.timestamp:
        date_str = t.timestamp.strftime("%d %b %Y")
        time_str = t.timestamp.strftime("%I:%M:%S %p")

    return TransactionResponse(
        id=t.id,
        transaction_id=t.transaction_id,
        amount=t.amount,
        amount_formatted=f"₹{t.amount:,.2f}",
        transaction_type=t.transaction_type,
        channel=t.device or t.transaction_type,
        device=t.device,
        location_city=t.location_city,
        location_state=t.location_state,
        lat=t.lat,
        lng=t.lng,
        latitude=t.lat,
        longitude=t.lng,
        purpose=t.purpose,
        loan_ref=t.loan_ref,
        status=t.status,
        timestamp=t.timestamp,
        date_formatted=date_str,
        time_formatted=time_str,
        created_at=t.created_at,
        sender_id=t.sender_id,
        receiver_id=t.receiver_id,
        member_id=sender.member_id if sender else None,
        sender_member_id=sender.member_id if sender else None,
        sender_name=sender.name if sender else None,
        sender_account_id=sender.account_id if sender else None,
        sender_bank=sender.bank if sender else None,
        sender_city=sender.city if sender else None,
        receiver_member_id=receiver.member_id if receiver else None,
        receiver_name=receiver.name if receiver else None,
        receiver_account_id=receiver.account_id if receiver else None,
        receiver_bank=receiver.bank if receiver else None,
        receiver_city=receiver.city if receiver else None,
        sender=sender_summary,
        receiver=receiver_summary,
        risk_score=t.risk_score,
        risk_level=t.risk_level,
        anomaly_score=t.anomaly_score,
        anomaly_factors=anomalies,
        detection_reason=anomalies[0] if len(anomalies) > 0 else "Standard cooperative society transaction",
        is_fraud_label=t.is_fraud_label,
        is_flagged_fraud=t.is_flagged_fraud,
    )


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    q: Optional[str] = None,
    type: Optional[str] = None,
    risk: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    member_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Transaction).options(
        joinedload(Transaction.sender),
        joinedload(Transaction.receiver),
    )

    # ── CUSTOMER DATA ISOLATION ──
    # If the user is authenticated as a customer, strictly scope to their own transactions
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
            return TransactionListResponse(items=[], total=0, page=1, pages=1, limit=limit)

    elif member_id:
        # For analyst/organisation filtering by member
        query = query.join(Transaction.sender).filter(Member.member_id == member_id)

    # Search query filter
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.join(Transaction.sender).filter(
            or_(
                Transaction.transaction_id.ilike(search_pattern),
                Transaction.location_city.ilike(search_pattern),
                Transaction.purpose.ilike(search_pattern),
                Member.name.ilike(search_pattern),
                Member.member_id.ilike(search_pattern),
            )
        )

    # Type filter
    if type and type != "All":
        query = query.filter(Transaction.transaction_type == type)

    # Risk level filter
    if risk and risk != "All":
        r_enum = None
        for re in RiskLevel:
            if re.value.lower() == risk.lower():
                r_enum = re
                break
        if r_enum:
            query = query.filter(Transaction.risk_level == r_enum)

    # Status filter
    if status_filter and status_filter != "All":
        s_enum = None
        for se in TransactionStatus:
            if se.value.lower() == status_filter.lower():
                s_enum = se
                break
        if s_enum:
            query = query.filter(Transaction.status == s_enum)

    # Date range filters
    if date_from:
        query = query.filter(Transaction.timestamp >= date_from)
    if date_to:
        query = query.filter(Transaction.timestamp <= date_to)

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(Transaction.timestamp.desc()).offset(offset).limit(limit).all()

    return TransactionListResponse(
        items=[_serialize_transaction(t) for t in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get("/map", response_model=List[MapPointResponse])
def get_map_points(
    limit: int = Query(250, ge=10, le=1000),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns GPS coordinate points for MapView.
    Scoped to customer's own transactions if authenticated as customer.
    """
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.sender))
        .filter(Transaction.lat.isnot(None), Transaction.lng.isnot(None))
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
        else:
            return []

    txns = query.order_by(Transaction.timestamp.desc()).limit(limit).all()

    points = []
    for t in txns:
        r_level_val = t.risk_level.value if t.risk_level else "Low"
        sender_name = t.sender.name if t.sender else "Member"
        points.append(
            MapPointResponse(
                id=t.id,
                transaction_id=t.transaction_id,
                lat=t.lat,
                lng=t.lng,
                risk_level=r_level_val,
                risk_score=t.risk_score or 0.0,
                amount=t.amount,
                location_city=t.location_city,
                sender_name=sender_name,
            )
        )
    return points


@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Transaction).options(
        joinedload(Transaction.sender),
        joinedload(Transaction.receiver),
    )

    if id.isdigit():
        txn = query.filter(Transaction.id == int(id)).first()
    else:
        txn = query.filter(Transaction.transaction_id == id).first()

    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction {id} not found")

    # ── CUSTOMER DATA ISOLATION CHECK ──
    if current_user and current_user.role == UserRole.customer:
        c_member = current_user.member
        if not c_member and current_user.member_id:
            c_member = db.query(Member).filter(Member.member_id == current_user.member_id).first()

        c_member_id = c_member.id if c_member else -1
        c_mbr_str = c_member.member_id if c_member else current_user.member_id

        # Verify transaction belongs to this customer
        is_owner = (
            txn.sender_id == c_member_id or
            txn.receiver_id == c_member_id or
            (txn.sender and txn.sender.member_id == c_mbr_str) or
            (txn.receiver and txn.receiver.member_id == c_mbr_str)
        )
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own transaction records.",
            )

    return _serialize_transaction(txn)

