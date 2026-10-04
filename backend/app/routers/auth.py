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
    MfaVerifyRequest, FaceVerifyRequest, MfaChallengeResponse, ResendMfaRequest,
    EmailVerifyRequest, EmailVerifyResponse, RegisterResponse,
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
    create_registration_challenge,
    resend_auth_challenge,
    create_account_verification_token,
    verify_account_token,
    is_demo_account,
    AUTH_CHALLENGES,
)
from app.services.email_service import send_account_verification_email, send_verification_email
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
    2. If demo account (Customer, Analyst, Organisation demo credentials):
       Direct login succeeds without requiring email OTP.
    3. If registered non-demo account:
       Requires email_verified == True before login.
    4. If mfa_code is provided in payload, validates the code and completes login.
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

    # Demo accounts allow direct login without email OTP requirement
    is_demo = is_demo_account(user, identifier)

    if not is_demo:
        if not user.email_verified and not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address with the 6-digit verification code before signing in.",
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
    elif not is_demo and getattr(user, "mfa_enabled", False):
        # Generate random 6-digit OTP and send to authenticated user email address
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


@router.post("/register", response_model=RegisterResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Registers / enrols a new user for any of the three roles:
    1. Customer: Creates cooperative Member + 4 baseline transactions + User.
    2. Analyst: Creates Analyst User with clearance and analyst_id.
    3. Organisation: Creates Organisation Admin User.
    Generates a secure 6-digit OTP, sends it via Resend, and returns session challenge.
    """
    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if existing and existing.email_verified:
        role_label = existing.role.value.capitalize()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email is already registered as an active {role_label} account. Please sign in instead.",
        )

    # If pending/unverified user exists, update details & resend OTP
    if existing and not existing.email_verified:
        existing.hashed_password = get_password_hash(payload.password)
        existing.name = payload.name.strip()
        if payload.phone:
            existing.phone = payload.phone.strip()
        if payload.city:
            existing.city = payload.city.strip()
        if payload.role == UserRole.analyst:
            if payload.analyst_id:
                existing.analyst_id = payload.analyst_id.strip()
            if payload.designation:
                existing.designation = payload.designation.strip()
            if payload.specialization:
                existing.specialization = payload.specialization.strip()
        elif payload.role == UserRole.organisation:
            if payload.organisation_id:
                existing.organisation_id = payload.organisation_id.strip()
        db.commit()
        db.refresh(existing)
        new_user = existing
        new_member = existing.member
    else:
        # Create brand new user record based on role
        if payload.role == UserRole.customer:
            member_count = db.query(func.count(Member.id)).scalar() or 0
            next_num = 400001 + member_count
            unique_mbr_id = f"MBR-{next_num}"
            unique_acc_id = f"ACC-{900000 + member_count + 1}"
            unique_aml_acc_id = f"C{9000000000 + member_count + 1}"

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

            first_member = db.query(Member).order_by(Member.id.asc()).first()
            partner_id = first_member.id if first_member else new_member.id
            _seed_customer_initial_transactions(db, new_member, partner_id)

            new_user = User(
                email=clean_email,
                hashed_password=get_password_hash(payload.password),
                name=payload.name.strip(),
                role=UserRole.customer,
                phone=new_member.phone,
                city=new_member.city,
                organisation_id="ORG-APEX-01",
                member_id=new_member.member_id,
                designation="Cooperative Society Member",
                is_active=False,
                email_verified=False,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

        elif payload.role == UserRole.analyst:
            analyst_count = db.query(func.count(User.id)).filter(User.role == UserRole.analyst).scalar() or 0
            analyst_id_val = payload.analyst_id.strip() if payload.analyst_id else f"ANL-{200000 + analyst_count + 1}"
            new_member = None

            new_user = User(
                email=clean_email,
                hashed_password=get_password_hash(payload.password),
                name=payload.name.strip(),
                role=UserRole.analyst,
                phone=payload.phone.strip() if payload.phone else "+91 98765 43210",
                city=payload.city.strip() if payload.city else "Mumbai",
                organisation_id=payload.organisation_id.strip() if payload.organisation_id else "ORG-APEX-01",
                analyst_id=analyst_id_val,
                designation=payload.designation.strip() if payload.designation else "Financial Crime Analyst",
                specialization=payload.specialization.strip() if payload.specialization else "Behavioral Anomaly & Network Laundering",
                clearance_level=payload.clearance_level.strip() if payload.clearance_level else "Level 2 - Operational Access",
                is_active=False,
                email_verified=False,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

        elif payload.role == UserRole.organisation:
            new_member = None
            org_id_val = payload.organisation_id.strip() if payload.organisation_id else "ORG-APEX-01"

            new_user = User(
                email=clean_email,
                hashed_password=get_password_hash(payload.password),
                name=payload.name.strip(),
                role=UserRole.organisation,
                phone=payload.phone.strip() if payload.phone else "+91 91234 56780",
                city=payload.city.strip() if payload.city else "Mumbai",
                organisation_id=org_id_val,
                designation=payload.designation.strip() if payload.designation else "Chief Compliance Officer & Cooperative Administrator",
                is_active=False,
                email_verified=False,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role specified for registration",
            )

    # Generate 6-digit OTP challenge and dispatch real email via Resend
    challenge = create_registration_challenge(new_user, clean_email)
    # Also create fallback legacy token for backward compatibility
    create_account_verification_token(new_user.id, new_user.email, expires_hours=24)

    role_messages = {
        UserRole.customer: f"Verification code sent to {clean_email}. Please enter the 6-digit code to activate your account.",
        UserRole.analyst: f"Analyst clearance verification code sent to {clean_email}. Please enter the 6-digit code to verify your profile.",
        UserRole.organisation: f"Organisation verification code sent to {clean_email}. Please enter the 6-digit code to complete registration.",
    }

    return RegisterResponse(
        success=True,
        message=role_messages.get(new_user.role, f"Verification code sent to {clean_email}."),
        email=clean_email,
        role=new_user.role.value,
        challenge_id=challenge["session_id"],
        session_id=challenge["session_id"],
        member_id=new_member.member_id if new_member else None,
        account_id=new_member.account_id if new_member else None,
        verification_required=True,
    )


@router.post("/verify-registration-otp", response_model=AuthResponse)
@router.post("/verify-email")
def verify_registration_otp(payload: EmailVerifyRequest, db: Session = Depends(get_db)):
    """
    Validates submitted 6-digit registration verification code (or legacy URL token).
    Upon successful validation:
    1. Sets email_verified = True and is_active = True on the database User record.
    2. Issues a full JWT access token so the user is immediately authenticated.
    """
    code = (payload.otp or payload.code or "").strip()
    session_id = payload.challenge_id or payload.session_id
    token_str = (payload.token or "").strip()

    # Legacy token validation fallback
    if token_str and not code:
        user = verify_account_token(token_str, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid, expired, or already used verification link.",
            )
    else:
        # 6-Digit OTP verification
        if not code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification code cannot be empty",
            )

        challenge = None
        if session_id and session_id in AUTH_CHALLENGES:
            challenge = AUTH_CHALLENGES[session_id]
        elif payload.email:
            clean_email = payload.email.strip().lower()
            now = datetime.utcnow()
            for cid, cdata in list(AUTH_CHALLENGES.items()):
                if (cdata["email"].lower() == clean_email or cdata.get("target_email", "").lower() == clean_email):
                    if cdata["expires_at"] > now and not cdata.get("used", False):
                        challenge = cdata
                        session_id = cid
                        break

        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification session has expired or is invalid. Please request a new verification code.",
            )

        # Check expiration & max attempts
        if challenge["expires_at"] < datetime.utcnow() or challenge.get("used", False):
            AUTH_CHALLENGES.pop(session_id, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification code has expired. Please request a new code.",
            )

        user = db.query(User).filter(User.id == challenge["user_id"]).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account associated with this verification session was not found.",
            )

        if challenge["mfa_code"] != code:
            challenge["attempts"] = challenge.get("attempts", 0) + 1
            remaining = max(0, challenge.get("max_attempts", 5) - challenge["attempts"])
            if remaining == 0:
                AUTH_CHALLENGES.pop(session_id, None)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Maximum verification attempts exceeded. Please register or request a new code.",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Incorrect verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
            )

        # Correct OTP! Mark single use and consume challenge
        challenge["mfa_verified"] = True
        challenge["used"] = True
        AUTH_CHALLENGES.pop(session_id, None)

        user.email_verified = True
        user.is_active = True
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)

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


@router.post("/resend-registration-otp")
def resend_registration_otp(payload: ResendMfaRequest, db: Session = Depends(get_db)):
    """
    Resends a freshly generated 6-digit registration OTP to the user's email with 30s cooldown.
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


@router.get("/verify-email", response_model=EmailVerifyResponse)
def verify_email_get(token: str, db: Session = Depends(get_db)):
    """
    Validates account verification token via link click (legacy compatibility).
    """
    user = verify_account_token(token.strip(), db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used verification link.",
        )
    return EmailVerifyResponse(
        success=True,
        message="Account verified successfully! You can now sign in with your email and password.",
        email=user.email,
    )


