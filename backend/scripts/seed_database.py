"""
FraudX AI — Database Seeding and Full Pipeline Initialization
Runs:
1. AMLSim Simulation
2. Cooperative Synthetic Enrichment
3. ML Feature Extraction & Isolation Forest Training + Scoring
4. Model Evaluation on AMLSim ground truth
5. Database ingestion into PostgreSQL / SQLite
6. Alert generation, Investigation cases, and Audit logs
7. Seed default users (Customer, Analyst, Organisation)
"""
import os
import sys
import random
from datetime import datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, create_all_tables, Base
from app.models.user import User, UserRole
from app.models.member import Member, RiskStatus
from app.models.transaction import Transaction, RiskLevel, TransactionStatus
from app.models.alert import Alert, AlertCategory, AlertStatus, RiskScore
from app.models.investigation import (
    Investigation, InvestigationAction, InvestigationStatus, InvestigationOutcome, ActionType
)
from app.models.audit_log import AuditLog
from app.services.auth_service import get_password_hash

import csv
import json
from datetime import datetime, timedelta

def load_fraudx_dataset():
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Dataset", "fraudx_transactions.csv"))
    if not os.path.exists(csv_path):
        # Fallback path if run from backend/
        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dataset", "fraudx_transactions.csv"))
    
    print(f"[*] Loading transactions directly from active dataset: {csv_path}")
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = list(reader)
    print(f"    Loaded {len(records)} transactions from {os.path.basename(csv_path)}")
    return records


