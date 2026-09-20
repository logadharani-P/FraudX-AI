"""
FraudX AI — Audit Trail Router
Provides immutable chronological history of all security and workflow events
with strict role-based access control.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.services.auth_service import require_role

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = None,
    actor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    query = db.query(AuditLog)

    if entity_type and entity_type != "All":
        query = query.filter(AuditLog.entity_type.ilike(entity_type))

    if actor:
        query = query.filter(AuditLog.actor.ilike(f"%{actor.strip()}%"))

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )

