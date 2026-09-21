"""
FraudX AI — FraudX Intelligence Agent Router
Handles natural language cooperative banking and fraud intelligence queries.
Provides grounded database lookups, explainable anomaly insights, general cooperative & security Q&A,
strict role-aware data isolation, and safety disclaimers (no definitive fraud assertions).
"""
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models.transaction import Transaction, RiskLevel
from app.models.member import Member
from app.models.alert import Alert, AlertStatus
from app.models.investigation import Investigation
from app.models.user import User, UserRole
from app.schemas.agent import AgentChatRequest, AgentChatResponse, EvidenceItem
from app.services.auth_service import get_current_user_optional
from app.ml.risk_explainer import explain_transaction_risk

router = APIRouter(prefix="/api/agent", tags=["FraudX Intelligence Agent"])

# ── General Cooperative & Security Knowledge Base ─────────────────────────────

GENERAL_QA = {
    "mfa": (
        "### Multi-Factor Authentication (MFA) Overview\n\n"
        "**Multi-Factor Authentication (MFA)** is an essential security layer designed to protect your cooperative account.\n\n"
        "**1. What is an MFA Code?**\n"
        "An MFA code is a temporary, time-sensitive 6-digit numeric token generated during login or high-value transactions. "
        "It proves your identity by requiring:\n"
        "- **Something you know**: Your account password or PIN.\n"
        "- **Something you have**: An authenticator app or registered mobile device.\n\n"
        "**2. Why is MFA Important for Cooperative Members?**\n"
        "- Prevents unauthorized access even if your password is compromised.\n"
        "- Protects member deposits and savings capital from account takeover attacks.\n"
        "- Ensures all administrative and analyst operations are strictly authenticated.\n\n"
        "*Security Tip: Never share your 6-digit MFA verification code or OTP with anyone, including cooperative staff.*"
    ),
    "membership": (
        "### Becoming a Cooperative Society Member\n\n"
        "**How to Join Apex Urban Cooperative Society:**\n\n"
        "1. **Online Self-Registration**: Complete the customer registration form on the FraudX portal with your name, phone, email, and city.\n"
        "2. **Identity Verification (KYC)**: Provide verified government identity documents (Aadhaar / PAN / Voter ID) at your local branch or during digital onboarding.\n"
        "3. **Share Capital Contribution**: Make an initial share capital contribution (minimum ₹5,000) to become an equity-holding society shareholder.\n"
        "4. **Account Activation**: Receive your unique Member ID (`MBR-XXXXXX`) and Savings Account (`ACC-XXXXXX`) to start transacting.\n\n"
        "*Every registered member is an owner and democratic stakeholder in the cooperative society.*"
    ),
    "benefits": (
        "### Benefits of Cooperative Society Membership\n\n"
        "As a registered member of the cooperative society, you enjoy several key financial and community benefits:\n\n"
        "1. **Competitive Savings & Share Dividends**: Earn attractive annual dividend payouts on your share capital and higher interest rates on cooperative savings.\n"
        "2. **Low-Interest Cooperative Credit**: Access affordable micro-loans, agricultural equipment financing, and emergency crop loans with minimal processing fees.\n"
        "3. **Democratic Ownership & Voting Rights**: Participate in society annual general meetings (AGMs) with equal voting rights under cooperative governance principles.\n"
        "4. **Community Mutual Support**: Direct community assistance programs during agricultural hardship or local emergencies.\n"
        "5. **AI-Powered Fraud Protection**: All member transactions and savings are monitored 24/7 by FraudX AI anomaly detection to prevent unauthorized fund drainage."
    ),
    "frequency": (
        "### Transaction Processing & Frequency\n\n"
        "**Cooperative Society Transaction Overview:**\n\n"
        "- **Continuous Operation**: Cooperative transactions occur in real-time across multiple channels including UPI, NEFT, IMPS, RTGS, and branch Micro-ATM terminals.\n"
        "- **Operating Patterns**: Standard transactions typically follow daytime business hours for agricultural produce sales, member utility payments, and share capital deposits.\n"
        "- **Velocity Monitoring**: FraudX AI continuously evaluates transaction velocity (frequency of transfers within short time windows) to detect abnormal bursts, rapid drainage, or potential account takeovers."
    ),
    "fraud_alert": (
        "### What is a Fraud Alert?\n\n"
        "A **Fraud Alert** is an automated notification raised by the FraudX machine learning engine when an outbound transaction deviates significantly from established account baselines.\n\n"
        "**Key Points to Understand:**\n"
        "- An alert indicates **unusual or anomalous activity** that warrants closer review.\n"
        "- **It does NOT automatically mean a transaction is fraudulent** (legitimate large purchases or emergency transfers can also trigger alerts).\n"
        "- Every alert enters a formal investigation workflow where certified analysts review evidence and verify genuine intent with the member."
    ),
    "risk_score": (
        "### Understanding FraudX Risk Scores\n\n"
        "The **Risk Score** is a calibrated 0 to 100 metric calculated by the Isolation Forest model and behavioral deviation algorithms:\n\n"
        "- 🟢 **Low Risk (0 – 34)**: Standard transaction fully consistent with historical account baseline.\n"
        "- 🟡 **Medium Risk (35 – 59)**: Minor deviation (e.g. higher amount or new channel); flagged for standard automated monitoring.\n"
        "- 🟠 **High Risk (60 – 79)**: Significant anomaly (e.g. rapid balance drain or cross-region transfer); generates an alert for analyst triage.\n"
        "- 🔴 **Critical Risk (80 – 100)**: Multi-dimensional anomaly with extreme deviation; prioritized for immediate human review and potential provisional hold."
    ),
    "aml": (
        "### What is Anti-Money Laundering (AML)?\n\n"
        "**Anti-Money Laundering (AML)** refers to the comprehensive framework of laws, regulations, and technologies designed to prevent illicit actors from disguising illegally obtained funds as legitimate income.\n\n"
        "**Common AML Typologies Monitored in Cooperatives:**\n"
        "1. **Structuring / Smurfing**: Splitting large sums into multiple small deposits under statutory reporting thresholds.\n"
        "2. **Rapid Pass-Through**: Receiving funds and immediately routing them to multiple outward beneficiaries.\n"
        "3. **Circular Layering**: Routing transfers through multiple intermediary cooperative accounts to obscure the origin of funds.\n\n"
        "FraudX AI continuously benchmarks cooperative transactions against IBM AMLSim simulation typologies to ensure full regulatory compliance."
    ),
    "about_fraudx": (
        "### About FraudX AI\n\n"
        "**FraudX AI** is an advanced AI-powered anti-fraud and compliance intelligence platform specifically engineered for urban and rural cooperative banking societies.\n\n"
        "**Core Capabilities:**\n"
        "- **Pure NumPy Isolation Forest**: Real-time multi-dimensional anomaly detection without external heavy dependencies.\n"
        "- **NetworkX Graph Analysis**: Identifies complex money laundering rings, smurfing aggregations, and circular flows.\n"
        "- **Explainable AI**: Delivers human-understandable evidence points for every flagged transaction.\n"
        "- **Privacy & Role-Based Isolation**: Guarantees customer account privacy while empowering compliance analysts with enterprise triage tools."
    ),
    "suspicious_action": (
        "### What to Do If You Spot a Suspicious Transaction\n\n"
        "If you notice an unfamiliar transaction or suspect unauthorized activity on your cooperative account:\n\n"
        "1. **Freeze Your Account**: Use the mobile app or web portal to temporarily freeze outward debit transfers.\n"
        "2. **Contact Cooperative Support**: Call the 24/7 Apex Cooperative emergency helpline immediately.\n"
        "3. **Provide Transaction Details**: Note the exact **Transaction ID** (`TXN-XXXXXX`), amount, and timestamp.\n"
        "4. **Never Disclose Security Codes**: Do not share OTPs, SMS codes, or authenticator values with anyone.\n"
        "5. **File a Dispute**: Our compliance team will review the audit logs, verify the channel, and assist in fund recovery."
    ),
}