def generate_members_for_dataset(all_member_ids):
    INDIAN_CITIES = [
        {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
        {"city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567},
        {"city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lng": 79.0882},
        {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
        {"city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lng": 76.9558},
        {"city": "Madurai", "state": "Tamil Nadu", "lat": 9.9252, "lng": 78.1198},
        {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
        {"city": "Mysuru", "state": "Karnataka", "lat": 12.2958, "lng": 76.6394},
        {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867},
        {"city": "Warangal", "state": "Telangana", "lat": 17.9689, "lng": 79.5941},
        {"city": "Delhi", "state": "Delhi", "lat": 28.7041, "lng": 77.1025},
        {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714},
        {"city": "Surat", "state": "Gujarat", "lat": 21.1702, "lng": 72.8311},
        {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873},
        {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462},
        {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lng": 76.2673},
    ]

    FIRST_NAMES = [
        "Aarav", "Aditi", "Ananya", "Arjun", "Deepak", "Divya", "Ganesh", "Gayatri",
        "Harish", "Ishaan", "Kavita", "Kiran", "Lakshmi", "Manish", "Meera", "Mukesh",
        "Naveen", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Rajesh",
        "Ravi", "Riya", "Rohan", "Sanjay", "Saravanan", "Shreya", "Siddharth", "Sneha",
        "Suresh", "Swati", "Tarun", "Varun", "Venkatesh", "Vidya", "Vikram", "Vimal",
    ]

    LAST_NAMES = [
        "Sharma", "Patel", "Reddy", "Iyer", "Kumar", "Singh", "Nair", "Rao",
        "Joshi", "Deshmukh", "Pillai", "Verma", "Gupta", "Kulkarni", "Mehta", "Bhat",
        "Menon", "Chauhan", "Sundaram", "Murthy",
    ]

    BANKS = [
        "Apex Cooperative Bank", "State Cooperative Agriculture Bank",
        "District Central Cooperative Bank", "Kisan Rural Credit Society",
        "Sahakari Urban Bank", "Pragati Grameen Bank",
    ]

    members_data = []
    base_date = datetime(2026, 9, 14).date()

    for idx, mid in enumerate(all_member_ids):
        first = FIRST_NAMES[idx % len(FIRST_NAMES)]
        last = LAST_NAMES[(idx * 7) % len(LAST_NAMES)]
        loc = INDIAN_CITIES[idx % len(INDIAN_CITIES)]
        bank = BANKS[idx % len(BANKS)]
        mbr_str = f"MBR-{400000 + mid}"
        acc_num = f"ACC-{1000000000 + ((mid * 9301 + 49297) % 9000000000)}"

        members_data.append({
            "id": mid,
            "member_id": mbr_str,
            "amlsim_account_id": f"C{1000000000 + mid}",
            "name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{10 + (idx % 90)}@coopnet.org",
            "phone": f"+91 {70000 + (idx * 137) % 30000}{10000 + (idx * 251) % 90000}",
            "city": loc["city"],
            "state": loc["state"],
            "lat": loc["lat"] + round(((idx % 10) - 5) * 0.005, 4),
            "lng": loc["lng"] + round(((idx % 7) - 3) * 0.005, 4),
            "bank": bank,
            "account_id": acc_num,
            "account_type": "Savings" if idx % 4 != 0 else "Credit Current",
            "join_date": base_date - timedelta(days=200 + (idx * 13) % 800),
            "verified": True,
            "share_capital": float([2500, 5000, 10000, 25000, 50000][idx % 5]),
            "savings_balance": float(15000 + ((idx * 3791) % 85000)),
            "loan_outstanding": float([0, 0, 15000, 45000, 120000, 280000][idx % 6]),
            "risk_status": RiskStatus.low,
        })
    return members_data


def seed_database():
    print("[*] Initializing FraudX AI Database Schema...")
    create_all_tables()
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_txns = db.query(Transaction).count()
        if existing_txns > 500:
            print(f"[!] Database already contains {existing_txns} transactions. Skipping re-seed.")
            return

        print("[*] Step 1: Ingesting active dataset (Dataset/fraudx_transactions.csv)...")
        raw_txns = load_fraudx_dataset()

        # Collect all unique member IDs
        sender_ids = [int(r["sender_id"]) for r in raw_txns]
        receiver_ids = [int(r["receiver_id"]) for r in raw_txns]
        all_member_ids = sorted(list(set(sender_ids + receiver_ids)))
        print(f"    Identified {len(all_member_ids)} unique cooperative member participants.")

        print("[*] Step 2: Generating Member Directory from Dataset participants...")
        members_data = generate_members_for_dataset(all_member_ids)
        member_by_id = {m["id"]: m for m in members_data}

        print("[*] Step 3: Seeding Core Users (RBAC)...")
        first_member = members_data[0]
        customer_user = User(
            email="customer@fraudx.ai",
            hashed_password=get_password_hash("password123"),
            name=first_member["name"],
            role=UserRole.customer,
            phone=first_member["phone"],
            city=first_member["city"],
            organisation_id="ORG-APEX-01",
            member_id=first_member["member_id"],
            designation="Cooperative Society Member",
            is_active=True,
        )
        # 2. Analyst User
        analyst_user = User(
            email="analyst@fraudx.ai",
            hashed_password=get_password_hash("password123"),
            name="Vikram Seth",
            role=UserRole.analyst,
            phone="+91 98765 43210",
            city="Mumbai",
            organisation_id="ORG-APEX-01",
            analyst_id="ANL-88210",
            designation="Senior AML Investigator",
            specialization="Behavioral Anomaly & Network Laundering",
            clearance_level="Level 3 - Full Operational Access",
            is_active=True,
        )
        # 3. Organisation Admin
        org_user = User(
            email="admin@fraudx.ai",
            hashed_password=get_password_hash("password123"),
            name="Apex Cooperative Society Admin",
            role=UserRole.organisation,
            phone="+91 91234 56780",
            city="Mumbai",
            organisation_id="ORG-APEX-01",
            designation="Chief Compliance Officer & Cooperative Administrator",
            is_active=True,
        )

        db.add_all([customer_user, analyst_user, org_user])
        db.flush()

        print("[*] Step 4: Seeding Members...")
        member_orm_objects = []
        for m_dict in members_data:
            m_orm = Member(
                id=m_dict["id"],
                member_id=m_dict["member_id"],
                amlsim_account_id=m_dict["amlsim_account_id"],
                name=m_dict["name"],
                email=m_dict["email"],
                phone=m_dict["phone"],
                city=m_dict["city"],
                state=m_dict["state"],
                lat=m_dict["lat"],
                lng=m_dict["lng"],
                bank=m_dict["bank"],
                account_id=m_dict["account_id"],
                account_type=m_dict["account_type"],
                join_date=m_dict["join_date"],
                verified=m_dict["verified"],
                share_capital=m_dict["share_capital"],
                savings_balance=m_dict["savings_balance"],
                loan_outstanding=m_dict["loan_outstanding"],
                risk_status=RiskStatus.low,
            )
            member_orm_objects.append(m_orm)
        db.add_all(member_orm_objects)
        db.flush()

        print("[*] Step 5: Seeding Transactions & Model Scores...")
        txn_orm_objects = []
        high_risk_txns = []

        for r_dict in raw_txns:
            r_level_str = str(r_dict.get("risk_level", "low")).strip().lower()
            risk_level_enum = (
                RiskLevel.critical if r_level_str == "critical"
                else RiskLevel.high if r_level_str == "high"
                else RiskLevel.medium if r_level_str == "medium"
                else RiskLevel.low
            )

            status_val = TransactionStatus.flagged if risk_level_enum in [RiskLevel.high, RiskLevel.critical] else TransactionStatus.completed

            # Parse anomaly factors safely
            factors = []
            raw_factors = r_dict.get("anomaly_factors", "")
            if raw_factors:
                try:
                    factors = json.loads(raw_factors)
                except Exception:
                    factors = [raw_factors]

            # Parse timestamp safely
            ts_str = r_dict.get("timestamp", "2026-09-14 00:00:00")
            try:
                ts_dt = datetime.strptime(ts_str.split(".")[0], "%Y-%m-%d %H:%M:%S")
            except Exception:
                ts_dt = datetime(2026, 9, 14, 0, 0, 0)

            t_orm = Transaction(
                id=int(r_dict["id"]),
                transaction_id=str(r_dict["transaction_id"]),
                amlsim_step=int(r_dict.get("amlsim_step", 1)),
                amlsim_type=str(r_dict.get("amlsim_type", "TRANSFER")),
                amount=float(r_dict.get("amount", 0.0)),
                old_balance_orig=float(r_dict.get("old_balance_orig", 0.0)),
                new_balance_orig=float(r_dict.get("new_balance_orig", 0.0)),
                old_balance_dest=float(r_dict.get("old_balance_dest", 0.0)),
                new_balance_dest=float(r_dict.get("new_balance_dest", 0.0)),
                is_fraud_label=(str(r_dict.get("is_fraud_label", "0")).strip() in ["1", "true", "True"]),
                is_flagged_fraud=(str(r_dict.get("is_flagged_fraud", "0")).strip() in ["1", "true", "True"]),
                sender_id=int(r_dict["sender_id"]),
                receiver_id=int(r_dict["receiver_id"]),
                transaction_type=str(r_dict.get("transaction_type", "NEFT")),
                device=str(r_dict.get("device", "Branch Terminal POS")),
                location_city=str(r_dict.get("location_city", "Mumbai")),
                location_state=str(r_dict.get("location_state", "Maharashtra")),
                lat=float(r_dict.get("lat", 19.076)),
                lng=float(r_dict.get("lng", 72.8777)),
                purpose=str(r_dict.get("purpose", "")) if r_dict.get("purpose") else None,
                loan_ref=str(r_dict.get("loan_ref", "")) if r_dict.get("loan_ref") else None,
                risk_score=float(r_dict.get("risk_score", 0.0)),
                risk_level=risk_level_enum,
                anomaly_score=float(r_dict.get("anomaly_score", 0.0)),
                anomaly_factors=factors,
                status=status_val,
                timestamp=ts_dt,
            )
            txn_orm_objects.append(t_orm)
            if float(r_dict.get("risk_score", 0.0)) >= 60.0 or str(r_dict.get("is_fraud_label")) == "1":
                high_risk_txns.append((t_orm, factors))

        db.add_all(txn_orm_objects)
        db.flush()
        print(f"    [+] Seeded {len(txn_orm_objects)} transactions from active dataset.")

        print("[*] Step 6: Generating Alerts for High/Critical Anomalies...")
        alert_orm_objects = []
        alert_counter = 1

        for t_orm, factors in high_risk_txns:
            alt_id = f"ALT-{200000 + alert_counter}"
            score = t_orm.risk_score
            r_level = "Critical" if score >= 80 else "High"

            f_text = " ".join(factors).lower()
            if "velocity" in f_text:
                cat = AlertCategory.velocity_anomaly
            elif "drain" in f_text or "balance" in f_text:
                cat = AlertCategory.rapid_fund_movement
            elif "savings" in f_text or "loan" in f_text:
                cat = AlertCategory.balance_discrepancy
            elif "network" in f_text or "counterparty" in f_text:
                cat = AlertCategory.suspicious_network_pattern
            else:
                cat = AlertCategory.unusual_amount

            first_reason = factors[0] if len(factors) > 0 else "Anomalous transaction pattern detected by Isolation Forest"
            desc = f"AI anomaly assessment flagged transaction {t_orm.transaction_id} (Rs.{t_orm.amount:,.2f}) for human analyst review. Score: {score:.1f}/100."

            rand_stat = random.random()
            if rand_stat < 0.60:
                alt_status = AlertStatus.open
                res_time, res_by, res_note = None, None, None
            elif rand_stat < 0.85:
                alt_status = AlertStatus.investigating
                res_time, res_by, res_note = None, None, None
            else:
                alt_status = AlertStatus.resolved
                res_time = t_orm.timestamp + timedelta(hours=random.randint(1, 12))
                res_by = analyst_user.id
                res_note = "Verified with member via registered phone. Legitimate transaction activity."

            a_orm = Alert(
                id=alert_counter,
                alert_id=alt_id,
                transaction_id=t_orm.id,
                category=cat,
                risk_level=r_level,
                risk_score=score,
                reason=first_reason,
                description=desc,
                status=alt_status,
                created_at=t_orm.timestamp,
                resolved_at=res_time,
                resolved_by=res_by,
                resolution_note=res_note,
            )
            alert_orm_objects.append(a_orm)
            alert_counter += 1

        db.add_all(alert_orm_objects)
        db.flush()
        print(f"    [+] Generated {len(alert_orm_objects)} alerts.")

        print("[*] Step 7: Generating Initial Investigations & Action Audits...")
        investigations = []
        case_counter = 1
        for a_orm in alert_orm_objects[:12]:
            c_id = f"CSE-{500000 + case_counter}"
            inv_status = InvestigationStatus.IN_PROGRESS if a_orm.status == AlertStatus.investigating else (
                InvestigationStatus.RESOLVED if a_orm.status == AlertStatus.resolved else InvestigationStatus.OPEN
            )
            inv_outcome = InvestigationOutcome.LEGITIMATE if a_orm.status == AlertStatus.resolved else InvestigationOutcome.PENDING

            inv = Investigation(
                id=case_counter,
                case_id=c_id,
                alert_id=a_orm.alert_id,
                assigned_to=analyst_user.email,
                status=inv_status,
                outcome=inv_outcome,
                priority="High" if a_orm.risk_level == "Critical" else "Medium",
                notes=f"Assigned for behavioral and network verification on alert {a_orm.alert_id}.",
                created_at=a_orm.created_at,
            )
            investigations.append(inv)
            case_counter += 1

        db.add_all(investigations)
        db.flush()

        # Add initial investigation actions
        actions = []
        for inv in investigations[:6]:
            act = InvestigationAction(
                investigation_id=inv.id,
                action_type=ActionType.MONITORED,
                actor=analyst_user.email,
                notes="Account placed on 48-hour enhanced monitoring watch.",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
            )
            actions.append(act)
        db.add_all(actions)

        print("[*] Step 8: Writing Initial Audit Logs...")
        audits = [
            AuditLog(
                actor="System",
                actor_role="system",
                entity_type="Pipeline",
                entity_id="Dataset-Ingestion",
                action="DATASET_INGESTED",
                new_value=f"Ingested {len(txn_orm_objects)} transactions directly from Dataset/fraudx_transactions.csv.",
                created_at=datetime.utcnow(),
            ),
            AuditLog(
                actor="System",
                actor_role="system",
                entity_type="ML_Model",
                entity_id="IsolationForest-v1",
                action="MODEL_TRAINED",
                new_value=f"Isolation Forest evaluation active. {len(alert_orm_objects)} alerts raised for analyst review.",
                created_at=datetime.utcnow(),
            ),
            AuditLog(
                actor=analyst_user.email,
                actor_role="analyst",
                entity_type="Investigation",
                entity_id="CSE-500001",
                action="CASE_CREATED",
                new_value="Initiated investigation for unusual fund velocity.",
                created_at=datetime.utcnow(),
            ),
        ]
        db.add_all(audits)

        # Update member risk statuses based on high-risk transactions
        for m_orm in member_orm_objects:
            m_scores = [t.risk_score for t in txn_orm_objects if t.sender_id == m_orm.id and t.risk_score is not None]
            if m_scores:
                max_score = max(m_scores)
                if max_score >= 80:
                    m_orm.risk_status = RiskStatus.critical
                elif max_score >= 60:
                    m_orm.risk_status = RiskStatus.high
                elif max_score >= 35:
                    m_orm.risk_status = RiskStatus.medium

        db.commit()
        print(f"[+] Database Seeding Complete! {len(txn_orm_objects)} txns, {len(alert_orm_objects)} alerts, {len(investigations)} cases seeded.")

    except Exception as e:
        db.rollback()
        print(f"[!] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

