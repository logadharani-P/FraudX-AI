"""
FraudX AI — Comprehensive Backend Verification Test Suite
Tests:
1. Root & Health endpoint
2. Primary authentication & profile completeness (Customer, Analyst, Organisation)
3. Server-side MFA code validation (empty -> 401, wrong -> 401, valid -> 200)
4. Demonstration Face verification validation (failed -> 401, success -> 200)
5. Customer registration with persistent Member creation and isolated transactions
6. Multi-customer data isolation (Customer A vs Customer B, 403 on cross-customer access)
7. Customer RBAC restriction (403 on /members, /alerts, /investigations, /reports, /audit, case actions)
8. Customer persistence (registration -> logout -> re-login -> consistent member & transactions)
9. Analyst & Organisation operational access (dashboard, investigations, alerts, actions, reports)
10. Privacy-scoped Agent intelligence (Customer scoped vs Analyst organisation-wide)
"""
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)


def get_user_token(email: str = "analyst@fraudx.ai", password: str = "password123") -> str:
    """Helper to authenticate user and complete MFA verification if required."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    data = res.json()
    if "token" in data and "access_token" in data["token"]:
        return data["token"]["access_token"]
    if data.get("mfa_required"):
        from app.services.auth_service import AUTH_CHALLENGES
        sid = data.get("challenge_id") or data.get("session_id")
        otp = AUTH_CHALLENGES[sid]["mfa_code"]
        v_res = client.post("/api/auth/verify-mfa", json={"session_id": sid, "code": otp})
        return v_res.json()["token"]["access_token"]
    raise ValueError(f"Failed to authenticate {email}: {data}")


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"


def test_auth_login_and_profile_data():
    from app.services.auth_service import AUTH_CHALLENGES

    # 1. Analyst login initiates email MFA challenge (does NOT return JWT token prematurely)
    res = client.post("/api/auth/login", json={"email": "analyst@fraudx.ai", "password": "password123"})
    assert res.status_code == 200
    data = res.json()
    assert data.get("mfa_required") is True
    assert "token" not in data  # Security: No JWT issued before email code validation
    assert "challenge_id" in data or "session_id" in data
    assert "otp" not in data  # Security: OTP NEVER leaked to frontend response
    assert "code" not in data

    session_id = data.get("challenge_id") or data.get("session_id")
    assert session_id in AUTH_CHALLENGES
    # Simulate user reading the 6-digit code from their email
    email_otp = AUTH_CHALLENGES[session_id]["mfa_code"]
    assert len(email_otp) == 6
    assert email_otp.isdigit()

    # Complete Analyst login via verify-mfa with email code
    verify_res = client.post("/api/auth/verify-mfa", json={
        "session_id": session_id,
        "otp": email_otp
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert "token" in v_data
    user = v_data["user"]
    assert user["role"] == "analyst"
    assert "Vikram Seth" in user["name"]
    assert user["analyst_id"] or user["analystId"]
    assert user["designation"]
    assert user["specialization"]
    assert user["clearance_level"] or user["clearanceLevel"]
    assert user["cases_investigated"] >= 0

    token = v_data["token"]["access_token"]

    # Verify /api/auth/me returns same complete profile
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_user = me_res.json()
    assert me_user["email"] == "analyst@fraudx.ai"
    assert me_user["role"] == "analyst"
    assert me_user["designation"] is not None

    # 2. Organisation login & email verification flow
    org_res = client.post("/api/auth/login", json={"email": "admin@fraudx.ai", "password": "password123"})
    assert org_res.status_code == 200
    org_chal = org_res.json()
    assert org_chal.get("mfa_required") is True
    assert "token" not in org_chal
    org_sid = org_chal.get("challenge_id") or org_chal.get("session_id")
    org_otp = AUTH_CHALLENGES[org_sid]["mfa_code"]

    org_verify = client.post("/api/auth/verify-mfa", json={
        "challenge_id": org_sid,
        "code": org_otp
    })
    assert org_verify.status_code == 200
    org_user = org_verify.json()["user"]
    assert org_user["role"] == "organisation"
    assert org_user["organisation"]
    assert org_user["org_id"] or org_user["orgId"] or org_user["organisation_id"]
    assert org_user["designation"]

    # 3. Customer default login & profile (remains unchanged and direct)
    c_res = client.post("/api/auth/login", json={"email": "customer@fraudx.ai", "password": "password123"})
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert "token" in c_data
    c_user = c_data["user"]
    assert c_user["role"] == "customer"
    assert c_user["member_id"] or c_user["memberId"]
    assert c_user["account_id"] or c_user["accountId"]
    assert c_user["organisation"]

    # 4. Invalid credentials rejection
    inv_res = client.post("/api/auth/login", json={"email": "analyst@fraudx.ai", "password": "wrongpassword"})
    assert inv_res.status_code == 401


def test_mfa_and_face_verification():
    from app.services.auth_service import AUTH_CHALLENGES
    from datetime import datetime, timedelta

    # ── MFA Security Checks ──
    # 1. Empty MFA code rejection -> 401
    mfa_empty = client.post("/api/auth/verify-mfa", json={"email": "admin@fraudx.ai", "code": ""})
    assert mfa_empty.status_code == 401

    mfa_spaces = client.post("/api/auth/verify-mfa", json={"email": "admin@fraudx.ai", "code": "   "})
    assert mfa_spaces.status_code == 401

    # 2. Incorrect / arbitrary 6-digit code rejection -> 401 (not accepted merely for being 6 digits)
    chal_res = client.post("/api/auth/challenge", json={"email": "analyst@fraudx.ai"})
    assert chal_res.status_code == 200
    chal_data = chal_res.json()
    session_id = chal_data["session_id"]
    assert chal_data["mfa_required"] is True

    mfa_wrong = client.post("/api/auth/verify-mfa", json={"session_id": session_id, "code": "000000"})
    assert mfa_wrong.status_code == 401
    assert "Incorrect MFA" in mfa_wrong.json()["detail"] or "attempt" in mfa_wrong.json()["detail"]

    # 3. MFA challenge tied to specific user: cross-user attempt with different email must fail -> 401
    valid_otp = AUTH_CHALLENGES[session_id]["mfa_code"]
    cross_user = client.post("/api/auth/verify-mfa", json={
        "session_id": session_id,
        "email": "customer@fraudx.ai",  # wrong user for this challenge
        "code": valid_otp
    })
    assert cross_user.status_code == 401

    # 4. Correct MFA code with matching session -> 200 and issues JWT
    mfa_good = client.post("/api/auth/verify-mfa", json={
        "session_id": session_id,
        "email": "analyst@fraudx.ai",
        "code": valid_otp
    })
    assert mfa_good.status_code == 200
    assert "token" in mfa_good.json()
    assert mfa_good.json()["user"]["role"] == "analyst"

    # 5. MFA challenge invalidated after single successful use: replay attempt must fail -> 401
    replay_attempt = client.post("/api/auth/verify-mfa", json={
        "session_id": session_id,
        "email": "analyst@fraudx.ai",
        "code": valid_otp
    })
    assert replay_attempt.status_code == 401

    # 6. Expired challenge rejection -> 401
    chal_exp = client.post("/api/auth/challenge", json={"email": "analyst@fraudx.ai"})
    exp_sid = chal_exp.json()["session_id"]
    exp_otp = AUTH_CHALLENGES[exp_sid]["mfa_code"]
    AUTH_CHALLENGES[exp_sid]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)

    exp_res = client.post("/api/auth/verify-mfa", json={"session_id": exp_sid, "code": exp_otp})
    assert exp_res.status_code == 401

    # 7. Maximum 5 attempts security limit
    chal_att = client.post("/api/auth/challenge", json={"email": "analyst@fraudx.ai"})
    att_sid = chal_att.json()["session_id"]
    for _ in range(5):
        client.post("/api/auth/verify-mfa", json={"session_id": att_sid, "code": "999999"})
    # Challenge should now be invalidated / removed
    att_final = client.post("/api/auth/verify-mfa", json={"session_id": att_sid, "code": "999999"})
    assert att_final.status_code == 401

    # 8. Resend Code flow: invalidates old OTP, generates new OTP, enforces cooldown
    chal_resend = client.post("/api/auth/challenge", json={"email": "analyst@fraudx.ai"})
    resend_sid = chal_resend.json()["session_id"]
    old_otp = AUTH_CHALLENGES[resend_sid]["mfa_code"]

    # Immediate resend rejected due to 30s cooldown
    cool_res = client.post("/api/auth/resend-mfa", json={"session_id": resend_sid})
    assert cool_res.status_code == 429

    # Advance time past cooldown
    AUTH_CHALLENGES[resend_sid]["last_sent_at"] = datetime.utcnow() - timedelta(seconds=35)
    resend_ok = client.post("/api/auth/resend-mfa", json={"session_id": resend_sid})
    assert resend_ok.status_code == 200
    new_otp = AUTH_CHALLENGES[resend_sid]["mfa_code"]
    assert new_otp != old_otp

    # Old OTP no longer works
    old_attempt = client.post("/api/auth/verify-mfa", json={"session_id": resend_sid, "code": old_otp})
    assert old_attempt.status_code == 401

    # New OTP works
    new_attempt = client.post("/api/auth/verify-mfa", json={"session_id": resend_sid, "code": new_otp})
    assert new_attempt.status_code == 200

    # ── Face Verification Checks ──
    # 9. Failed/rejected face verification returns 401
    face_fail = client.post("/api/auth/verify-face", json={"email": "analyst@fraudx.ai", "verified": False})
    assert face_fail.status_code == 401
    assert "Face verification failed" in face_fail.json()["detail"]

    # 10. Successful face verification confirms liveness check but does NOT issue a JWT directly
    face_ok = client.post("/api/auth/verify-face", json={"email": "analyst@fraudx.ai", "verified": True})
    assert face_ok.status_code == 200
    face_data = face_ok.json()
    assert face_data["verified"] is True
    assert "token" not in face_data  # No JWT issued prematurely
    assert "access_token" not in face_data

    # 11. Face verification tied to session challenge
    chal2_res = client.post("/api/auth/challenge", json={"email": "admin@fraudx.ai"})
    assert chal2_res.status_code == 200
    s_id_2 = chal2_res.json()["session_id"]
    face_chal_ok = client.post("/api/auth/verify-face", json={"session_id": s_id_2, "verified": True})
    assert face_chal_ok.status_code == 200

    # 12. Login with face_verified: False rejected -> 401
    login_bad_face = client.post("/api/auth/login", json={
        "email": "analyst@fraudx.ai",
        "password": "password123",
        "face_verified": False
    })
    assert login_bad_face.status_code == 401


def test_customer_registration_persistence_and_isolation():
    import uuid
    run_id = str(uuid.uuid4())[:8]
    sarah_email = f"sarah.{run_id}@testcoop.com"
    rahul_email = f"rahul.{run_id}@testcoop.com"

    # ── 1. Register Customer A (Sarah) ──
    sarah_res = client.post("/api/auth/register", json={
        "name": "Sarah Jenkins",
        "email": sarah_email,
        "password": "Password@123",
        "phone": "+91 98111 22334",
        "city": "Chennai",
        "role": "customer"
    })
    assert sarah_res.status_code == 200
    sarah_data = sarah_res.json()
    sarah_token = sarah_data["token"]["access_token"]
    sarah_user = sarah_data["user"]
    sarah_mbr_id = sarah_user["member_id"]
    sarah_acc_id = sarah_user["account_id"]
    assert sarah_mbr_id is not None
    assert sarah_acc_id is not None
    assert sarah_user["name"] == "Sarah Jenkins"

    # ── 2. Register Customer B (Rahul) ──
    rahul_res = client.post("/api/auth/register", json={
        "name": "Rahul Verma",
        "email": rahul_email,
        "password": "Password@123",
        "phone": "+91 98444 55667",
        "city": "Bangalore",
        "role": "customer"
    })
    assert rahul_res.status_code == 200
    rahul_data = rahul_res.json()
    rahul_token = rahul_data["token"]["access_token"]
    rahul_user = rahul_data["user"]
    rahul_mbr_id = rahul_user["member_id"]
    rahul_acc_id = rahul_user["account_id"]

    # Verify separate identities
    assert sarah_mbr_id != rahul_mbr_id
    assert sarah_acc_id != rahul_acc_id

    # ── 3. Customer A Transaction Scoping ──
    # Sarah should only see her own transactions (e.g. 4 initial txns), NOT all 1,430 org txns
    s_txns_res = client.get("/api/transactions", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_txns_res.status_code == 200
    s_txns = s_txns_res.json()["items"]
    assert len(s_txns) == 4
    for t in s_txns:
        assert (t["sender_member_id"] == sarah_mbr_id or t["receiver_member_id"] == sarah_mbr_id)
        assert t["sender_member_id"] != rahul_mbr_id

    sarah_txn_id = s_txns[0]["transaction_id"]

    # ── 4. Customer B Transaction Scoping ──
    r_txns_res = client.get("/api/transactions", headers={"Authorization": f"Bearer {rahul_token}"})
    assert r_txns_res.status_code == 200
    r_txns = r_txns_res.json()["items"]
    assert len(r_txns) == 4
    for t in r_txns:
        assert (t["sender_member_id"] == rahul_mbr_id or t["receiver_member_id"] == rahul_mbr_id)
        assert t["sender_member_id"] != sarah_mbr_id

    rahul_txn_id = r_txns[0]["transaction_id"]

    # ── 5. Cross-Customer Data Access Protection (HTTP 403) ──
    # Sarah attempts to access Rahul's transaction detail -> 403
    s_access_r_txn = client.get(f"/api/transactions/{rahul_txn_id}", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_access_r_txn.status_code == 403

    # Rahul attempts to access Sarah's transaction detail -> 403
    r_access_s_txn = client.get(f"/api/transactions/{sarah_txn_id}", headers={"Authorization": f"Bearer {rahul_token}"})
    assert r_access_s_txn.status_code == 403

    # Sarah attempts to access Rahul's member profile -> 403
    s_access_r_mbr = client.get(f"/api/members/{rahul_mbr_id}", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_access_r_mbr.status_code == 403

    # Sarah accesses her own member profile -> 200
    s_access_s_mbr = client.get(f"/api/members/{sarah_mbr_id}", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_access_s_mbr.status_code == 200
    assert s_access_s_mbr.json()["name"] == "Sarah Jenkins"

    # Sarah attempts to view Rahul's ego network -> 403
    s_access_r_net = client.get(f"/api/risk/network/{rahul_mbr_id}", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_access_r_net.status_code == 403

    # Sarah views her own network graph -> 200
    s_access_s_net = client.get(f"/api/risk/network/{sarah_mbr_id}", headers={"Authorization": f"Bearer {sarah_token}"})
    assert s_access_s_net.status_code == 200

    # ── 6. Persistence Verification (Logout -> Re-login) ──
    # Sarah logs out
    client.post("/api/auth/logout", headers={"Authorization": f"Bearer {sarah_token}"})

    # Sarah re-logs in
    s_relogin = client.post("/api/auth/login", json={"email": sarah_email, "password": "Password@123"})
    assert s_relogin.status_code == 200
    re_user = s_relogin.json()["user"]
    re_token = s_relogin.json()["token"]["access_token"]
    assert re_user["member_id"] == sarah_mbr_id
    assert re_user["account_id"] == sarah_acc_id

    # Re-login customer sees same 4 transactions
    re_txns = client.get("/api/transactions", headers={"Authorization": f"Bearer {re_token}"}).json()["items"]
    assert len(re_txns) == 4
    assert re_txns[0]["transaction_id"] == sarah_txn_id


def test_customer_rbac_denials():
    # Login as customer
    res = client.post("/api/auth/login", json={"email": "customer@fraudx.ai", "password": "password123"})
    token = res.json()["token"]["access_token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # 1. Customer cannot list all members directory -> 403
    assert client.get("/api/members", headers=auth_header).status_code == 403

    # 2. Customer cannot view organisation alerts -> 403
    assert client.get("/api/alerts", headers=auth_header).status_code == 403
    assert client.get("/api/alerts/ALT-200001", headers=auth_header).status_code == 403

    # 3. Customer cannot update alerts -> 403
    assert client.patch("/api/alerts/ALT-200001", json={"status": "Resolved"}, headers=auth_header).status_code == 403

    # 4. Customer cannot view or manage investigations -> 403
    assert client.get("/api/investigations", headers=auth_header).status_code == 403
    assert client.post("/api/investigations", json={"alert_id": "ALT-200001", "priority": "High"}, headers=auth_header).status_code == 403

    # 5. Customer cannot perform block / freeze / whitelist actions -> 403
    act_payload = {"action_type": "Blocked", "notes": "Customer attempt to block"}
    assert client.post("/api/investigations/CSE-500001/actions", json=act_payload, headers=auth_header).status_code == 403

    # 6. Customer cannot view or download reports -> 403
    assert client.get("/api/reports", headers=auth_header).status_code == 403
    assert client.get("/api/reports/transaction-summary", headers=auth_header).status_code == 403

    # 7. Customer cannot query audit trail -> 403
    assert client.get("/api/audit", headers=auth_header).status_code == 403


def test_analyst_and_organisation_access():
    # Login as Analyst
    a_token = get_user_token("analyst@fraudx.ai", "password123")
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # 1. Analyst accesses organisation-wide transactions
    txns = client.get("/api/transactions?limit=10", headers=a_headers)
    assert txns.status_code == 200
    assert txns.json()["total"] > 500

    # 2. Analyst accesses alerts and updates status
    alerts_res = client.get("/api/alerts?limit=5", headers=a_headers)
    assert alerts_res.status_code == 200
    alt_id = alerts_res.json()["items"][0]["alert_id"]
    patch_res = client.patch(f"/api/alerts/{alt_id}", json={"status": "Investigating", "resolution_note": "Analyst triage"}, headers=a_headers)
    assert patch_res.status_code == 200

    # 3. Analyst manages investigations and performs case action
    invs_res = client.get("/api/investigations", headers=a_headers)
    assert invs_res.status_code == 200
    case_id = invs_res.json()["items"][0]["case_id"]
    act_res = client.post(f"/api/investigations/{case_id}/actions", json={"action_type": "Monitored", "notes": "Enhanced 48h watch"}, headers=a_headers)
    assert act_res.status_code == 200

    # 4. Analyst accesses members directory and reports
    assert client.get("/api/members?limit=10", headers=a_headers).status_code == 200
    assert client.get("/api/reports", headers=a_headers).status_code == 200
    assert client.get("/api/audit?limit=10", headers=a_headers).status_code == 200

    # 5. Organisation Admin access
    o_token = get_user_token("admin@fraudx.ai", "password123")
    o_headers = {"Authorization": f"Bearer {o_token}"}

    assert client.get("/api/dashboard/stats", headers=o_headers).status_code == 200
    assert client.get("/api/members?limit=10", headers=o_headers).status_code == 200
    assert client.get("/api/reports/transaction-summary", headers=o_headers).status_code == 200


def test_transaction_explanations_location_and_ai_agent():
    # Login as Analyst
    a_token = get_user_token("analyst@fraudx.ai", "password123")
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # Login as Customer
    c_token = get_user_token("customer@fraudx.ai", "password123")
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # ── 1. Real Transaction Data & Persistent Location Consistency ──
    txns_res = client.get("/api/transactions?limit=5", headers=a_headers)
    assert txns_res.status_code == 200
    txns = txns_res.json()["items"]
    assert len(txns) > 0
    first_txn = txns[0]
    t_id = first_txn["transaction_id"]

    # Verify real consistent fields
    assert first_txn["transaction_id"].startswith("TXN-")
    assert first_txn["amount"] > 0
    assert first_txn["amount_formatted"] is not None
    assert first_txn["transaction_type"] in ["UPI", "NEFT", "RTGS", "IMPS", "Micro-ATM", "AePS", "CASH_IN", "TRANSFER"]
    assert first_txn["channel"] is not None
    assert first_txn["device"] is not None
    assert first_txn["location_city"] is not None
    assert first_txn["location_state"] is not None
    assert first_txn["lat"] is not None and first_txn["latitude"] is not None
    assert first_txn["lng"] is not None and first_txn["longitude"] is not None
    assert first_txn["status"] is not None
    assert isinstance(first_txn["anomaly_factors"], list) and len(first_txn["anomaly_factors"]) > 0

    # Fetch same transaction twice and assert persistent coordinates (no random regeneration on read)
    call_1 = client.get(f"/api/transactions/{t_id}", headers=a_headers).json()
    call_2 = client.get(f"/api/transactions/{t_id}", headers=a_headers).json()
    assert call_1["lat"] == call_2["lat"] == first_txn["lat"]
    assert call_1["lng"] == call_2["lng"] == first_txn["lng"]
    assert call_1["location_city"] == call_2["location_city"]

    # ── 2. AI Agent Category A: FraudX Data Queries ──
    # A1. Transaction Analysis Query
    txn_chat = client.post("/api/agent/chat", json={"message": f"Analyze transaction {t_id}"}, headers=a_headers)
    assert txn_chat.status_code == 200
    t_reply = txn_chat.json()["reply"]
    assert t_id in t_reply
    assert "Amount" in t_reply
    assert "Risk" in t_reply or "Score" in t_reply
    assert "Human analyst review is required" in t_reply  # AI Safety disclaimer
    assert "definitely fraud" not in t_reply.lower()      # AI Safety rule

    # A2. Member ID Query (Analyst)
    mbr_chat = client.post("/api/agent/chat", json={"message": "What happened with member MBR-400001?"}, headers=a_headers)
    assert mbr_chat.status_code == 200
    m_reply = mbr_chat.json()["reply"]
    assert "MBR-400001" in m_reply
    assert "Savings Balance" in m_reply or "Bank" in m_reply

    # A3. Named Member Query (Analyst)
    # Query a member from DB by name
    members_list = client.get("/api/members?limit=1", headers=a_headers).json()["items"]
    if len(members_list) > 0:
        target_name = members_list[0]["name"]
        name_chat = client.post("/api/agent/chat", json={"message": f"Who is {target_name}?"}, headers=a_headers)
        assert name_chat.status_code == 200
        n_reply = name_chat.json()["reply"]
        assert target_name in n_reply
        assert "Member Profile" in n_reply

    # A4. Top Open Alerts (Analyst)
    alerts_chat = client.post("/api/agent/chat", json={"message": "What are the top open alerts?"}, headers=a_headers)
    assert alerts_chat.status_code == 200
    assert "Open Alert" in alerts_chat.json()["reply"] or "Alert Overview" in alerts_chat.json()["reply"]

    # A5. Network & Graph Pattern Query
    net_chat = client.post("/api/agent/chat", json={"message": "Explain the network pattern"}, headers=a_headers)
    assert net_chat.status_code == 200
    net_reply = net_chat.json()["reply"]
    assert "Network" in net_reply or "Topology" in net_reply
    assert "Fan-In" in net_reply or "Layering" in net_reply

    # ── 3. AI Agent Category B: General Cooperative & Security Questions ──
    # B1. MFA / MFA Code
    mfa_chat = client.post("/api/agent/chat", json={"message": "What is MFA?"}, headers=c_headers)
    assert mfa_chat.status_code == 200
    mfa_reply = mfa_chat.json()["reply"]
    assert "Multi-Factor Authentication" in mfa_reply or "MFA" in mfa_reply
    assert "6-digit" in mfa_reply

    # B2. Becoming a Member
    join_chat = client.post("/api/agent/chat", json={"message": "How can I become a member?"}, headers=c_headers)
    assert join_chat.status_code == 200
    assert "Registration" in join_chat.json()["reply"] or "Share Capital" in join_chat.json()["reply"] or "Join" in join_chat.json()["reply"]

    # B3. Membership Benefits
    benefits_chat = client.post("/api/agent/chat", json={"message": "What are the benefits of becoming a member?"}, headers=c_headers)
    assert benefits_chat.status_code == 200
    b_reply = benefits_chat.json()["reply"]
    assert "Dividend" in b_reply or "Loan" in b_reply or "Benefit" in b_reply or "Savings" in b_reply

    # B4. Transaction Frequency
    freq_chat = client.post("/api/agent/chat", json={"message": "How frequently do transactions occur?"}, headers=c_headers)
    assert freq_chat.status_code == 200
    assert "Real-time" in freq_chat.json()["reply"] or "Frequency" in freq_chat.json()["reply"] or "Velocity" in freq_chat.json()["reply"]

    # B5. Fraud Alert Definition
    alert_def_chat = client.post("/api/agent/chat", json={"message": "What is a fraud alert?"}, headers=c_headers)
    assert alert_def_chat.status_code == 200
    assert "Fraud Alert" in alert_def_chat.json()["reply"] or "Machine Learning" in alert_def_chat.json()["reply"]

    # B6. Risk Score Definition
    risk_def_chat = client.post("/api/agent/chat", json={"message": "What is risk score?"}, headers=c_headers)
    assert risk_def_chat.status_code == 200
    assert "Risk Score" in risk_def_chat.json()["reply"] or "0 to 100" in risk_def_chat.json()["reply"] or "Low Risk" in risk_def_chat.json()["reply"]

    # B7. AML Definition
    aml_chat = client.post("/api/agent/chat", json={"message": "What is AML?"}, headers=c_headers)
    assert aml_chat.status_code == 200
    assert "Anti-Money Laundering" in aml_chat.json()["reply"]

    # B8. About FraudX AI
    about_chat = client.post("/api/agent/chat", json={"message": "What does FraudX AI do?"}, headers=c_headers)
    assert about_chat.status_code == 200
    assert "FraudX AI" in about_chat.json()["reply"]

    # B9. Suspicious Transaction Action
    susp_chat = client.post("/api/agent/chat", json={"message": "What should I do if I see a suspicious transaction?"}, headers=c_headers)
    assert susp_chat.status_code == 200
    assert "Freeze" in susp_chat.json()["reply"] or "Support" in susp_chat.json()["reply"] or "Contact" in susp_chat.json()["reply"]

    # ── 4. Role-Aware Privacy & AI Safety Restrictions ──
    # Customer asks about another member -> Access Restricted (Privacy protection)
    all_members = client.get("/api/members?limit=20", headers=a_headers).json()["items"]
    me_cust = client.get("/api/auth/me", headers=c_headers).json()
    cust_member_id = me_cust.get("member_id") or me_cust.get("memberId")
    other_members = [m for m in all_members if m["member_id"] != cust_member_id]
    if len(other_members) > 0:
        other_name = other_members[0]["name"]
        other_mid = other_members[0]["member_id"]
        
        # Test privacy restriction by name
        cust_priv_name_chat = client.post("/api/agent/chat", json={"message": f"Who is {other_name}?"}, headers=c_headers)
        assert cust_priv_name_chat.status_code == 200
        assert "Access Restricted" in cust_priv_name_chat.json()["reply"]

        # Test privacy restriction by member ID
        cust_priv_id_chat = client.post("/api/agent/chat", json={"message": f"What happened with member {other_mid}?"}, headers=c_headers)
        assert cust_priv_id_chat.status_code == 200
        assert "Access Restricted" in cust_priv_id_chat.json()["reply"]

    # Customer asks for organisation alerts -> Access Restricted
    cust_alt_chat = client.post("/api/agent/chat", json={"message": "Show me top open alerts"}, headers=c_headers)
    assert cust_alt_chat.status_code == 200
    assert "Access Restricted" in cust_alt_chat.json()["reply"]


def test_alert_details_and_persistent_risk_treatment():
    # Login as Analyst
    a_token = get_user_token("analyst@fraudx.ai", "password123")
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # 1. Complete Alert Details & Factual Anomaly Explanations
    alerts_res = client.get("/api/alerts?limit=10", headers=a_headers)
    assert alerts_res.status_code == 200
    alert_items = alerts_res.json()["items"]
    assert len(alert_items) > 0

    for alt in alert_items:
        # Core identification & transaction metadata
        assert alt["alert_id"].startswith("ALT-")
        assert alt["transaction_id"] > 0
        assert alt["transaction_ref_id"] is not None
        assert alt["amount"] > 0
        assert alt["amount_formatted"] is not None
        assert alt["transaction_type"] is not None
        assert alt["status"] in ["Open", "Investigating", "Blocked", "Frozen", "Monitoring", "Whitelisted", "Resolved", "Dismissed"]
        assert alt["risk_level"] in ["Critical", "High", "Medium", "Low"]
        assert 0 <= alt["risk_score"] <= 100

        # Explanation & anomalies (MUST be factual and non-empty)
        assert alt["detection_reason"] is not None and len(alt["detection_reason"].strip()) > 0
        assert isinstance(alt["detected_anomalies"], list) and len(alt["detected_anomalies"]) > 0
        for anom in alt["detected_anomalies"]:
            assert len(anom.strip()) > 0
            # Must be evidence-based
            assert any(term in anom.lower() for term in ["amount", "balance", "drain", "velocity", "channel", "location", "amlsim", "anomaly", "score", "ratio", "transfer", "member", "baseline", "outbound", "cooperative"])

        # Behavioral indicators & AMLSim typology
        assert isinstance(alt["behavioral_indicators"], dict)
        assert "transaction_amount" in alt["behavioral_indicators"]
        assert "balance_drain_percentage" in alt["behavioral_indicators"]
        assert alt["amlsim_typology"] is not None

    # Pick a specific alert to test persistent risk treatments
    target_alert = alert_items[0]
    target_alt_id = target_alert["alert_id"]
    target_txn_ref = target_alert["transaction_ref_id"]

    # 2. Risk Treatment: Block Transaction
    block_res = client.post(
        f"/api/alerts/{target_alt_id}/treatment",
        json={"action": "Block Transaction", "notes": "Confirmed synthetic AMLSim layering pattern"},
        headers=a_headers,
    )
    assert block_res.status_code == 200
    b_data = block_res.json()
    assert b_data["status"] == "Blocked"
    assert "BLOCKED" in b_data["demo_enforcement_status"]
    assert len(b_data["treatment_history"]) > 0

    # 3. Persistence Check (Reload / Re-query)
    # The alert MUST retain "Blocked" status on new request
    re_alt = client.get(f"/api/alerts/{target_alt_id}", headers=a_headers).json()
    assert re_alt["status"] == "Blocked"
    assert "BLOCKED" in re_alt["demo_enforcement_status"]

    # The underlying transaction must remain BLOCKED and NOT deleted
    re_txn = client.get(f"/api/transactions/{target_txn_ref}", headers=a_headers).json()
    assert re_txn["status"] == "Blocked"
    assert re_txn["transaction_id"] == target_txn_ref

    # 4. Risk Treatment: Freeze Account
    freeze_res = client.post(
        f"/api/alerts/{target_alt_id}/treatment",
        json={"action": "Freeze Account", "notes": "Cooperative society account activity suspended"},
        headers=a_headers,
    )
    assert freeze_res.status_code == 200
    assert freeze_res.json()["status"] == "Frozen"

    # 5. Risk Treatment: Enhanced Monitoring
    mon_res = client.post(
        f"/api/alerts/{target_alt_id}/treatment",
        json={"action": "Enhanced Monitoring", "notes": "Active 30-day velocity watch enabled"},
        headers=a_headers,
    )
    assert mon_res.status_code == 200
    assert mon_res.json()["status"] == "Monitoring"

    # 6. Risk Treatment: Whitelist
    white_res = client.post(
        f"/api/alerts/{target_alt_id}/treatment",
        json={"action": "Whitelist", "notes": "Verified legitimate agricultural equipment purchase"},
        headers=a_headers,
    )
    assert white_res.status_code == 200
    assert white_res.json()["status"] == "Whitelisted"
    assert white_res.json()["resolved_at"] is not None

    # 7. Customer RBAC Enforcement: Customer receives 403 on treatment endpoints
    c_token = get_user_token("customer@fraudx.ai", "password123")
    c_headers = {"Authorization": f"Bearer {c_token}"}

    c_treat_alert = client.post(f"/api/alerts/{target_alt_id}/treatment", json={"action": "Block Transaction"}, headers=c_headers)
    assert c_treat_alert.status_code == 403

    c_treat_risk = client.post("/api/risk/treatment", json={"alert_id": target_alt_id, "action": "Block Transaction"}, headers=c_headers)
    assert c_treat_risk.status_code == 403

    # 8. Audit Trail Verification
    audit_res = client.get("/api/audit?limit=20", headers=a_headers)
    assert audit_res.status_code == 200
    audit_items = audit_res.json()["items"]
    assert len(audit_items) > 0

    # Ensure our treatment action is recorded in audit log
    treatment_audits = [a for a in audit_items if "TREATMENT" in a["action"] or a["entity_id"] == target_alt_id]
    assert len(treatment_audits) > 0
    t_log = treatment_audits[0]
    assert t_log["actor"] == "analyst@fraudx.ai"
    assert t_log["actor_role"] == "analyst"
    assert t_log["new_value"] is not None


def test_reports_traceability_and_readable_formats():
    # 1. Authenticate Analyst & Customer
    a_token = get_user_token("analyst@fraudx.ai", "password123")
    a_headers = {"Authorization": f"Bearer {a_token}"}

    c_token = get_user_token("customer@fraudx.ai", "password123")
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # 2. RBAC Enforcement: Customer cannot access reports
    cust_list = client.get("/api/reports", headers=c_headers)
    assert cust_list.status_code == 403

    cust_gen = client.get("/api/reports/transaction-summary", headers=c_headers)
    assert cust_gen.status_code == 403

    # 3. Analyst list available reports
    rep_list = client.get("/api/reports", headers=a_headers)
    assert rep_list.status_code == 200
    reports = rep_list.json()
    assert len(reports) >= 6
    rep_ids = [r["id"] for r in reports]
    for expected_id in ["transaction-summary", "fraud-detection", "risk-assessment", "audit-trail", "anomaly-summary", "executive-summary"]:
        assert expected_id in rep_ids

    # 4. Consistency Check: Dashboard vs Reports Live Database Numbers
    dash_stats = client.get("/api/dashboard/stats", headers=a_headers).json()
    live_tx_count = dash_stats["totalTransactions"]
    live_tx_volume = dash_stats["totalAmount"]
    live_open_alerts = dash_stats["openAlerts"]

    txn_rep = client.get("/api/reports/transaction-summary?format=json", headers=a_headers).json()
    assert txn_rep["transaction_metrics"]["total_transactions"] == live_tx_count
    assert txn_rep["transaction_metrics"]["total_volume_inr"] == live_tx_volume
    assert txn_rep["traceability"]["transactions_analyzed"] == live_tx_count
    assert "Live SQLite Database" in txn_rep["traceability"]["source"]
    assert "Isolation Forest" in txn_rep["traceability"]["methodology"]
    assert txn_rep["data_period"] is not None and len(txn_rep["data_period"]) > 0

    # Risk distribution matching
    rd = txn_rep["risk_distribution"]
    assert "low" in rd and "medium" in rd and "high" in rd and "critical" in rd
    assert rd["low"]["count"] + rd["medium"]["count"] + rd["high"]["count"] + rd["critical"]["count"] == live_tx_count

    # Alert report matching
    fraud_rep = client.get("/api/reports/fraud-detection?format=json", headers=a_headers).json()
    assert fraud_rep["alert_metrics"]["open"] == live_open_alerts
    assert len(fraud_rep["top_alerts"]) > 0
    top_a = fraud_rep["top_alerts"][0]
    assert "alert_id" in top_a and "transaction_ref" in top_a and "amount_formatted" in top_a
    assert "risk_score" in top_a and "detection_reason" in top_a

    # 5. Human-Readable PDF Generation Verification
    for r_id in ["transaction-summary", "fraud-detection", "risk-assessment", "audit-trail", "anomaly-summary", "executive-summary"]:
        pdf_res = client.get(f"/api/reports/{r_id}?format=pdf", headers=a_headers)
        assert pdf_res.status_code == 200
        assert "application/pdf" in pdf_res.headers["content-type"]
        assert f"fraudx_{r_id}_" in pdf_res.headers["content-disposition"]
        assert len(pdf_res.content) > 1000  # Valid binary size
        assert pdf_res.content.startswith(b"%PDF-")  # Valid PDF header magic bytes

    # 6. Structured CSV Export Verification
    csv_tx = client.get("/api/reports/transaction-summary?format=csv", headers=a_headers)
    assert csv_tx.status_code == 200
    assert "text/csv" in csv_tx.headers["content-type"]
    assert "Transaction ID" in csv_tx.text
    assert "Amount (INR)" in csv_tx.text
    assert "Risk Score" in csv_tx.text
    assert len(csv_tx.text.splitlines()) > 100

    csv_alt = client.get("/api/reports/fraud-detection?format=csv", headers=a_headers)
    assert csv_alt.status_code == 200
    assert "Alert ID" in csv_alt.text
    assert "Risk Score" in csv_alt.text
    assert "Detection Reason" in csv_alt.text

    csv_aud = client.get("/api/reports/audit-trail?format=csv", headers=a_headers)
    assert csv_aud.status_code == 200
    assert "Actor" in csv_aud.text
    assert "Action" in csv_aud.text


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("Running Full Backend Verification Suite...")
    test_root_and_health()
    print("  [OK] Root & health OK")
    test_auth_login_and_profile_data()
    print("  [OK] Auth login & Profile completeness OK")
    test_mfa_and_face_verification()
    print("  [OK] Server-side MFA & Face verification OK")
    test_customer_registration_persistence_and_isolation()
    print("  [OK] Customer registration, persistence & Data Isolation OK")
    test_customer_rbac_denials()
    print("  [OK] Customer RBAC denials (403 on protected routes) OK")
    test_analyst_and_organisation_access()
    print("  [OK] Analyst & Organisation access OK")
    test_alert_details_and_persistent_risk_treatment()
    print("  [OK] Complete Alert Details & Persistent Risk Treatment OK")
    test_transaction_explanations_location_and_ai_agent()
    print("  [OK] Transaction Explanations, Location & AI Agent OK")
    test_reports_traceability_and_readable_formats()
    print("  [OK] Reports Traceability & Readable PDF/CSV/JSON Formats OK")
    print("\nALL COMPREHENSIVE BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")



