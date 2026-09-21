"""
FraudX AI — Pydantic Schemas for Audit Logs
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    actor: str
    actor_role: Optional[str] = None
    entity_type: str
    entity_id: str
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    extra_metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    pages: int
    limit: int
