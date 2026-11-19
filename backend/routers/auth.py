import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from database import get_db
import models
from schemas import SignupRequest, OTPRequest, OTPVerify, FarmerOut

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- Placeholder OTP (replace with Twilio SMS later) ---
FAKE_OTP = "123456"
OTP_VALIDITY_SECONDS = 300  # 5 minutes
TOKEN_EXPIRY_DAYS = 30

# In-memory OTP store: phone -> {"code": str, "expires_at": datetime}
pending_otps: dict = {}


def hash_token(token: str) -> str:
    """Return SHA-256 hash of a plaintext token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_farmer_token(db: Session, farmer_id: str) -> str:
    """Generate a random 32-byte urlsafe token, persist its SHA-256 hash, and return the raw token."""
    raw_token = secrets.token_urlsafe(32)
    token_h = hash_token(raw_token)
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(days=TOKEN_EXPIRY_DAYS)

    db_token = models.AuthToken(
        farmer_id=farmer_id,
        token_hash=token_h,
        created_at=now_utc,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()
    return raw_token


def _generate_farmer_id(db: Session) -> str:
    """Generate next farmer_id like farmer_002, farmer_003, ..."""
    max_id = db.query(sql_func.max(models.Farmer.id)).scalar() or 0
    return f"farmer_{max_id + 1:03d}"


def get_current_farmer(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> models.Farmer:
    """Extract and validate bearer token, return farmer or raise 401 with plain message."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )
    raw_token = authorization[7:].strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )

    token_h = hash_token(raw_token)
    db_token = (
        db.query(models.AuthToken)
        .filter(models.AuthToken.token_hash == token_h)
        .first()
    )
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    now_utc = datetime.now(timezone.utc)
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now_utc > expires_at:
        db.delete(db_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
        )

    farmer = (
        db.query(models.Farmer)
        .filter(models.Farmer.farmer_id == db_token.farmer_id)
        .first()
    )
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Farmer account not found",
        )
    return farmer


_get_current_farmer = get_current_farmer


# POST /auth/signup — create a new farmer account
@router.post("/signup", response_model=FarmerOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    # Check if phone already registered
    existing = db.query(models.Farmer).filter(models.Farmer.phone == body.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="Phone number is already registered")

    farmer = models.Farmer(
        farmer_id=_generate_farmer_id(db),
        name=body.name,
        phone=body.phone,
        village=body.village,
        preferred_language=body.preferred_language,
    )
    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    token = create_farmer_token(db, farmer.farmer_id)
    out = FarmerOut.model_validate(farmer)
    out.token = token
    return out


# POST /auth/request-otp — send fake OTP to registered phone
@router.post("/request-otp")
def request_otp(body: OTPRequest, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.phone == body.phone).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="No account found for this phone number")

    # Store OTP with expiry
    pending_otps[body.phone] = {
        "code": FAKE_OTP,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=OTP_VALIDITY_SECONDS),
    }

    # Print to console for testing (replace with SMS send later)
    print(f"[OTP] Phone: {body.phone}, Code: {FAKE_OTP}")

    return {"message": "OTP sent", "expires_in_seconds": OTP_VALIDITY_SECONDS}


# POST /auth/verify-otp — verify OTP and return token + farmer
@router.post("/verify-otp")
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    entry = pending_otps.get(body.phone)

    if not entry:
        raise HTTPException(status_code=400, detail="No pending OTP for this phone number")

    if datetime.now(timezone.utc) > entry["expires_at"]:
        del pending_otps[body.phone]
        raise HTTPException(status_code=400, detail="OTP has expired")

    if body.otp != entry["code"]:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    # OTP valid — clean up and issue token
    del pending_otps[body.phone]

    farmer = db.query(models.Farmer).filter(models.Farmer.phone == body.phone).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    token = create_farmer_token(db, farmer.farmer_id)

    return {
        "token": token,
        "farmer": FarmerOut.model_validate(farmer).model_dump(),
    }


# POST /auth/logout — delete the current token
@router.post("/logout")
def logout(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )
    raw_token = authorization[7:].strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )

    token_h = hash_token(raw_token)
    db_token = (
        db.query(models.AuthToken)
        .filter(models.AuthToken.token_hash == token_h)
        .first()
    )
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    db.delete(db_token)
    db.commit()
    return {"message": "Logged out successfully"}


# GET /auth/me — return current farmer from bearer token
@router.get("/me", response_model=FarmerOut)
def get_me(farmer: models.Farmer = Depends(get_current_farmer)):
    return farmer
