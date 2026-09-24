"""
FraudX AI — Authentication Router
Provides JWT login, MFA/Face secondary verification, customer self-registration with
persistent member and transaction initialization, logout, and profile resolution.
"""
from datetime import datetime, date, timedelta
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.member import Member, RiskStatus
from app.models.transaction import Transaction, RiskLevel, TransactionStatus
from app.schemas.auth import (
    LoginRequest, Token, UserResponse, AuthResponse, UserCreate,
    MfaVerifyRequest, FaceVerifyRequest, MfaChallengeResponse, ResendMfaRequest
)
from app.services.auth_service import (
    verify_password,
    create_access_token,
    get_current_user,
    get_password_hash,
    validate_mfa_code,
    validate_face_verification,
    build_user_response,
    create_auth_challenge,
    resend_auth_challenge,
    AUTH_CHALLENGES,
)
from app.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


def _seed_customer_initial_transactions(db: Session, member: Member, partner_member_id: int):
    """
    Seeds 4 realistic, isolated cooperative transactions for a newly registered customer.
    Uses existing AMLSim-derived schema, low risk score (<25), and realistic metadata.
    """
    now = datetime.utcnow()
    t_count = db.query(func.count(Transaction.id)).scalar() or 0
    base_id = 900000 + t_count

    sample_txns = [
        {
            "offset_hours": 72,
            "type": "UPI",
            "amount": 5000.00,
            "purpose": "Share Capital Deposit",
            "is_sender": False,
            "device": "Mobile Banking App",
        },
        {
            "offset_hours": 48,
            "type": "NEFT",
            "amount": 25000.00,
            "purpose": "Monthly Savings Credit",
            "is_sender": False,
            "device": "Cooperative NetBanking",
        },
        {
            "offset_hours": 24,
            "type": "UPI",
            "amount": 1450.00,
            "purpose": "Agricultural Seeds & Fertilizer",
            "is_sender": True,
            "device": "Mobile QR Payment",
        },
        {
            "offset_hours": 6,
            "type": "IMPS",
            "amount": 850.00,
            "purpose": "Utility & Irrigation Bill",
            "is_sender": True,
            "device": "UPI Web Portal",
        },
    ]

    for idx, item in enumerate(sample_txns):
        s_id = member.id if item["is_sender"] else partner_member_id
        r_id = partner_member_id if item["is_sender"] else member.id
        ts = now - timedelta(hours=item["offset_hours"])
        txn_ref = f"TXN-{base_id + idx + 1}"

        txn = Transaction(
            transaction_id=txn_ref,
            amlsim_step=int(ts.timestamp() % 1000),
            amlsim_type="TRANSFER" if item["type"] != "CASH_IN" else "CASH_IN",
            amount=item["amount"],
            old_balance_orig=25000.00 if item["is_sender"] else 100000.00,
            new_balance_orig=(25000.00 - item["amount"]) if item["is_sender"] else 100000.00,
            old_balance_dest=50000.00,
            new_balance_dest=50000.00 + item["amount"],
            is_fraud_label=False,
            is_flagged_fraud=False,
            sender_id=s_id,
            receiver_id=r_id,
            transaction_type=item["type"],
            device=item["device"],
            location_city=member.city,
            location_state=member.state,
            lat=member.lat,
            lng=member.lng,
            purpose=item["purpose"],
            risk_score=14.5,
            risk_level=RiskLevel.low,
            anomaly_score=0.12,
            anomaly_factors=["Standard baseline cooperative society transaction"],
            status=TransactionStatus.completed,
            timestamp=ts,
            created_at=ts,
        )
        db.add(txn)


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint:
    1. Validates email/ID and password.
    2. If customer role: completes login and returns AuthResponse.
    3. If analyst or organisation: generates random 6-digit OTP, sends it to the user's email,
       and returns MFA challenge (does NOT return the OTP or final JWT).
    4. If mfa_code is already provided in the payload, validates the code and completes login.
    """
    identifier = payload.email.strip().lower()
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == identifier,
            func.lower(User.member_id) == identifier,
            func.lower(User.organisation_id) == identifier,
            func.lower(User.analyst_id) == identifier,
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/ID or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # If face verification failure is reported
    if payload.face_verified is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Secondary face verification failed. Authentication terminated.",
        )

    # If MFA verification code is explicitly provided in login payload, validate it strictly
    if payload.mfa_code is not None:
        if not payload.mfa_code.strip() or not validate_mfa_code(user, payload.mfa_code, payload.session_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or empty MFA verification code",
            )
    elif user.role in [UserRole.analyst, UserRole.organisation]:
        # Generate random 6-digit OTP and send to entered email address
        challenge = create_auth_challenge(user, entered_email=payload.email)
        return {
            "mfa_required": True,
            "challenge_id": challenge["session_id"],
            "session_id": challenge["session_id"],
            "email": user.email,
            "role": user.role.value,
            "message": "A 6-digit verification code has been sent to your email.",
            "expires_in": 300,
            "status": "challenge_required",
        }

    user.last_login = datetime.utcnow()
    db.commit()

    token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role.value,
            "user_id": user.id,
            "member_id": user.member_id,
        },
        expires_delta=token_expires,
    )

    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        ),
        user=build_user_response(user, db),
    )


@router.post("/challenge")
@router.post("/mfa/challenge")
def request_challenge(payload: dict, db: Session = Depends(get_db)):
    """
    Initiates a time-bounded (5 min) server-side secondary verification challenge session
    and sends a 6-digit verification code to the user's email.
    """
    identifier = payload.get("email", "").strip().lower()
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == identifier,
            func.lower(User.member_id) == identifier,
            func.lower(User.organisation_id) == identifier,
            func.lower(User.analyst_id) == identifier,
        )
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User identity not found for challenge initialization",
        )
    challenge = create_auth_challenge(user, entered_email=payload.get("email"))
    return {
        "status": "challenge_required",
        "session_id": challenge["session_id"],
        "challenge_id": challenge["session_id"],
        "mfa_required": True,
        "face_required": user.role in [UserRole.analyst, UserRole.organisation],
        "email": user.email,
        "role": user.role.value,
        "message": "A 6-digit verification code has been sent to your email.",
        "expires_in": 300,
    }


@router.post("/mfa/verify", response_model=AuthResponse)
@router.post("/verify-mfa", response_model=AuthResponse)
def verify_mfa(payload: MfaVerifyRequest, db: Session = Depends(get_db)):
    """
    Validates submitted 6-digit verification code against the server-side challenge session.
    Rejects empty, incorrect, or expired codes with HTTP 401.
    Allows maximum of 5 incorrect attempts.
    Invalidates session challenge upon successful single use and issues JWT token.
    """
    submitted_code = (payload.otp or payload.code or "").strip()
    session_id = payload.challenge_id or payload.session_id

    if not submitted_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification code cannot be empty",
        )

    user = None

    # If session_id provided, look up from active server challenges
    if session_id:
        if session_id not in AUTH_CHALLENGES:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication challenge session expired or invalid",
            )
        s_data = AUTH_CHALLENGES[session_id]
        if s_data["expires_at"] < datetime.utcnow() or s_data.get("used", False):
            AUTH_CHALLENGES.pop(session_id, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication challenge session expired or already consumed",
            )
        user = db.query(User).filter(User.id == s_data["user_id"]).first()

        # If email was also explicitly sent, verify it matches the session user
        if payload.email and user and user.email.lower() != payload.email.strip().lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA challenge session does not match the specified user email",
            )

    # Fallback to direct email resolution
    if not user and payload.email:
        user = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired or user not found",
        )

    # Validate code strictly
    if not validate_mfa_code(user, submitted_code, session_id):
        # Calculate remaining attempts if session exists
        if session_id and session_id in AUTH_CHALLENGES:
            chal = AUTH_CHALLENGES[session_id]
            remaining = max(0, chal.get("max_attempts", 5) - chal.get("attempts", 0))
            if remaining == 0:
                AUTH_CHALLENGES.pop(session_id, None)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Maximum verification attempts exceeded. Please login again.",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Incorrect MFA verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect MFA verification code. Please check your verification code.",
        )

    # Invalidate challenge after successful use so it cannot be replayed
    if session_id and session_id in AUTH_CHALLENGES:
        AUTH_CHALLENGES.pop(session_id, None)

    user.last_login = datetime.utcnow()
    db.commit()

    token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role.value,
            "user_id": user.id,
            "member_id": user.member_id,
        },
        expires_delta=token_expires,
    )

    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        ),
        user=build_user_response(user, db),
    )


@router.post("/resend-mfa")
@router.post("/mfa/resend")
@router.post("/resend-code")
def resend_mfa(payload: ResendMfaRequest, db: Session = Depends(get_db)):
    """
    Resends a new 6-digit verification code to the user's email address.
    Invalidates the previous OTP, enforces a 30-second cooldown, and resets the 5-minute timer.
    """
    session_id = payload.challenge_id or payload.session_id
    user = None
    if payload.email:
        user = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()

    return resend_auth_challenge(
        session_id=session_id,
        email=payload.email,
        user=user,
        cooldown_seconds=30,
    )


@router.post("/face/verify")
@router.post("/verify-face")
def verify_face(payload: FaceVerifyRequest, db: Session = Depends(get_db)):
    """
    Validates demonstration secondary face/liveness verification state.
    Rejects failed or incomplete verification with HTTP 401.
    Does NOT issue a JWT or access token directly.
    """
    if not payload.verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face verification failed or was rejected. Access denied.",
        )

    user = None
    if payload.email:
        user = db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first()

    if payload.session_id:
        from app.services.auth_service import AUTH_CHALLENGES, validate_face_verification
        if payload.session_id not in AUTH_CHALLENGES:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired challenge session ID",
            )
        if not validate_face_verification(payload.session_id, payload.verified, user):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Face verification session validation failed",
            )

    return {
        "status": "success",
        "verified": True,
        "message": "Demonstration face liveness verification confirmed for session",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_response(current_user, db)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully", "user": current_user.email}


@router.post("/register", response_model=AuthResponse)
def register_customer(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new Customer:
    1. Generates unique cooperative member_id and account_id.
    2. Creates a persistent Member record in the database.
    3. Seeds realistic, customer-specific transactions linked to that Member.
    4. Creates the persistent User record linked to member_id.
    5. Returns an authenticated session with full database-backed profile info.
    """
    if payload.role != UserRole.customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is only allowed for customer accounts",
        )

    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please sign in instead.",
        )

    # Generate unique cooperative Member IDs
    member_count = db.query(func.count(Member.id)).scalar() or 0
    next_num = 400001 + member_count
    unique_mbr_id = f"MBR-{next_num}"
    unique_acc_id = f"ACC-{900000 + member_count + 1}"
    unique_aml_acc_id = f"C{9000000000 + member_count + 1}"

    # City & Location mapping
    customer_city = payload.city.strip() if payload.city else "Chennai"
    city_coords = {
        "mumbai": (19.0760, 72.8777, "Maharashtra"),
        "chennai": (13.0827, 80.2707, "Tamil Nadu"),
        "bangalore": (12.9716, 77.5946, "Karnataka"),
        "delhi": (28.6139, 77.2090, "Delhi"),
        "hyderabad": (17.3850, 78.4867, "Telangana"),
        "kolkata": (22.5726, 88.3639, "West Bengal"),
        "pune": (18.5204, 73.8567, "Maharashtra"),
        "coimbatore": (11.0168, 76.9558, "Tamil Nadu"),
        "madurai": (9.9252, 78.1198, "Tamil Nadu"),
    }
    coords = city_coords.get(customer_city.lower(), (13.0827, 80.2707, "Tamil Nadu"))
    lat, lng, state = coords[0], coords[1], coords[2]

    # Create persistent Member record
    new_member = Member(
        member_id=unique_mbr_id,
        amlsim_account_id=unique_aml_acc_id,
        name=payload.name.strip(),
        email=clean_email,
        phone=payload.phone.strip() if payload.phone else "+91 98765 00000",
        city=customer_city,
        state=state,
        lat=lat + (random.random() - 0.5) * 0.02,
        lng=lng + (random.random() - 0.5) * 0.02,
        bank="Apex Urban Cooperative Bank",
        account_id=unique_acc_id,
        account_type="Savings",
        join_date=date.today(),
        verified=True,
        share_capital=5000.0,
        savings_balance=25000.0,
        loan_outstanding=0.0,
        risk_status=RiskStatus.low,
    )
    db.add(new_member)
    db.flush()

    # Find partner member (first cooperative institution member) for initial transactions
    first_member = db.query(Member).order_by(Member.id.asc()).first()
    partner_id = first_member.id if first_member else new_member.id

    # Seed initial isolated customer transactions
    _seed_customer_initial_transactions(db, new_member, partner_id)

    # Create persistent User record
    new_user = User(
        email=clean_email,
        hashed_password=get_password_hash(payload.password),
        name=payload.name.strip(),
        role=UserRole.customer,
        phone=new_member.phone,
        city=new_member.city,
        organisation_id="ORG-APEX-01",
        member_id=new_member.member_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={
            "sub": new_user.email,
            "role": new_user.role.value,
            "user_id": new_user.id,
            "member_id": new_user.member_id,
        },
        expires_delta=token_expires,
    )

    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        ),
        user=build_user_response(new_user, db),
    )

