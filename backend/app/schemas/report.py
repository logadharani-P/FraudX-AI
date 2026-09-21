"""
FraudX AI — Pydantic Schemas for Reports and Exports
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ReportSummary(BaseModel):
    report_id: str
    title: str
    category: str
    description: str
    generated_at: datetime
    data: Dict[str, Any]
    download_url: str
