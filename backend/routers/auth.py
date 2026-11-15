import secrets
from datetime import datetime, timezone, timedelta
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

# In-memory OTP store: phone -> {"code": str, "expires_at": datetime}
pending_otps: dict = {}

# --- Placeholder token store (replace with JWT later) ---
# In-memory token store: token -> farmer_id
active_tokens: dict = {}


def _generate_farmer_id(db: Session) -> str:
    """Generate next farmer_id like farmer_002, farmer_003, ..."""
    max_id = db.query(sql_func.max(models.Farmer.id)).scalar() or 0
    return f"farmer_{max_id + 1:03d}"


def _get_current_farmer(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Extract and validate bearer token, return farmer."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization[7:]
    farmer_id = active_tokens.get(token)
    if not farmer_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    farmer = db.query(models.Farmer).filter(models.Farmer.farmer_id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=401, detail="Farmer not found")
    return farmer


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
    return farmer


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
    token = secrets.token_urlsafe(32)  # placeholder random token
    active_tokens[token] = farmer.farmer_id

    return {
        "token": token,
        "farmer": FarmerOut.model_validate(farmer).model_dump(),
    }


# GET /auth/me — return current farmer from bearer token
@router.get("/me", response_model=FarmerOut)
def get_me(farmer=Depends(_get_current_farmer)):
    return farmer