def _extract_entities_from_text(text: str) -> Dict[str, Optional[str]]:
    """
    Extracts transaction IDs (TXN-XXXXXX), member IDs (MBR-XXXXXX),
    case IDs (CSE-XXXXXX), or alert IDs (ALT-XXXXXX) from chat text.
    """
    txn_match = re.search(r"TXN-\d+", text, re.IGNORECASE)
    mbr_match = re.search(r"MBR-\d+", text, re.IGNORECASE)
    alt_match = re.search(r"ALT-\d+", text, re.IGNORECASE)
    cse_match = re.search(r"CSE-\d+", text, re.IGNORECASE)

    return {
        "txn_id": txn_match.group(0).upper() if txn_match else None,
        "mbr_id": mbr_match.group(0).upper() if mbr_match else None,
        "alt_id": alt_match.group(0).upper() if alt_match else None,
        "cse_id": cse_match.group(0).upper() if cse_match else None,
    }


def _find_member_by_name(text: str, db: Session) -> Optional[Member]:
    """
    Attempts to identify a Member mentioned by full or partial name in the text.
    """
    # Clean text
    cleaned = re.sub(r"[?!.,;:\'\"`]", " ", text)
    words = cleaned.split()
    
    stop_words = {
        "who", "is", "what", "tell", "me", "about", "member", "happened", "with",
        "the", "and", "for", "from", "show", "details", "profile", "please", "can",
        "you", "give", "info", "analyze", "explain", "why", "was", "this", "that"
    }
    
    # Check 3-word, 2-word, and 1-word combinations
    for n in [3, 2, 1]:
        for i in range(len(words) - n + 1):
            phrase = " ".join(words[i:i+n]).strip()
            if len(phrase) >= 3 and phrase.lower() not in stop_words:
                m = db.query(Member).filter(Member.name.ilike(f"%{phrase}%")).first()
                if m:
                    return m
    return None


