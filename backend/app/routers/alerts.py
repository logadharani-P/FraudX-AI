"""
FraudX AI — Fraud Alerts Router
Provides comprehensive alert listing, complete alert detail with explainable anomalies
and behavioral indicators, persistent database-backed lifecycle states, and authorized risk treatment actions.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.models.alert import Alert, AlertStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.member import Member
from app.models.investigation import Investigation, InvestigationAction, InvestigationStatus, InvestigationOutcome, ActionType
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.alert import (
    AlertResponse, AlertListResponse, AlertUpdate, AlertTreatmentRequest,
    InvestigationSummary, TreatmentActionSummary
)
from app.services.auth_service import require_role
from app.ml.risk_explainer import explain_transaction_risk

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


def _serialize_alert(a: Alert) -> AlertResponse:
    """
    Serializes an Alert into a complete, richly-detailed AlertResponse object.
    Includes all transaction metadata, sender/receiver details, locations,
    factual anomaly explanations, behavioral metrics, AMLSim typology, and treatment history.
    """
    t = a.transaction
    sender = t.sender if t else None
    receiver = t.receiver if t else None

    # Date and time formatting
    dt_str, date_str, time_str = None, None, None
    if t and t.timestamp:
        date_str = t.timestamp.strftime("%d %b %Y")
        time_str = t.timestamp.strftime("%I:%M:%S %p")
        dt_str = f"{date_str}, {time_str}"
    elif a.created_at:
        date_str = a.created_at.strftime("%d %b %Y")
        time_str = a.created_at.strftime("%I:%M:%S %p")
        dt_str = f"{date_str}, {time_str}"

    # Factual explainable anomalies
    anomalies: List[str] = []
    if t:
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
        derived_reasons = explain_transaction_risk(t_dict, a.risk_score)

        # Include stored anomaly factors if specific
        if t.anomaly_factors and isinstance(t.anomaly_factors, list):
            for af in t.anomaly_factors:
                if af and "multi-dimensional" not in af.lower() and af not in anomalies:
                    anomalies.append(af)

        # Merge derived factual reasons
        for r in derived_reasons:
            if r not in anomalies:
                anomalies.append(r)

    # Primary detection reason
    detection_reason = a.reason
    if not detection_reason or "multi-dimensional" in detection_reason.lower() or detection_reason.strip() == "":
        detection_reason = anomalies[0] if len(anomalies) > 0 else f"High risk score ({a.risk_score:.1f}/100) flagged for human review"

    # Behavioral indicators
    behavioral_indicators: Dict[str, Any] = {}
    if t:
        drain_pct = 0.0
        if t.old_balance_orig > 0:
            drain_pct = round(((t.old_balance_orig - t.new_balance_orig) / t.old_balance_orig) * 100.0, 1)
        
        is_out_of_jurisdiction = False
        if sender and t.location_city and sender.city and t.location_city.strip().lower() != sender.city.strip().lower():
            is_out_of_jurisdiction = True

        behavioral_indicators = {
            "transaction_amount": t.amount,
            "sender_old_balance": t.old_balance_orig,
            "sender_new_balance": t.new_balance_orig,
            "balance_drain_percentage": drain_pct,
            "channel_or_device": t.device or t.transaction_type,
            "location_recorded": f"{t.location_city or 'Unknown'}, {t.location_state or ''}".strip(", "),
            "is_out_of_jurisdiction": is_out_of_jurisdiction,
            "member_home_branch": sender.city if sender else "Apex Society",
            "simulation_velocity_step": t.amlsim_step,
            "is_instant_settlement": t.transaction_type in ["UPI", "IMPS", "RTGS"],
        }

    # AMLSim typology classification
    amlsim_typology = "Cooperative Society Behavioral Baseline Anomaly"
    if t and t.is_fraud_label:
        if t.amount >= 200000.0:
            amlsim_typology = "High-Value Rapid Fund Dispersal Typology"
        elif t.amlsim_type == "TRANSFER":
            amlsim_typology = "Scatter-Gather / Multi-Hop Layering Network Flow"
        else:
            amlsim_typology = "Synthetic AMLSim Benchmark Fraud Pattern"

    # Investigation & treatment history
    inv_summary = None
    actions_list: List[TreatmentActionSummary] = []
    if a.investigation:
        inv = a.investigation
        inv_summary = InvestigationSummary(
            case_id=inv.case_id,
            status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            outcome=inv.outcome.value if hasattr(inv.outcome, "value") else str(inv.outcome),
            priority=inv.priority,
            assigned_to=inv.assigned_to,
            notes=inv.notes,
            created_at=inv.created_at,
            closed_at=inv.closed_at,
        )
        if inv.actions:
            for act in inv.actions:
                act_val = act.action_type.value if hasattr(act.action_type, "value") else str(act.action_type)
                actions_list.append(
                    TreatmentActionSummary(
                        id=act.id,
                        action_type=act_val,
                        actor=act.actor,
                        notes=act.notes,
                        created_at=act.created_at,
                    )
                )

    # Demo enforcement status
    demo_status = "Pending Review"
    if a.status == AlertStatus.blocked or (t and t.status == TransactionStatus.blocked):
        demo_status = "Demo enforcement status: BLOCKED"
    elif a.status == AlertStatus.frozen or (t and t.status == TransactionStatus.frozen):
        demo_status = "Demo enforcement status: FROZEN"
    elif a.status == AlertStatus.monitoring or (t and t.status == TransactionStatus.monitoring):
        demo_status = "Demo enforcement status: ENHANCED MONITORING"
    elif a.status == AlertStatus.whitelisted:
        demo_status = "Demo enforcement status: WHITELISTED"
    elif a.status == AlertStatus.resolved:
        demo_status = "Resolved / Closed"
    elif a.status == AlertStatus.investigating:
        demo_status = "Under Active Investigation"

    return AlertResponse(
        id=a.id,
        alert_id=a.alert_id,
        transaction_id=a.transaction_id,
        category=a.category,
        risk_level=a.risk_level,
        risk_score=a.risk_score,
        reason=detection_reason,
        description=a.description or f"AI anomaly assessment flagged transaction {t.transaction_id if t else ''} for human analyst review.",
        status=a.status,
        created_at=a.created_at,
        resolved_at=a.resolved_at,
        resolved_by=a.resolved_by,
        resolved_by_name=a.resolver.name if a.resolver else None,
        resolution_note=a.resolution_note,

        # Transaction summary & identifiers
        transaction_ref_id=t.transaction_id if t else None,
        transaction_db_id=t.id if t else None,
        amount=t.amount if t else None,
        amount_formatted=f"₹{t.amount:,.2f}" if t else None,
        transaction_type=t.transaction_type if t else None,
        channel=t.device if t else None,
        device=t.device if t else None,
        purpose=t.purpose if t else None,
        loan_ref=t.loan_ref if t else None,
        timestamp=t.timestamp if t else None,
        date_formatted=date_str,
        time_formatted=time_str,

        # Participant identities
        sender_id=t.sender_id if t else None,
        sender_member_id=sender.member_id if sender else None,
        sender_name=sender.name if sender else None,
        sender_account_id=sender.account_id if sender else None,
        sender_bank=sender.bank if sender else None,
        sender_city=sender.city if sender else None,

        receiver_id=t.receiver_id if t else None,
        receiver_member_id=receiver.member_id if receiver else None,
        receiver_name=receiver.name if receiver else None,
        receiver_account_id=receiver.account_id if receiver else None,
        receiver_bank=receiver.bank if receiver else None,
        receiver_city=receiver.city if receiver else None,

        # Geographic location
        location=f"{t.location_city}, {t.location_state}" if (t and t.location_city) else None,
        location_city=t.location_city if t else None,
        location_state=t.location_state if t else None,
        lat=t.lat if t else None,
        lng=t.lng if t else None,

        # Complete ML & Behavioral Intelligence
        detection_reason=detection_reason,
        detected_anomalies=anomalies,
        behavioral_indicators=behavioral_indicators,
        amlsim_typology=amlsim_typology,
        amlsim_type=t.amlsim_type if t else None,
        is_amlsim_ground_truth=bool(t.is_fraud_label) if t else False,

        # Investigation & persistent treatment action history
        investigation=inv_summary,
        actions=actions_list,
        treatment_history=actions_list,
        demo_enforcement_status=demo_status,
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    risk_level: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Alert.transaction).joinedload(Transaction.receiver),
        joinedload(Alert.resolver),
        joinedload(Alert.investigations).joinedload(Investigation.actions),
    )

    if risk_level and risk_level != "All":
        query = query.filter(Alert.risk_level.ilike(risk_level))

    if status_filter and status_filter != "All":
        s_enum = None
        for se in AlertStatus:
            if se.value.lower() == status_filter.lower():
                s_enum = se
                break
        if s_enum:
            query = query.filter(Alert.status == s_enum)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.join(Alert.transaction).join(Transaction.sender).filter(
            or_(
                Alert.alert_id.ilike(search_pattern),
                Alert.reason.ilike(search_pattern),
                Transaction.transaction_id.ilike(search_pattern),
                Member.name.ilike(search_pattern),
            )
        )

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(Alert.risk_score.desc(), Alert.created_at.desc()).offset(offset).limit(limit).all()

    return AlertListResponse(
        items=[_serialize_alert(a) for a in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get("/{id}", response_model=AlertResponse)
def get_alert(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Alert.transaction).joinedload(Transaction.receiver),
        joinedload(Alert.resolver),
        joinedload(Alert.investigations).joinedload(Investigation.actions),
    )

    if id.isdigit():
        alert = query.filter(Alert.id == int(id)).first()
    else:
        alert = query.filter(Alert.alert_id == id).first()

    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {id} not found")

    return _serialize_alert(alert)


@router.patch("/{id}", response_model=AlertResponse)
def update_alert(
    id: str,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.sender),
        joinedload(Alert.transaction).joinedload(Transaction.receiver),
        joinedload(Alert.investigations).joinedload(Investigation.actions),
    )

    if id.isdigit():
        alert = query.filter(Alert.id == int(id)).first()
    else:
        alert = query.filter(Alert.alert_id == id).first()

    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {id} not found")

    old_status = alert.status.value if hasattr(alert.status, "value") else str(alert.status)
    actor_email = current_user.email
    actor_role = current_user.role.value

    # Parse treatment actions or direct status changes
    action_str = (payload.action or payload.resolution_note or "").lower()
    target_status = payload.status

    if "block" in action_str or (target_status and target_status == AlertStatus.blocked):
        alert.status = AlertStatus.blocked
        if alert.transaction:
            alert.transaction.status = TransactionStatus.blocked
        action_type_enum = ActionType.BLOCKED
    elif "freeze" in action_str or "froze" in action_str or (target_status and target_status == AlertStatus.frozen):
        alert.status = AlertStatus.frozen
        if alert.transaction:
            alert.transaction.status = TransactionStatus.frozen
        action_type_enum = ActionType.FROZE
    elif "monitor" in action_str or (target_status and target_status == AlertStatus.monitoring):
        alert.status = AlertStatus.monitoring
        if alert.transaction:
            alert.transaction.status = TransactionStatus.monitoring
        action_type_enum = ActionType.MONITORED
    elif "whitelist" in action_str or (target_status and target_status == AlertStatus.whitelisted):
        alert.status = AlertStatus.whitelisted
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = current_user.id
        if alert.transaction:
            alert.transaction.status = TransactionStatus.completed
        action_type_enum = ActionType.WHITELISTED
    elif target_status in [AlertStatus.resolved, AlertStatus.dismissed]:
        alert.status = target_status
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = current_user.id
        action_type_enum = ActionType.NOTE_ADDED
    elif target_status:
        alert.status = target_status
        action_type_enum = ActionType.NOTE_ADDED
    else:
        action_type_enum = ActionType.NOTE_ADDED

    if payload.resolution_note:
        alert.resolution_note = payload.resolution_note

    # Ensure linked Investigation case and record treatment action
    inv = alert.investigation
    if not inv:
        count = db.query(Investigation).count()
        case_id = f"CSE-{500001 + count}"
        inv = Investigation(
            case_id=case_id,
            alert_id=alert.alert_id,
            assigned_to=actor_email,
            priority="Critical" if alert.risk_level == "Critical" else "High",
            status=InvestigationStatus.IN_PROGRESS,
            outcome=InvestigationOutcome.CONFIRMED_FRAUD if alert.status in [AlertStatus.blocked, AlertStatus.frozen] else (
                InvestigationOutcome.LEGITIMATE if alert.status in [AlertStatus.whitelisted, AlertStatus.resolved] else InvestigationOutcome.PENDING
            ),
            notes=f"Triage action: {payload.resolution_note or payload.action or alert.status.value}",
        )
        db.add(inv)
        db.flush()

    # Add Investigation Action
    act = InvestigationAction(
        investigation_id=inv.id,
        action_type=action_type_enum,
        actor=actor_email,
        notes=payload.notes or payload.resolution_note or f"Applied treatment: {action_type_enum.value}",
        created_at=datetime.utcnow(),
    )
    db.add(act)

    # Record persistent Audit Trail
    audit = AuditLog(
        actor=actor_email,
        actor_role=actor_role,
        entity_type="Alert",
        entity_id=alert.alert_id,
        action=f"TREATMENT_{action_type_enum.value.upper()}",
        old_value=old_status,
        new_value=alert.status.value if hasattr(alert.status, "value") else str(alert.status),
        extra_metadata={
            "action": action_type_enum.value,
            "resolution_note": payload.resolution_note,
            "notes": payload.notes,
            "transaction_id": alert.transaction.transaction_id if alert.transaction else None,
            "demo_enforcement": "BLOCKED" if alert.status == AlertStatus.blocked else alert.status.value,
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)

    return _serialize_alert(alert)


@router.post("/{id}/treatment", response_model=AlertResponse)
def apply_alert_treatment(
    id: str,
    payload: AlertTreatmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    """
    Dedicated endpoint to execute authorized risk treatment actions:
    - Block Transaction (🚫)
    - Freeze Account (🧊)
    - Enhanced Monitoring (👁️)
    - Whitelist (✅)
    - Escalate to Analyst (👤)
    Persists decision in database, updates alert and transaction status, creates investigation action, and records audit trail.
    """
    return update_alert(
        id=id,
        payload=AlertUpdate(
            action=payload.action,
            notes=payload.notes or payload.reason,
            resolution_note=payload.notes or payload.action,
        ),
        db=db,
        current_user=current_user,
    )
