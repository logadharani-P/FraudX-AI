"""
FraudX AI — Human-Readable Report Generator
Generates live, traceable analytical reports in PDF, CSV, and JSON formats
directly from the live SQLite database without static mock numbers.
"""
import io
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        KeepTogether,
        HRFlowable,
    )
except ImportError:
    letter, A4 = None, None
    colors = None
    getSampleStyleSheet, ParagraphStyle = None, None
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable = None, None, None, None, None, None, None

from app.models.transaction import Transaction, RiskLevel
from app.models.alert import Alert, AlertStatus
from app.models.member import Member
from app.models.investigation import Investigation
from app.models.audit_log import AuditLog


REPORT_TITLES = {
    "transaction-summary": "Comprehensive Transaction Summary Report",
    "fraud-detection": "AML & Anomaly Detection Intelligence Report",
    "risk-assessment": "Portfolio Risk Assessment & Exposure Report",
    "audit-trail": "Security & Regulatory Compliance Audit Trail",
    "anomaly-summary": "Behavioral Anomaly & Velocity Intelligence Brief",
    "executive-summary": "Executive Fraud & Risk Briefing",
}


def get_live_report_data(report_id: str, db: Session) -> Dict[str, Any]:
    """
    Extracts 100% live metrics directly from the active database for full traceability.
    """
    now = datetime.utcnow()
    gen_time_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    # 1. Live Transaction Metrics
    total_txns = db.query(func.count(Transaction.id)).scalar() or 0
    total_amt = db.query(func.sum(Transaction.amount)).scalar() or 0.0
    avg_amt = db.query(func.avg(Transaction.amount)).scalar() or 0.0
    max_amt = db.query(func.max(Transaction.amount)).scalar() or 0.0

    min_time = db.query(func.min(Transaction.timestamp)).scalar()
    max_time = db.query(func.max(Transaction.timestamp)).scalar()
    min_str = min_time.strftime("%Y-%m-%d") if hasattr(min_time, "strftime") else (str(min_time)[:10] if min_time else "Live")
    max_str = max_time.strftime("%Y-%m-%d") if hasattr(max_time, "strftime") else (str(max_time)[:10] if max_time else "Present")
    data_period = f"{min_str} to {max_str}"

    # 2. Risk Distribution Counts
    low_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.low).scalar() or 0
    med_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.medium).scalar() or 0
    high_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.high).scalar() or 0
    crit_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.critical).scalar() or 0

    low_pct = round((low_count / total_txns * 100), 2) if total_txns > 0 else 0.0
    med_pct = round((med_count / total_txns * 100), 2) if total_txns > 0 else 0.0
    high_pct = round((high_count / total_txns * 100), 2) if total_txns > 0 else 0.0
    crit_pct = round((crit_count / total_txns * 100), 2) if total_txns > 0 else 0.0

    # 3. Live Alert Status Breakdown
    total_alerts = db.query(func.count(Alert.id)).scalar() or 0
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.open).scalar() or 0
    investigating_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.investigating).scalar() or 0
    blocked_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.blocked).scalar() or 0
    frozen_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.frozen).scalar() or 0
    monitoring_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.monitoring).scalar() or 0
    whitelisted_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.whitelisted).scalar() or 0
    resolved_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.resolved).scalar() or 0
    dismissed_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.dismissed).scalar() or 0

    resolved_total = blocked_alerts + frozen_alerts + monitoring_alerts + whitelisted_alerts + resolved_alerts + dismissed_alerts
    resolution_rate = round((resolved_total / total_alerts * 100), 1) if total_alerts > 0 else 0.0

    # 4. Live Investigations & Audit Events
    total_cases = db.query(func.count(Investigation.id)).scalar() or 0
    open_cases = db.query(func.count(Investigation.id)).filter(Investigation.status == "Open").scalar() or 0
    total_audits = db.query(func.count(AuditLog.id)).scalar() or 0

    # 5. Top Flagged Alerts with Context
    top_alerts_query = (
        db.query(Alert)
        .order_by(desc(Alert.risk_score), desc(Alert.created_at))
        .limit(15)
        .all()
    )

    top_alerts_list = []
    for a in top_alerts_query:
        txn = a.transaction
        sender_name = txn.sender.name if (txn and txn.sender) else "Unknown Member"
        sender_mid = txn.sender.member_id if (txn and txn.sender) else (f"MBR-{txn.sender_id:06d}" if (txn and txn.sender_id) else "N/A")
        cat_str = a.category.value if hasattr(a.category, "value") else str(a.category)
        top_alerts_list.append({
            "alert_id": a.alert_id,
            "transaction_ref": txn.transaction_id if txn else f"TXN-{a.transaction_id}",
            "member_id": sender_mid,
            "member_name": sender_name,
            "amount": txn.amount if txn else 0.0,
            "amount_formatted": f"₹{txn.amount:,.2f}" if txn else "₹0.00",
            "risk_score": round(float(a.risk_score), 1),
            "risk_level": a.risk_level.title() if hasattr(a.risk_level, "title") else str(a.risk_level),
            "status": a.status.value.title() if hasattr(a.status, "value") else str(a.status),
            "detection_reason": a.reason or "Machine learning anomaly detection",
            "typology": getattr(a, "typology", None) or cat_str or "Behavioral Anomaly",
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if hasattr(a.created_at, "strftime") else str(a.created_at)[:16],
        })

    title = REPORT_TITLES.get(report_id, f"FraudX Intelligence Report ({report_id})")

    return {
        "report_id": report_id,
        "title": title,
        "generated_at": gen_time_str,
        "data_period": data_period,
        "traceability": {
            "source": "FraudX Live SQLite Database (app.db)",
            "methodology": "NumPy Isolation Forest Anomaly Detection + NetworkX Graph Analysis + IBM AMLSim Benchmarking",
            "transactions_analyzed": total_txns,
            "alerts_evaluated": total_alerts,
            "investigation_cases": total_cases,
            "audit_trail_events": total_audits,
            "generated_timestamp": gen_time_str,
        },
        "executive_summary": (
            f"During the audit period ({data_period}), FraudX AI evaluated {total_txns:,} cooperative society transactions "
            f"totaling ₹{total_amt:,.2f}. The AI scoring engine identified {crit_count + high_count} elevated risk transactions "
            f"({crit_count} Critical, {high_count} High), resulting in {total_alerts} structured fraud alerts. "
            f"Compliance analysts and automated triage workflows have addressed {resolved_total} alerts ({resolution_rate}% treatment rate)."
        ),
        "transaction_metrics": {
            "total_transactions": total_txns,
            "total_volume_inr": round(float(total_amt), 2),
            "total_volume_formatted": f"₹{total_amt:,.2f}",
            "average_amount_inr": round(float(avg_amt), 2),
            "average_amount_formatted": f"₹{avg_amt:,.2f}",
            "max_amount_inr": round(float(max_amt), 2),
            "max_amount_formatted": f"₹{max_amt:,.2f}",
        },
        "risk_distribution": {
            "low": {"count": low_count, "percentage": low_pct},
            "medium": {"count": med_count, "percentage": med_pct},
            "high": {"count": high_count, "percentage": high_pct},
            "critical": {"count": crit_count, "percentage": crit_pct},
        },
        "alert_metrics": {
            "total_alerts": total_alerts,
            "open": open_alerts,
            "investigating": investigating_alerts,
            "blocked": blocked_alerts,
            "frozen": frozen_alerts,
            "monitoring": monitoring_alerts,
            "whitelisted": whitelisted_alerts,
            "resolved": resolved_alerts,
            "dismissed": dismissed_alerts,
            "total_treated": resolved_total,
            "resolution_rate_percentage": resolution_rate,
        },
        "top_alerts": top_alerts_list,
        "investigation_metrics": {
            "total_cases": total_cases,
            "open_cases": open_cases,
            "total_audit_records": total_audits,
        },
    }