@router.post("/chat", response_model=AgentChatResponse)
def chat_with_agent(
    payload: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    msg = payload.message.strip()
    msg_lower = msg.lower()
    ctx = payload.context or None

    extracted = _extract_entities_from_text(msg)
    target_txn_id = (ctx.transaction_id if ctx else None) or extracted["txn_id"]
    target_mbr_id = (ctx.member_id if ctx else None) or extracted["mbr_id"]
    target_alt_id = (ctx.alert_id if ctx else None) or extracted["alt_id"]
    target_cse_id = (ctx.case_id if ctx else None) or extracted["cse_id"]

    is_customer = current_user and current_user.role == UserRole.customer
    c_member = current_user.member if is_customer else None
    if is_customer and not c_member and current_user.member_id:
        c_member = db.query(Member).filter(Member.member_id == current_user.member_id).first()

    c_member_str = c_member.member_id if c_member else (current_user.member_id if is_customer else None)
    c_member_id = c_member.id if c_member else -1

    # ── CUSTOMER PRIVACY ISOLATION CHECK: General Org / Alert Queries ──
    if is_customer:
        if (
            "all alert" in msg_lower
            or "top open alert" in msg_lower
            or "top open fraud alert" in msg_lower
            or "top alert" in msg_lower
            or "organisation alert" in msg_lower
            or "system alert" in msg_lower
            or (target_alt_id and not (ctx and ctx.transaction_id))
            or target_cse_id
        ):
            return AgentChatResponse(
                reply=(
                    "### Access Restricted\n\n"
                    "As a cooperative customer, you can only query information regarding your own account and transactions. "
                    "Organisation-wide fraud alerts and investigation cases are confidential internal records.\n\n"
                    f"Your registered account: **{c_member_str or 'Member'}**."
                ),
                evidence=[],
                sources=["Cooperative Privacy Policy"],
                suggested_actions=["Check my recent transactions", "Ask about account security tips"],
            )

        if target_mbr_id and target_mbr_id != c_member_str:
            return AgentChatResponse(
                reply=(
                    "### Access Restricted\n\n"
                    f"In accordance with cooperative privacy policies, member financial records and profile data are confidential. "
                    f"You are authenticated as `{c_member_str}` and cannot access information for other members (`{target_mbr_id}`)."
                ),
                evidence=[],
                sources=["Member Data Privacy Rules"],
                suggested_actions=[f"Show my profile ({c_member_str})", "Review my transactions"],
            )

    # ── CHECK FOR NAME LOOKUP (e.g. "Who is Arav Sharma?") ──
    named_member = _find_member_by_name(msg, db)
    if named_member:
        if is_customer and named_member.member_id != c_member_str:
            return AgentChatResponse(
                reply=(
                    "### Access Restricted\n\n"
                    f"In accordance with cooperative privacy policies, personal member records are confidential. "
                    f"You cannot access profile or financial details for **{named_member.name}**."
                ),
                evidence=[],
                sources=["Member Data Privacy Rules"],
                suggested_actions=["View my account summary", "Ask about cooperative benefits"],
            )
        else:
            # Analyst/Org or self query
            txn_count = db.query(func.count(Transaction.id)).filter(Transaction.sender_id == named_member.id).scalar() or 0
            high_risk_count = db.query(func.count(Transaction.id)).filter(
                Transaction.sender_id == named_member.id, Transaction.risk_score >= 60.0
            ).scalar() or 0

            return AgentChatResponse(
                reply=(
                    f"### Member Profile: **{named_member.name}** (`{named_member.member_id}`)\n\n"
                    f"- **Bank / Branch**: {named_member.bank} ({named_member.city}, {named_member.state})\n"
                    f"- **Account ID**: `{named_member.account_id}` ({named_member.account_type})\n"
                    f"- **Savings Balance**: ₹{named_member.savings_balance:,.2f}\n"
                    f"- **Share Capital**: ₹{named_member.share_capital:,.2f}\n"
                    f"- **Loan Outstanding**: ₹{named_member.loan_outstanding:,.2f}\n"
                    f"- **Join Date**: {named_member.join_date}\n"
                    f"- **Account Risk Status**: `{named_member.risk_status.value}`\n"
                    f"- **Total Sent Transfers**: {txn_count} (Flagged: {high_risk_count})\n\n"
                    f"*Note: All profile metrics are grounded in the verified cooperative society database.*"
                ),
                evidence=[
                    EvidenceItem(
                        title=f"Verified Member Record: {named_member.member_id}",
                        description=f"{named_member.name} holds ₹{named_member.savings_balance:,.2f} savings at {named_member.bank}.",
                        type="baseline",
                        severity="info",
                    )
                ],
                sources=[f"Member Registry: {named_member.member_id}"],
                suggested_actions=[f"View transactions for {named_member.member_id}", "Inspect risk status"],
            )

    # ── CHECK GENERAL COOPERATIVE / SECURITY TOPICS ──
    if "mfa" in msg_lower or "2fa" in msg_lower or "authenticator" in msg_lower or "verification code" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["mfa"],
            evidence=[],
            sources=["FraudX Security & Authentication Guide"],
            suggested_actions=["Review account security", "How to become a member?"],
        )

    if "how can i become a member" in msg_lower or "how to join" in msg_lower or "become a member" in msg_lower or "membership" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["membership"],
            evidence=[],
            sources=["Cooperative Society Bylaws & Onboarding Guide"],
            suggested_actions=["What are the benefits of becoming a member?", "What is MFA?"],
        )

    if "benefit" in msg_lower or "why join" in msg_lower or "advantages" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["benefits"],
            evidence=[],
            sources=["Cooperative Society Member Charter"],
            suggested_actions=["How can I become a member?", "What does FraudX AI do?"],
        )

    if "frequently" in msg_lower or "frequency" in msg_lower or "how often" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["frequency"],
            evidence=[],
            sources=["Cooperative Operational Architecture"],
            suggested_actions=["What is a fraud alert?", "What is risk score?"],
        )

    if "what is a fraud alert" in msg_lower or "what is an alert" in msg_lower or "how alerts work" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["fraud_alert"],
            evidence=[],
            sources=["FraudX Alert Lifecycle Policy"],
            suggested_actions=["What is risk score?", "What does FraudX AI do?"],
        )

    if "what is risk score" in msg_lower or "risk score" in msg_lower and ("mean" in msg_lower or "explain" in msg_lower or "what is" in msg_lower):
        return AgentChatResponse(
            reply=GENERAL_QA["risk_score"],
            evidence=[],
            sources=["Isolation Forest Scoring Documentation"],
            suggested_actions=["What is a fraud alert?", "What is AML?"],
        )

    if "what is aml" in msg_lower or "anti-money laundering" in msg_lower or "money laundering" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["aml"],
            evidence=[],
            sources=["Regulatory AML/CFT Compliance Framework"],
            suggested_actions=["What does FraudX AI do?", "What is risk score?"],
        )

    if "what does fraudx" in msg_lower or "what is fraudx" in msg_lower or "about fraudx" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["about_fraudx"],
            evidence=[],
            sources=["FraudX AI System Architecture"],
            suggested_actions=["What is AML?", "What is MFA?"],
        )

    if "suspicious transaction" in msg_lower or "unfamiliar transaction" in msg_lower or "unauthorized transfer" in msg_lower:
        return AgentChatResponse(
            reply=GENERAL_QA["suspicious_action"],
            evidence=[],
            sources=["Cooperative Member Safety Handbook"],
            suggested_actions=["What is MFA?", "How to contact support"],
        )

    evidence: List[EvidenceItem] = []
    sources: List[str] = []
    suggested_actions: List[str] = []
    reply_lines = []

    # ── CASE 1: Query specifically mentions or targets a Transaction ──
    if target_txn_id or (ctx and ctx.transaction_id):
        lookup_id = target_txn_id or (ctx.transaction_id if ctx else None)
        txn = db.query(Transaction).filter(
            or_(
                Transaction.transaction_id == lookup_id,
                Transaction.id == int(lookup_id) if str(lookup_id).isdigit() else False,
            )
        ).first()

        if txn:
            # Customer isolation: Check if transaction belongs to this customer
            if is_customer:
                is_owner = (
                    txn.sender_id == c_member_id or
                    txn.receiver_id == c_member_id or
                    (txn.sender and txn.sender.member_id == c_member_str) or
                    (txn.receiver and txn.receiver.member_id == c_member_str)
                )
                if not is_owner:
                    return AgentChatResponse(
                        reply=f"Transaction `{lookup_id}` was not found in your account history.",
                        sources=["Account Transactions"],
                        suggested_actions=["View my transaction list"],
                    )

            sources.append(f"Transaction Record: {txn.transaction_id}")
            sources.append("Behavioral Risk Scoring Engine")

            r_score = txn.risk_score or 0.0
            r_level = txn.risk_level.value if txn.risk_level else "Low"
            sender_name = txn.sender.name if txn.sender else f"Member {txn.sender_id}"
            receiver_name = txn.receiver.name if txn.receiver else f"Member {txn.receiver_id}"

            reply_lines.append(
                f"### Analysis for Transaction **{txn.transaction_id}**\n\n"
                f"- **Amount**: ₹{txn.amount:,.2f} ({txn.transaction_type})\n"
                f"- **Channel / Device**: {txn.device or txn.transaction_type}\n"
                f"- **Sender**: {sender_name} (`{txn.sender.member_id if txn.sender else txn.sender_id}`)\n"
                f"- **Receiver**: {receiver_name} (`{txn.receiver.member_id if txn.receiver else txn.receiver_id}`)\n"
                f"- **Location**: {txn.location_city or 'Unknown'}, {txn.location_state or ''}\n"
                f"- **Risk Level**: **{r_level}** (Score: {r_score:.1f}/100)\n"
                f"- **Status**: `{txn.status.value}`"
            )

            # Generate real factual anomaly factors
            sender = txn.sender
            receiver = txn.receiver
            t_dict = {
                "amount": txn.amount,
                "old_balance_orig": txn.old_balance_orig,
                "new_balance_orig": txn.new_balance_orig,
                "old_balance_dest": txn.old_balance_dest,
                "new_balance_dest": txn.new_balance_dest,
                "sender_savings_balance": sender.savings_balance if sender else 25000,
                "sender_mean_amount": 15000,
                "step_velocity": txn.amlsim_step,
                "is_fraud_label": txn.is_fraud_label,
                "transaction_type": txn.transaction_type,
                "device": txn.device,
                "location_city": txn.location_city,
                "location_state": txn.location_state,
                "sender_city": sender.city if sender else None,
                "receiver_city": receiver.city if receiver else None,
                "receiver_name": receiver.name if receiver else None,
                "purpose": txn.purpose,
                "amlsim_type": txn.amlsim_type,
            }
            factual_anomalies = explain_transaction_risk(t_dict, r_score)

            if r_score >= 50.0:
                reply_lines.append("\n**Why this transaction was flagged (Detected Indicators):**")
                for factor in factual_anomalies:
                    reply_lines.append(f"• {factor}")
                    evidence.append(
                        EvidenceItem(
                            title="Behavioral Anomaly Indicator",
                            description=factor,
                            type="behavioral",
                            severity="warning" if r_score >= 60 else "info",
                        )
                    )
            else:
                reply_lines.append("\n**Behavioral Context:**")
                reply_lines.append("• Transaction parameters are fully aligned with historical cooperative baseline.")

            # AI Safety Wording
            reply_lines.append(
                "\n*Safety Notice: This transaction was flagged because the AI detected unusual activity based on mathematical baseline deviations. "
                "Human analyst review is required for a final fraud determination.*"
            )

            if not is_customer and txn.alert:
                sources.append(f"Alert Registry: {txn.alert.alert_id}")
                reply_lines.append(f"\nAssociated with active alert **{txn.alert.alert_id}** (Status: `{txn.alert.status.value}`).")

            suggested_actions.extend(["View transaction details", "Check sender profile"])
            return AgentChatResponse(
                reply="\n".join(reply_lines),
                evidence=evidence,
                sources=sources,
                suggested_actions=suggested_actions,
            )
        else:
            return AgentChatResponse(
                reply=f"Transaction `{lookup_id}` was not found in the cooperative database. Please check the ID format (e.g. `TXN-100001`).",
                sources=["Database Query"],
                suggested_actions=["Search transactions table", "View latest transactions"],
            )

    # ── CASE 2: Query specifically targets a Member by ID ──
    if target_mbr_id:
        mbr = db.query(Member).filter(
            or_(
                Member.member_id == target_mbr_id,
                Member.id == int(target_mbr_id) if str(target_mbr_id).isdigit() else False,
            )
        ).first()

        if mbr:
            sources.append(f"Member Registry: {mbr.member_id}")
            txn_count = db.query(func.count(Transaction.id)).filter(Transaction.sender_id == mbr.id).scalar() or 0
            high_risk_count = db.query(func.count(Transaction.id)).filter(
                Transaction.sender_id == mbr.id, Transaction.risk_score >= 60.0
            ).scalar() or 0

            reply_lines.append(
                f"### Profile Summary: **{mbr.name}** (`{mbr.member_id}`)\n\n"
                f"- **Bank / Branch**: {mbr.bank} ({mbr.city}, {mbr.state})\n"
                f"- **Account**: `{mbr.account_id}` ({mbr.account_type})\n"
                f"- **Savings Balance**: ₹{mbr.savings_balance:,.2f}\n"
                f"- **Outstanding Loan**: ₹{mbr.loan_outstanding:,.2f}\n"
                f"- **Share Capital**: ₹{mbr.share_capital:,.2f}\n"
                f"- **Total Transfers**: {txn_count} (Flagged Anomalous: {high_risk_count})\n"
                f"- **Current Account Risk Status**: `{mbr.risk_status.value}`"
            )

            suggested_actions.extend([
                f"View transaction history for {mbr.member_id}",
                "Review account security",
            ])

            return AgentChatResponse(
                reply="\n".join(reply_lines),
                evidence=evidence,
                sources=sources,
                suggested_actions=suggested_actions,
            )
        else:
            return AgentChatResponse(
                reply=f"No cooperative member record found for ID `{target_mbr_id}`.",
                sources=["Database Query"],
                suggested_actions=["View all members", "Check customer directory"],
            )

    # ── CASE 3: Top Open Alerts (Analyst / Org only) ──
    if not is_customer and ("alert" in msg_lower or "fraud" in msg_lower or "flagged" in msg_lower):
        open_alerts = db.query(Alert).filter(Alert.status == AlertStatus.open).order_by(Alert.risk_score.desc()).limit(5).all()
        sources.append("Alerts Database Table")
        sources.append("Isolation Forest Anomaly Registry")

        reply_lines.append("### Current System Fraud & Alert Overview\n")
        reply_lines.append(f"There are currently **{len(open_alerts)} high-priority open alerts** requiring human analyst review:\n")

        for a in open_alerts:
            t = a.transaction
            s_name = t.sender.name if (t and t.sender) else "Member"
            amt_str = f"₹{t.amount:,.2f}" if t else "N/A"
            reply_lines.append(f"• **{a.alert_id}** — {a.category.value} on {t.transaction_id if t else ''} ({amt_str} by {s_name}): *{a.reason}* (Score: {a.risk_score:.0f}/100)")

            evidence.append(
                EvidenceItem(
                    title=f"Open Alert {a.alert_id}",
                    description=f"{a.category.value}: {a.reason}",
                    type="ml_score",
                    severity="danger" if a.risk_score >= 80 else "warning",
                )
            )

        reply_lines.append("\n*Safety Notice: High risk scores indicate mathematical baseline anomalies. Human analyst review is required for a final fraud determination.*")

        suggested_actions.extend([
            "Open Fraud Alerts page",
            "Begin triage in Risk Treatment",
            "Generate Audit Report",
        ])

        return AgentChatResponse(
            reply="\n".join(reply_lines),
            evidence=evidence,
            sources=sources,
            suggested_actions=suggested_actions,
        )

    # ── CASE 4: Network & Graph Pattern Queries (Analyst / Org only) ──
    if not is_customer and ("network" in msg_lower or "graph" in msg_lower or "laundering" in msg_lower or "topology" in msg_lower):
        sources.append("NetworkX Graph Analyzer")
        sources.append("Transaction Topologies")

        reply = (
            "### Network & Graph Topology Intelligence\n\n"
            "FraudX utilizes NetworkX to evaluate multi-party fund routing behaviors:\n\n"
            "1. **Fan-In (Smurfing Aggregation)**: Detects multiple low-value transfers from distributed members pooling into a single destination account.\n"
            "2. **Fan-Out (Dispersion)**: Detects immediate onward dispersion from a central account to multiple beneficiaries.\n"
            "3. **Circular Layering Cycles**: Identifies closed $A \\rightarrow B \\rightarrow C \\rightarrow A$ loops designed to simulate legitimate trade volume.\n\n"
            "To inspect a specific member's network subgraph, provide their ID (e.g. `Inspect network for MBR-400005`) or navigate to the Risk Analysis module.\n\n"
            "*Safety Notice: Network topology alerts highlight structural graph anomalies. Human analyst review is required for a final fraud determination.*"
        )
        return AgentChatResponse(
            reply=reply,
            evidence=[
                EvidenceItem(
                    title="Graph Engine Active",
                    description="NetworkX topology analyzer is actively monitoring transaction edges and directed cycles.",
                    type="network",
                    severity="info",
                )
            ],
            sources=sources,
            suggested_actions=["Analyze member network graph", "View high-risk transactions"],
        )

    # ── CASE 5: General Assistant Fallback ──
    sources.append("FraudX Knowledge Base")
    if is_customer:
        reply = (
            f"### Welcome to Cooperative Member AI Assistant\n\n"
            f"Hello, **{current_user.name if current_user else 'Member'}**! I am your personal cooperative banking assistant.\n\n"
            f"**Here are things you can ask me:**\n"
            f"- `What is MFA?` or `What is an MFA code?`\n"
            f"- `What are the benefits of becoming a member?`\n"
            f"- `How can I become a member?`\n"
            f"- `What should I do if I see a suspicious transaction?`\n"
            f"- `Show my account profile`"
        )
        actions = ["What is MFA?", "What are the benefits of becoming a member?", "Check my profile"]
    else:
        reply = (
            "### FraudX Intelligence Assistant\n\n"
            "I can help you investigate transactions, analyze member profiles, review ML anomaly factors, and summarize network typologies.\n\n"
            "**Try asking:**\n"
            "- `Analyze transaction TXN-100005`\n"
            "- `Who is Arav Sharma?`\n"
            "- `What are the top open alerts?`\n"
            "- `Explain the network pattern.`\n"
            "- `What is AML?`\n\n"
            "*Safety Notice: Human analyst review is required for all final fraud determinations.*"
        )
        actions = ["Check top open alerts", "Analyze transaction TXN-100001", "What is AML?"]

    return AgentChatResponse(
        reply=reply,
        evidence=[],
        sources=sources,
        suggested_actions=actions,
    )
