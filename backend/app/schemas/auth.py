"""
FraudX AI — Pydantic Schemas for Authentication and Users
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: str  # user email
    role: str
    user_id: int
    member_id: Optional[str] = None
    exp: int


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None  # Optional requested role context
    mfa_code: Optional[str] = None
    face_verified: Optional[bool] = None
    session_id: Optional[str] = None


class MfaChallengeResponse(BaseModel):
    mfa_required: bool = True
    challenge_id: str
    session_id: str
    email: str
    role: str
    message: str = "Verification code sent to your email"
    expires_in: int = 300
    status: str = "challenge_required"


class MfaVerifyRequest(BaseModel):
    challenge_id: Optional[str] = None
    session_id: Optional[str] = None
    code: Optional[str] = None
    otp: Optional[str] = None
    email: Optional[str] = None


class ResendMfaRequest(BaseModel):
    challenge_id: Optional[str] = None
    session_id: Optional[str] = None
    email: Optional[str] = None


class FaceVerifyRequest(BaseModel):
    email: Optional[str] = None
    session_id: Optional[str] = None
    verified: bool
    confidence: Optional[float] = None
    notes: Optional[str] = None


class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    city: Optional[str] = None
    organisation_id: Optional[str] = None
    member_id: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    # Organisation & Member references
    organisation: Optional[str] = None
    organisation_id: Optional[str] = None
    org_id: Optional[str] = None
    orgId: Optional[str] = None
    member_id: Optional[str] = None
    memberId: Optional[str] = None

    # Member account details (for customers)
    account_id: Optional[str] = None
    accountId: Optional[str] = None
    bank: Optional[str] = None
    account_type: Optional[str] = None
    savings_balance: Optional[float] = None
    loan_outstanding: Optional[float] = None
    share_capital: Optional[float] = None
    verified: Optional[bool] = None
    join_date: Optional[str] = None
    joinDate: Optional[str] = None

    # Analyst profile details
    analyst_id: Optional[str] = None
    analystId: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    clearance_level: Optional[str] = None
    clearanceLevel: Optional[str] = None
    cases_investigated: Optional[int] = 0
    casesInvestigated: Optional[int] = 0


class AuthResponse(BaseModel):
    token: Token
    user: UserResponse