def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """
    Renders a multi-page, formatted PDF document using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_title_style = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )
    brand_sub_style = ParagraphStyle(
        "BrandSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#64748b"),
    )
    section_h1 = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_text = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    small_text = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b"),
    )
    callout_text = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    badge_crit = ParagraphStyle(
        "BadgeCrit",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#dc2626"),
    )
    badge_high = ParagraphStyle(
        "BadgeHigh",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#ea580c"),
    )

    story = []

    # ── 1. Document Header ──
    header_data = [
        [
            Paragraph("🛡️ <b>FraudX AI</b> — Cooperative Banking Compliance", brand_title_style),
            Paragraph(f"<b>Date:</b> {report_data['generated_at'][:10]}<br/><b>Ref:</b> {report_data['report_id'].upper()}", brand_sub_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 160])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#cbd5e1"), spaceBefore=2, spaceAfter=8))

    # Title & Data Period
    story.append(Paragraph(f"<b>{report_data['title']}</b>", brand_title_style))
    story.append(Paragraph(f"<b>Analysis Window:</b> {report_data['data_period']} &nbsp;|&nbsp; <b>Live Data Source:</b> {report_data['traceability']['source']}", brand_sub_style))
    story.append(Spacer(1, 10))

    # ── 2. Executive Summary Callout Box ──
    exec_content = [
        [Paragraph(f"<b>Executive Summary & Overview:</b><br/>{report_data['executive_summary']}", callout_text)]
    ]
    exec_table = Table(exec_content, colWidths=[520])
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 12))

    # ── 3. High-Level KPI Summary Metrics ──
    tx_m = report_data["transaction_metrics"]
    al_m = report_data["alert_metrics"]
    kpi_data = [
        [
            Paragraph("<b>Total Transactions</b>", table_cell_bold),
            Paragraph("<b>Total Volume (INR)</b>", table_cell_bold),
            Paragraph("<b>Total Alerts</b>", table_cell_bold),
            Paragraph("<b>Resolution Rate</b>", table_cell_bold),
        ],
        [
            Paragraph(f"<font size=11 color='#0284c7'><b>{tx_m['total_transactions']:,}</b></font>", table_cell),
            Paragraph(f"<font size=11 color='#0f172a'><b>{tx_m['total_volume_formatted']}</b></font>", table_cell),
            Paragraph(f"<font size=11 color='#dc2626'><b>{al_m['total_alerts']}</b></font>", table_cell),
            Paragraph(f"<font size=11 color='#16a34a'><b>{al_m['resolution_rate_percentage']}%</b></font>", table_cell),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[130, 140, 120, 130])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#ffffff")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # ── 4. Risk Tier Distribution ──
    story.append(Paragraph("1. Transaction Risk Distribution", section_h1))
    rd = report_data["risk_distribution"]
    risk_table_data = [
        [
            Paragraph("<b>Risk Tier</b>", table_cell_bold),
            Paragraph("<b>Score Range</b>", table_cell_bold),
            Paragraph("<b>Transaction Count</b>", table_cell_bold),
            Paragraph("<b>Percentage of Portfolio</b>", table_cell_bold),
            Paragraph("<b>Status / Treatment Action</b>", table_cell_bold),
        ],
        [
            Paragraph("<font color='#16a34a'><b>Low Risk</b></font>", table_cell),
            Paragraph("0 – 34", table_cell),
            Paragraph(f"{rd['low']['count']:,}", table_cell),
            Paragraph(f"{rd['low']['percentage']}%", table_cell),
            Paragraph("Standard automated processing", table_cell),
        ],
        [
            Paragraph("<font color='#ca8a04'><b>Medium Risk</b></font>", table_cell),
            Paragraph("35 – 59", table_cell),
            Paragraph(f"{rd['medium']['count']:,}", table_cell),
            Paragraph(f"{rd['medium']['percentage']}%", table_cell),
            Paragraph("Automated monitoring baseline", table_cell),
        ],
        [
            Paragraph("<font color='#ea580c'><b>High Risk</b></font>", table_cell),
            Paragraph("60 – 79", table_cell),
            Paragraph(f"{rd['high']['count']:,}", table_cell),
            Paragraph(f"{rd['high']['percentage']}%", table_cell),
            Paragraph("Analyst queue / Enhanced monitoring", table_cell),
        ],
        [
            Paragraph("<font color='#dc2626'><b>Critical Risk</b></font>", table_cell),
            Paragraph("80 – 100", table_cell),
            Paragraph(f"{rd['critical']['count']:,}", table_cell),
            Paragraph(f"{rd['critical']['percentage']}%", table_cell),
            Paragraph("Priority triage / Provisional hold", table_cell),
        ],
    ]
    risk_table = Table(risk_table_data, colWidths=[100, 80, 110, 110, 120])
    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 12))

    # ── 5. Alert Status & Treatment Breakdown ──
    story.append(Paragraph("2. Alert Status & Resolution Tracking", section_h1))
    alert_status_data = [
        [
            Paragraph("<b>Alert Status</b>", table_cell_bold),
            Paragraph("<b>Count</b>", table_cell_bold),
            Paragraph("<b>Category Description</b>", table_cell_bold),
            Paragraph("<b>Compliance Handling</b>", table_cell_bold),
        ],
        [
            Paragraph("<font color='#ef4444'><b>Open</b></font>", table_cell),
            Paragraph(str(al_m["open"]), table_cell_bold),
            Paragraph("New AI anomaly alerts awaiting triage", table_cell),
            Paragraph("Pending initial analyst review", table_cell),
        ],
        [
            Paragraph("<font color='#f59e0b'><b>Investigating</b></font>", table_cell),
            Paragraph(str(al_m["investigating"]), table_cell_bold),
            Paragraph("Active formal investigation cases", table_cell),
            Paragraph("Under evidence collection & KYC check", table_cell),
        ],
        [
            Paragraph("<font color='#b91c1c'><b>Blocked</b></font>", table_cell),
            Paragraph(str(al_m["blocked"]), table_cell_bold),
            Paragraph("Provisional hold executed on transaction", table_cell),
            Paragraph("Outward transfer denied & logged", table_cell),
        ],
        [
            Paragraph("<font color='#6366f1'><b>Frozen</b></font>", table_cell),
            Paragraph(str(al_m["frozen"]), table_cell_bold),
            Paragraph("Member account debit freeze enforced", table_cell),
            Paragraph("Account suspended pending verification", table_cell),
        ],
        [
            Paragraph("<font color='#0284c7'><b>Monitoring</b></font>", table_cell),
            Paragraph(str(al_m["monitoring"]), table_cell_bold),
            Paragraph("Enhanced 30-day velocity monitoring active", table_cell),
            Paragraph("Automated alerts on subsequent debits", table_cell),
        ],
        [
            Paragraph("<font color='#16a34a'><b>Whitelisted / Resolved</b></font>", table_cell),
            Paragraph(str(al_m["whitelisted"] + al_m["resolved"] + al_m["dismissed"]), table_cell_bold),
            Paragraph("Legitimate agricultural/member transactions verified", table_cell),
            Paragraph("Investigation closed with audit notes", table_cell),
        ],
    ]
    alert_status_table = Table(alert_status_data, colWidths=[120, 60, 180, 160])
    alert_status_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(alert_status_table)
    story.append(Spacer(1, 12))

    # ── 6. Important Flagged & Critical Alerts Table ──
    story.append(Paragraph("3. Key High & Critical Risk Transactions", section_h1))
    top_alerts = report_data.get("top_alerts", [])
    if top_alerts:
        flagged_data = [
            [
                Paragraph("<b>Alert / Txn</b>", table_cell_bold),
                Paragraph("<b>Member</b>", table_cell_bold),
                Paragraph("<b>Amount</b>", table_cell_bold),
                Paragraph("<b>Score</b>", table_cell_bold),
                Paragraph("<b>Status</b>", table_cell_bold),
                Paragraph("<b>Detection Reason / Typology</b>", table_cell_bold),
            ]
        ]
        for a in top_alerts[:8]:  # Top 8 fit neatly on PDF
            score_badge = badge_crit if a["risk_score"] >= 80.0 else badge_high
            flagged_data.append([
                Paragraph(f"<b>{a['alert_id']}</b><br/>{a['transaction_ref']}", table_cell),
                Paragraph(f"<b>{a['member_name']}</b><br/>{a['member_id']}", table_cell),
                Paragraph(a["amount_formatted"], table_cell),
                Paragraph(f"<b>{a['risk_score']}</b>", score_badge),
                Paragraph(f"<b>{a['status']}</b>", table_cell),
                Paragraph(f"{a['detection_reason']}", table_cell),
            ])
        flagged_table = Table(flagged_data, colWidths=[80, 100, 75, 45, 65, 155])
        flagged_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(flagged_table)
    else:
        story.append(Paragraph("No critical alerts recorded during this period.", body_text))

    story.append(Spacer(1, 14))

    # ── 7. Data Traceability & Governance Sign-off ──
    trace = report_data["traceability"]
    trace_data = [
        [
            Paragraph(
                f"<b>System Traceability:</b> Source: <code>{trace['source']}</code> | Methodology: {trace['methodology']} | "
                f"Evaluated Transactions: {trace['transactions_analyzed']} | Evaluated Alerts: {trace['alerts_evaluated']}<br/>"
                f"<i>Generated on {trace['generated_timestamp']}. Human analyst review is required for regulatory filing and definitive determinations.</i>",
                small_text,
            )
        ]
    ]
    trace_table = Table(trace_data, colWidths=[520])
    trace_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(trace_table)

    # Build PDF
    doc.build(story)
    return buffer.getvalue()


def generate_csv_report(report_id: str, db: Session) -> str:
    """
    Generates a structured, traceable CSV file based on the report type.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    if report_id == "transaction-summary":
        writer.writerow(["# FRAUDX AI — COMPREHENSIVE TRANSACTION SUMMARY REPORT"])
        writer.writerow(["# Generated At:", now_str])
        writer.writerow(["# Source:", "FraudX Live SQLite Database (app.db)"])
        writer.writerow([])
        writer.writerow([
            "Transaction ID",
            "Member ID",
            "Sender Name",
            "Receiver Name",
            "Amount (INR)",
            "Transaction Type",
            "Channel",
            "City",
            "State",
            "Risk Score",
            "Risk Level",
            "Status",
            "Timestamp",
        ])
        txns = db.query(Transaction).order_by(Transaction.timestamp.desc()).all()
        for t in txns:
            sender_mid = t.sender.member_id if t.sender else ""
            sender_name = t.sender.name if t.sender else ""
            recv_name = t.receiver.name if t.receiver else ""
            writer.writerow([
                t.transaction_id,
                sender_mid,
                sender_name,
                recv_name,
                t.amount,
                t.transaction_type,
                t.device or t.transaction_type or "UPI",
                t.location_city or "",
                t.location_state or "",
                t.risk_score,
                t.risk_level.value if t.risk_level else "",
                t.status,
                t.timestamp,
            ])

    elif report_id in ["fraud-detection", "anomaly-summary"]:
        writer.writerow(["# FRAUDX AI — AML & ANOMALY DETECTION REPORT"])
        writer.writerow(["# Generated At:", now_str])
        writer.writerow(["# Source:", "FraudX Live SQLite Database (app.db)"])
        writer.writerow([])
        writer.writerow([
            "Alert ID",
            "Transaction Ref",
            "Member ID",
            "Member Name",
            "Amount (INR)",
            "Category",
            "Risk Level",
            "Risk Score",
            "Status",
            "Detection Reason",
            "Typology",
            "Created At",
        ])
        alerts = db.query(Alert).order_by(Alert.risk_score.desc()).all()
        for a in alerts:
            txn = a.transaction
            m_id = txn.sender.member_id if (txn and txn.sender) else (f"MBR-{txn.sender_id:06d}" if (txn and txn.sender_id) else "")
            m_name = txn.sender.name if (txn and txn.sender) else ""
            amt = txn.amount if txn else 0.0
            t_ref = txn.transaction_id if txn else f"TXN-{a.transaction_id}"
            cat_val = a.category.value if hasattr(a.category, "value") else str(a.category)
            writer.writerow([
                a.alert_id,
                t_ref,
                m_id,
                m_name,
                amt,
                cat_val,
                a.risk_level,
                a.risk_score,
                a.status.value if hasattr(a.status, "value") else str(a.status),
                a.reason,
                getattr(a, "typology", None) or cat_val or "Behavioral Anomaly",
                a.created_at,
            ])

    elif report_id == "audit-trail":
        writer.writerow(["# FRAUDX AI — REGULATORY AUDIT TRAIL"])
        writer.writerow(["# Generated At:", now_str])
        writer.writerow(["# Source:", "FraudX Live SQLite Database (app.db)"])
        writer.writerow([])
        writer.writerow([
            "Log ID",
            "Actor",
            "Role",
            "Entity Type",
            "Entity ID",
            "Action",
            "Old Value",
            "New Value",
            "Timestamp",
        ])
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
        for l in logs:
            writer.writerow([
                l.id,
                l.actor,
                l.actor_role,
                l.entity_type,
                l.entity_id,
                l.action,
                l.old_value,
                l.new_value,
                l.created_at,
            ])

    else:
        # Generic executive/risk assessment CSV
        writer.writerow(["# FRAUDX AI — PORTFOLIO RISK & COMPLIANCE SUMMARY"])
        writer.writerow(["# Generated At:", now_str])
        writer.writerow(["# Source:", "FraudX Live SQLite Database (app.db)"])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        total_txns = db.query(func.count(Transaction.id)).scalar() or 0
        total_amt = db.query(func.sum(Transaction.amount)).scalar() or 0.0
        total_alerts = db.query(func.count(Alert.id)).scalar() or 0
        crit_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.critical).scalar() or 0
        high_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.high).scalar() or 0
        med_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.medium).scalar() or 0
        low_count = db.query(func.count(Transaction.id)).filter(Transaction.risk_level == RiskLevel.low).scalar() or 0

        writer.writerow(["Total Transactions", total_txns])
        writer.writerow(["Total Volume (INR)", total_amt])
        writer.writerow(["Total Alerts", total_alerts])
        writer.writerow(["Critical Risk Transactions", crit_count])
        writer.writerow(["High Risk Transactions", high_count])
        writer.writerow(["Medium Risk Transactions", med_count])
        writer.writerow(["Low Risk Transactions", low_count])

    return output.getvalue()
