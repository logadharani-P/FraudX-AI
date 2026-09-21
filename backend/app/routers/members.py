"""
FraudX AI — Cooperative Members Router
Provides member directory, member search, account balances, and member transaction history
with strict role-based access control and customer data isolation.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models.member import Member, RiskStatus
from app.models.transaction import Transaction
from app.models.alert import Alert
from app.models.user import User, UserRole
from app.schemas.member import (
    MemberResponse, MemberListResponse, MemberDetailResponse
)
from app.schemas.transaction import TransactionResponse
from app.schemas.alert import AlertResponse
from app.routers.transactions import _serialize_transaction
from app.routers.alerts import _serialize_alert
from app.services.auth_service import require_role, get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/members", tags=["Members"])


def _serialize_member(m: Member, db: Session) -> MemberResponse:
    # Compute member transaction stats
    txn_stats = db.query(
        func.count(Transaction.id),
        func.sum(Transaction.amount),
    ).filter(Transaction.sender_id == m.id).first()

    txn_count = txn_stats[0] or 0
    total_amt = float(txn_stats[1] or 0.0)

    # Compute fraud count
    fraud_count = db.query(func.count(Transaction.id)).filter(
        Transaction.sender_id == m.id,
        Transaction.risk_score >= 60.0,
    ).scalar() or 0

    return MemberResponse(
        id=m.id,
        member_id=m.member_id,
        name=m.name,
        email=m.email,
        phone=m.phone,
        city=m.city,
        state=m.state,
        lat=m.lat,
        lng=m.lng,
        bank=m.bank,
        account_id=m.account_id,
        account_type=m.account_type,
        join_date=m.join_date,
        verified=m.verified,
        share_capital=m.share_capital,
        savings_balance=m.savings_balance,
        loan_outstanding=m.loan_outstanding,
        risk_status=m.risk_status,
        created_at=m.created_at,
        transaction_count=txn_count,
        total_amount=round(total_amt, 2),
        fraud_count=fraud_count,
    )


@router.get("", response_model=MemberListResponse)
def list_members(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    q: Optional[str] = None,
    city: Optional[str] = None,
    risk_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Member)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Member.name.ilike(search_pattern),
                Member.member_id.ilike(search_pattern),
                Member.email.ilike(search_pattern),
                Member.phone.ilike(search_pattern),
                Member.city.ilike(search_pattern),
                Member.account_id.ilike(search_pattern),
            )
        )

    if city and city != "All":
        query = query.filter(Member.city.ilike(city))

    if risk_status and risk_status != "All":
        for rs in RiskStatus:
            if rs.value.lower() == risk_status.lower():
                query = query.filter(Member.risk_status == rs)
                break

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(Member.id.asc()).offset(offset).limit(limit).all()

    return MemberListResponse(
        items=[_serialize_member(m, db) for m in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get("/{id}", response_model=MemberResponse)
def get_member(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if id.isdigit():
        member = db.query(Member).filter(Member.id == int(id)).first()
    else:
        member = db.query(Member).filter(Member.member_id == id).first()

    if not member:
        raise HTTPException(status_code=404, detail=f"Member {id} not found")

    # ── CUSTOMER DATA ISOLATION CHECK ──
    if current_user and current_user.role == UserRole.customer:
        c_mbr = current_user.member_id
        if current_user.member:
            c_mbr = current_user.member.member_id
        if member.member_id != c_mbr and str(member.id) != str(id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Customers can only view their own member profile.",
            )

    return _serialize_member(member, db)


@router.get("/{id}/transactions", response_model=List[TransactionResponse])
def get_member_transactions(
    id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if id.isdigit():
        member = db.query(Member).filter(Member.id == int(id)).first()
    else:
        member = db.query(Member).filter(Member.member_id == id).first()

    if not member:
        raise HTTPException(status_code=404, detail=f"Member {id} not found")

    # ── CUSTOMER DATA ISOLATION CHECK ──
    if current_user and current_user.role == UserRole.customer:
        c_mbr = current_user.member_id
        if current_user.member:
            c_mbr = current_user.member.member_id
        if member.member_id != c_mbr:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Customers can only view their own transaction history.",
            )

    txns = (
        db.query(Transaction)
        .filter(or_(Transaction.sender_id == member.id, Transaction.receiver_id == member.id))
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [_serialize_transaction(t) for t in txns]


@router.get("/{id}/alerts", response_model=List[AlertResponse])
def get_member_alerts(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    if id.isdigit():
        member = db.query(Member).filter(Member.id == int(id)).first()
    else:
        member = db.query(Member).filter(Member.member_id == id).first()

    if not member:
        raise HTTPException(status_code=404, detail=f"Member {id} not found")

    alerts = (
        db.query(Alert)
        .join(Alert.transaction)
        .filter(or_(Transaction.sender_id == member.id, Transaction.receiver_id == member.id))
        .order_by(Alert.risk_score.desc())
        .all()
    )

    return [_serialize_alert(a) for a in alerts]

