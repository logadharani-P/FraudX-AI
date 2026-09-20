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
import pandas as pd

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

from data.amlsim_generator import generate_amlsim_dataset
from data.enrich_cooperative import enrich_amlsim_dataset
from app.ml.isolation_forest import RiskScoringEngine
from app.ml.network_analysis import TransactionNetworkAnalyzer


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

        print("[*] Step 1: Generating IBM AMLSim synthetic dataset...")
        aml_df = generate_amlsim_dataset(num_accounts=120, num_transactions=1500, fraud_pattern_count=30, seed=42)
        print(f"    Generated {len(aml_df)} AMLSim raw records with {aml_df['isFraud'].sum()} AML pattern flags.")

        print("[*] Step 2: Applying Cooperative-Society Synthetic Enrichment...")
        members_df, txns_df = enrich_amlsim_dataset(aml_df, seed=42)
        print(f"    Created {len(members_df)} cooperative members and enriched {len(txns_df)} transactions.")

        print("[*] Step 3: Training Pure NumPy Isolation Forest & Computing Behavioral Risk Scores...")
        scoring_engine = RiskScoringEngine(contamination=0.05, random_state=42)
        scored_txns_df = scoring_engine.fit_and_score(txns_df)
        print("    [+] Isolation Forest Scoring Complete!")
        if scoring_engine.evaluation_metrics:
            print("    [+] Real Evaluation Metrics on AMLSim Benchmark:")
            for k, v in scoring_engine.evaluation_metrics.items():
                print(f"        - {k}: {v}")

        # Save model artifact
        model_path = os.path.join(os.path.dirname(__file__), "..", "data", "models", "isolation_forest.pkl")
        scoring_engine.save_model(model_path)

        # Build initial network graph
        analyzer = TransactionNetworkAnalyzer()
        analyzer.build_graph_from_dataframe(scored_txns_df)

        print("[*] Step 4: Seeding Core Users (RBAC)...")
        # 1. Customer User (linked to first member MBR-400001)
        customer_user = User(
            email="customer@fraudx.ai",
            hashed_password=get_password_hash("password123"),
            name=members_df.iloc[0]["name"],
            role=UserRole.customer,
            phone=members_df.iloc[0]["phone"],
            city=members_df.iloc[0]["city"],
            organisation_id="ORG-APEX-01",
            member_id=members_df.iloc[0]["member_id"],
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


        print("[*] Step 5: Seeding Members...")
        member_orm_objects = []
        for _, m_row in members_df.iterrows():
            m_orm = Member(
                id=int(m_row["id"]),
                member_id=str(m_row["member_id"]),
                amlsim_account_id=str(m_row["amlsim_account_id"]),
                name=str(m_row["name"]),
                email=str(m_row["email"]),
                phone=str(m_row["phone"]),
                city=str(m_row["city"]),
                state=str(m_row["state"]),
                lat=float(m_row["lat"]),
                lng=float(m_row["lng"]),
                bank=str(m_row["bank"]),
                account_id=str(m_row["account_id"]),
                account_type=str(m_row["account_type"]),
                join_date=m_row["join_date"],
                verified=bool(m_row["verified"]),
                share_capital=float(m_row["share_capital"]),
                savings_balance=float(m_row["savings_balance"]),
                loan_outstanding=float(m_row["loan_outstanding"]),
                risk_status=RiskStatus.low,
            )
            member_orm_objects.append(m_orm)
        db.add_all(member_orm_objects)
        db.flush()

        print("[*] Step 6: Seeding Transactions & Model Scores...")
        txn_orm_objects = []
        for _, t_row in scored_txns_df.iterrows():
            r_level_str = str(t_row["risk_level"]).lower()
            risk_level_enum = (
                RiskLevel.critical if r_level_str == "critical"
                else RiskLevel.high if r_level_str == "high"
                else RiskLevel.medium if r_level_str == "medium"
                else RiskLevel.low
            )

            status_val = TransactionStatus.flagged if risk_level_enum in [RiskLevel.high, RiskLevel.critical] else TransactionStatus.completed

            t_orm = Transaction(
                id=int(t_row["id"]),
                transaction_id=str(t_row["transaction_id"]),
                amlsim_step=int(t_row["amlsim_step"]),
                amlsim_type=str(t_row["amlsim_type"]),
                amount=float(t_row["amount"]),
                old_balance_orig=float(t_row["old_balance_orig"]),
                new_balance_orig=float(t_row["new_balance_orig"]),
                old_balance_dest=float(t_row["old_balance_dest"]),
                new_balance_dest=float(t_row["new_balance_dest"]),
                is_fraud_label=bool(t_row["is_fraud_label"]),
                is_flagged_fraud=bool(t_row["is_flagged_fraud"]),
                sender_id=int(t_row["sender_id"]),
                receiver_id=int(t_row["receiver_id"]),
                transaction_type=str(t_row["transaction_type"]),
                device=str(t_row["device"]),
                location_city=str(t_row["location_city"]),
                location_state=str(t_row["location_state"]),
                lat=float(t_row["lat"]),
                lng=float(t_row["lng"]),
                purpose=str(t_row["purpose"]) if pd.notna(t_row.get("purpose")) else None,
                loan_ref=str(t_row["loan_ref"]) if pd.notna(t_row.get("loan_ref")) else None,
                risk_score=float(t_row["risk_score"]),
                risk_level=risk_level_enum,
                anomaly_score=float(t_row["anomaly_score"]),
                anomaly_factors=t_row["anomaly_factors"],
                status=status_val,
                timestamp=t_row["timestamp"],
            )
            txn_orm_objects.append(t_orm)

        db.add_all(txn_orm_objects)
        db.flush()

        print("[*] Step 7: Generating Alerts for High/Critical Anomalies...")
        high_risk_txns = scored_txns_df[scored_txns_df["risk_score"] >= 60.0].copy()
        alert_orm_objects = []
        alert_counter = 1

        for _, hr_row in high_risk_txns.iterrows():
            alt_id = f"ALT-{200000 + alert_counter}"
            score = float(hr_row["risk_score"])
            r_level = "Critical" if score >= 80 else "High"

            factors = hr_row["anomaly_factors"]
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
            desc = f"AI anomaly assessment flagged transaction {hr_row['transaction_id']} (Rs.{hr_row['amount']:,.2f}) for human analyst review. Score: {score:.1f}/100."

            rand_stat = random.random()
            if rand_stat < 0.60:
                alt_status = AlertStatus.open
                res_time, res_by, res_note = None, None, None
            elif rand_stat < 0.85:
                alt_status = AlertStatus.investigating
                res_time, res_by, res_note = None, None, None
            else:
                alt_status = AlertStatus.resolved
                res_time = hr_row["timestamp"] + timedelta(hours=random.randint(1, 12))
                res_by = analyst_user.id
                res_note = "Verified with member via registered phone. Legitimate agricultural equipment purchase."

            a_orm = Alert(
                id=alert_counter,
                alert_id=alt_id,
                transaction_id=int(hr_row["id"]),
                category=cat,
                risk_level=r_level,
                risk_score=score,
                reason=first_reason,
                description=desc,
                status=alt_status,
                created_at=hr_row["timestamp"],
                resolved_at=res_time,
                resolved_by=res_by,
                resolution_note=res_note,
            )
            alert_orm_objects.append(a_orm)
            alert_counter += 1

        db.add_all(alert_orm_objects)
        db.flush()

        print("[*] Step 8: Generating Initial Investigations & Action Audits...")
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

        print("[*] Step 9: Writing Initial Audit Logs...")
        audits = [
            AuditLog(
                actor="System",
                actor_role="system",
                entity_type="Pipeline",
                entity_id="AMLSim-Ingestion",
                action="DATASET_INGESTED",
                new_value=f"Ingested {len(txns_df)} transactions from IBM AMLSim simulation with cooperative enrichment.",
                created_at=datetime.utcnow(),
            ),
            AuditLog(
                actor="System",
                actor_role="system",
                entity_type="ML_Model",
                entity_id="IsolationForest-v1",
                action="MODEL_TRAINED",
                new_value=f"Trained Isolation Forest model. {len(alert_orm_objects)} alerts raised for analyst review.",
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
            m_txns = scored_txns_df[scored_txns_df["sender_id"] == m_orm.id]
            if len(m_txns) > 0:
                max_score = m_txns["risk_score"].max()
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
