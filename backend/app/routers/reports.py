"""
FraudX AI — Reports Router
Generates live, traceable analytical reports in PDF, CSV, and structured JSON formats
directly from the active database with strict role-based access control.
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import require_role
from app.services.report_generator import (
    REPORT_TITLES,
    get_live_report_data,
    generate_pdf_report,
    generate_csv_report,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


REPORTS_METADATA = [
    {
        "id": "transaction-summary",
        "title": "Comprehensive Transaction Summary Report",
        "category": "Operational",
        "description": "Consolidated record of all cooperative society transactions, channel breakdowns, volume metrics, and risk tier distribution.",
        "formats_supported": ["pdf", "csv", "json"],
    },
    {
        "id": "fraud-detection",
        "title": "AML & Anomaly Detection Intelligence Report",
        "category": "Compliance",
        "description": "Detailed log of flagged transactions, Isolation Forest risk scores, alert statuses, and IBM AMLSim typologies.",
        "formats_supported": ["pdf", "csv", "json"],
    },
    {
        "id": "risk-assessment",
        "title": "Portfolio Risk Assessment & Exposure Report",
        "category": "Risk",
        "description": "Distribution of account risk tiers, high-risk members, and anomaly category concentration across cooperative accounts.",
        "formats_supported": ["pdf", "csv", "json"],
    },
    {
        "id": "audit-trail",
        "title": "Security & Regulatory Compliance Audit Trail",
        "category": "Governance",
        "description": "Chronological, immutable audit record of all case actions, status changes, risk treatments, and user operations.",
        "formats_supported": ["pdf", "csv", "json"],
    },
    {
        "id": "anomaly-summary",
        "title": "Behavioral Anomaly & Velocity Intelligence Brief",
        "category": "Analytics",
        "description": "Breakdown of rapid fund movements, circular routing patterns, velocity bursts, and amount deviations.",
        "formats_supported": ["pdf", "csv", "json"],
    },
    {
        "id": "executive-summary",
        "title": "Executive Fraud & Risk Briefing",
        "category": "Executive",
        "description": "High-level summary metrics, true detection benchmarks, resolution rates, and governance sign-offs for leadership.",
        "formats_supported": ["pdf", "csv", "json"],
    },
]


@router.get("", response_model=List[Dict[str, Any]])
def list_available_reports(
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    """
    Returns available report types and supported export formats.
    Restricted to Analyst and Organisation roles.
    """
    return REPORTS_METADATA


@router.get("/{report_id}")
def generate_report(
    report_id: str,
    format: str = Query(default="json", description="Export format: 'pdf', 'csv', or 'json'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.analyst, UserRole.organisation])),
):
    """
    Generates human-readable report output (PDF, CSV, or structured JSON)
    computed dynamically from the live database.
    Restricted to Analyst and Organisation roles.
    """
    valid_ids = list(REPORT_TITLES.keys())
    if report_id not in valid_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found. Available reports: {', '.join(valid_ids)}",
        )

    fmt = format.strip().lower()
    now_tag = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    # 1. PDF Generation (Human-Readable Document)
    if fmt == "pdf":
        report_data = get_live_report_data(report_id, db)
        pdf_bytes = generate_pdf_report(report_data)
        filename = f"fraudx_{report_id}_{now_tag}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    # 2. CSV Generation (Structured Tabular Data)
    elif fmt == "csv":
        csv_content = generate_csv_report(report_id, db)
        filename = f"fraudx_{report_id}_{now_tag}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )

    # 3. JSON Generation (Structured API / Verification Data)
    else:
        return get_live_report_data(report_id, db)
