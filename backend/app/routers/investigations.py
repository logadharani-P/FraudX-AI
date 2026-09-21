"""
FraudX AI — Investigations & Case Management Router
Provides investigation cases, case actions (Block/Freeze/Escalate/Monitor), and resolution outcomes
with strict role-based access control.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.investigation import (
    Investigation, InvestigationAction, InvestigationStatus, InvestigationOutcome, ActionType
)
from app.models.alert import Alert, AlertStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.investigation import (
    InvestigationResponse, InvestigationListResponse, InvestigationCreate,
    InvestigationUpdate, InvestigationActionCreate, InvestigationActionResponse
)
from app.services.auth_service import require_role

router = APIRouter(prefix="/api/investigations", tags=["Investigations"])


def _serialize_investigation(inv: Investigation) -> InvestigationResponse:
    alert = inv.alert
    t = alert.transaction if alert else None
    sender = t.sender if t else None

    actions_list = []
    for a in inv.actions:
        actions_list.append(
            InvestigationActionResponse(
                id=a.id,
                investigation_id=a.investigation_id,
                action_type=a.action_type,
                actor=a.actor,
                notes=a.notes,
                created_at=a.created_at,
            )
        )

    return InvestigationResponse(
        id=inv.id,
        case_id=inv.case_id,
        alert_id=inv.alert_id,
        assigned_to=inv.assigned_to,
        status=inv.status,
        outcome=inv.outcome,
        priority=inv.priority,
        notes=inv.notes,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        closed_at=inv.closed_at,
        actions=actions_list,
        alert_category=alert.category.value if alert else None,
        alert_risk_level=alert.risk_level if alert else None,
        alert_risk_score=alert.risk_score if alert else None,
        transaction_id=t.transaction_id if t else None,
        transaction_amount=t.amount if t else None,
        member_name=sender.name if sender else None,
    )


@router.get("", response_model=InvestigationListResponse)
def list_investigations(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    outcome: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Investigation).options(
        joinedload(Investigation.alert).joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Investigation.actions),
    )

    if status_filter and status_filter != "All":
        s_enum = None
        for se in InvestigationStatus:
            if se.value.lower() == status_filter.lower():
                s_enum = se
                break
        if s_enum:
            query = query.filter(Investigation.status == s_enum)

    if outcome and outcome != "All":
        o_enum = None
        for oe in InvestigationOutcome:
            if oe.value.lower() == outcome.lower():
                o_enum = oe
                break
        if o_enum:
            query = query.filter(Investigation.outcome == o_enum)

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(Investigation.updated_at.desc()).offset(offset).limit(limit).all()

    return InvestigationListResponse(
        items=[_serialize_investigation(i) for i in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.post("", response_model=InvestigationResponse)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    # Check alert exists
    alert = db.query(Alert).filter(Alert.alert_id == payload.alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {payload.alert_id} not found")

    # Generate case ID
    count = db.query(Investigation).count()
    case_id = f"CSE-{500001 + count}"
    actor = current_user.email

    inv = Investigation(
        case_id=case_id,
        alert_id=payload.alert_id,
        assigned_to=payload.assigned_to or actor,
        priority=payload.priority,
        notes=payload.notes,
        status=InvestigationStatus.OPEN,
        outcome=InvestigationOutcome.PENDING,
    )
    db.add(inv)
    db.flush()

    # Update alert status to Investigating
    alert.status = AlertStatus.investigating

    # Log initial action
    act = InvestigationAction(
        investigation_id=inv.id,
        action_type=ActionType.NOTE_ADDED,
        actor=actor,
        notes=f"Investigation case {case_id} initiated.",
    )
    db.add(act)

    # Log audit
    audit = AuditLog(
        actor=actor,
        actor_role=current_user.role.value,
        entity_type="Investigation",
        entity_id=case_id,
        action="CASE_OPENED",
        new_value=f"Opened case for alert {payload.alert_id}",
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)

    return _serialize_investigation(inv)


@router.get("/{id}", response_model=InvestigationResponse)
def get_investigation(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Investigation).options(
        joinedload(Investigation.alert).joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Investigation.actions),
    )

    if id.isdigit():
        inv = query.filter(Investigation.id == int(id)).first()
    else:
        inv = query.filter(Investigation.case_id == id).first()

    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation {id} not found")

    return _serialize_investigation(inv)


@router.patch("/{id}", response_model=InvestigationResponse)
def update_investigation(
    id: str,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Investigation).options(
        joinedload(Investigation.alert).joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Investigation.actions),
    )

    if id.isdigit():
        inv = query.filter(Investigation.id == int(id)).first()
    else:
        inv = query.filter(Investigation.case_id == id).first()

    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation {id} not found")

    actor = current_user.email
    old_status = inv.status.value

    if payload.status:
        inv.status = payload.status
        if payload.status in [InvestigationStatus.RESOLVED, InvestigationStatus.CLOSED]:
            inv.closed_at = datetime.utcnow()
            if inv.alert:
                inv.alert.status = AlertStatus.resolved if inv.outcome == InvestigationOutcome.LEGITIMATE else AlertStatus.dismissed
                inv.alert.resolved_at = datetime.utcnow()
                inv.alert.resolution_note = payload.notes or f"Investigation concluded with outcome: {inv.outcome.value}"

    if payload.outcome:
        inv.outcome = payload.outcome
    if payload.assigned_to:
        inv.assigned_to = payload.assigned_to
    if payload.priority:
        inv.priority = payload.priority
    if payload.notes:
        inv.notes = payload.notes

    inv.updated_at = datetime.utcnow()

    # Log audit
    audit = AuditLog(
        actor=actor,
        actor_role=current_user.role.value,
        entity_type="Investigation",
        entity_id=inv.case_id,
        action="CASE_UPDATED",
        old_value=old_status,
        new_value=inv.status.value,
        extra_metadata={"outcome": inv.outcome.value, "notes": payload.notes},
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)

    return _serialize_investigation(inv)


@router.post("/{id}/actions", response_model=InvestigationActionResponse)
def add_investigation_action(
    id: str,
    payload: InvestigationActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Investigation).options(
        joinedload(Investigation.alert).joinedload(Alert.transaction)
    )
    if id.isdigit():
        inv = query.filter(Investigation.id == int(id)).first()
    else:
        inv = query.filter(Investigation.case_id == id).first()

    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation {id} not found")

    actor = current_user.email
    act = InvestigationAction(
        investigation_id=inv.id,
        action_type=payload.action_type,
        actor=actor,
        notes=payload.notes,
        created_at=datetime.utcnow(),
    )
    db.add(act)

    # Sync treatment action to alert and transaction statuses
    if inv.alert:
        if payload.action_type == ActionType.BLOCKED:
            inv.alert.status = AlertStatus.blocked
            if inv.alert.transaction:
                inv.alert.transaction.status = TransactionStatus.blocked
            inv.outcome = InvestigationOutcome.CONFIRMED_FRAUD
        elif payload.action_type == ActionType.FROZE:
            inv.alert.status = AlertStatus.frozen
            if inv.alert.transaction:
                inv.alert.transaction.status = TransactionStatus.frozen
            inv.outcome = InvestigationOutcome.CONFIRMED_FRAUD
        elif payload.action_type == ActionType.MONITORED:
            inv.alert.status = AlertStatus.monitoring
            if inv.alert.transaction:
                inv.alert.transaction.status = TransactionStatus.monitoring
        elif payload.action_type == ActionType.WHITELISTED:
            inv.alert.status = AlertStatus.whitelisted
            inv.alert.resolved_at = datetime.utcnow()
            inv.alert.resolved_by = current_user.id
            if inv.alert.transaction:
                inv.alert.transaction.status = TransactionStatus.completed
            inv.outcome = InvestigationOutcome.LEGITIMATE
            inv.status = InvestigationStatus.RESOLVED
        elif payload.action_type == ActionType.ESCALATED:
            inv.alert.status = AlertStatus.investigating
            inv.priority = "Critical"

    inv.updated_at = datetime.utcnow()

    # Audit log
    audit = AuditLog(
        actor=actor,
        actor_role=current_user.role.value,
        entity_type="InvestigationAction",
        entity_id=f"{inv.case_id}:{payload.action_type.value}",
        action=f"ACTION_{payload.action_type.value.upper()}",
        new_value=payload.notes or payload.action_type.value,
        extra_metadata={
            "case_id": inv.case_id,
            "alert_id": inv.alert_id,
            "action_type": payload.action_type.value,
            "notes": payload.notes,
            "demo_enforcement": "BLOCKED" if payload.action_type == ActionType.BLOCKED else payload.action_type.value,
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(act)

    return InvestigationActionResponse(
        id=act.id,
        investigation_id=act.investigation_id,
        action_type=act.action_type,
        actor=act.actor,
        notes=act.notes,
        created_at=act.created_at,
    )

