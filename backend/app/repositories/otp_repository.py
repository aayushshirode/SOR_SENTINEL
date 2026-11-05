"""
SOR SENTINEL — OTP Repository
Manages secure generation, hashing, rate-limiting, and verification of OTPs and reset tokens.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.otp import OTPVerification
from app.core.logging import get_logger

logger = get_logger(__name__)


def hash_token(token: str) -> str:
    """Compute SHA-256 hex digest of a token/OTP."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


def generate_otp(digits: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    # Guarantees exactly `digits` digits without leading zero ambiguity (e.g. 100000 - 999999)
    low = 10 ** (digits - 1)
    high = (10 ** digits) - 1
    return str(secrets.randbelow(high - low + 1) + low)


def generate_reset_token() -> str:
    """Generate a cryptographically secure URL-safe password reset token."""
    return secrets.token_urlsafe(32)


def create_otp(
    db: Session,
    email: str,
    purpose: str,
    user_id: Optional[int] = None,
    expiry_minutes: int = 5,
    cooldown_seconds: int = 60,
) -> Tuple[OTPVerification, str]:
    """
    Creates a new OTP for an email and purpose.
    Enforces a 60-second resend cooldown and invalidates prior unused OTPs.
    Returns (OTPVerification, plaintext_otp).
    """
    clean_email = email.strip().lower()
    now = datetime.now(timezone.utc)

    # Check cooldown on existing active OTP
    latest = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == clean_email,
            OTPVerification.purpose == purpose,
            OTPVerification.is_used == False,
        )
        .order_by(OTPVerification.id.desc())
        .first()
    )

    if latest and latest.resend_available_at:
        resend_time = latest.resend_available_at
        if resend_time.tzinfo is None:
            resend_time = resend_time.replace(tzinfo=timezone.utc)
        if now < resend_time:
            remaining = max(1, int((resend_time - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another verification code.",
            )

    # Invalidate all prior unused OTPs for this email & purpose
    db.query(OTPVerification).filter(
        OTPVerification.email == clean_email,
        OTPVerification.purpose == purpose,
        OTPVerification.is_used == False,
    ).update({"is_used": True})

    # Generate fresh OTP
    plaintext_otp = generate_otp(6)
    expires_at = now + timedelta(minutes=expiry_minutes)
    resend_available_at = now + timedelta(seconds=cooldown_seconds)

    record = OTPVerification(
        user_id=user_id,
        email=clean_email,
        otp_hash=hash_token(plaintext_otp),
        purpose=purpose,
        expires_at=expires_at,
        attempts=0,
        max_attempts=5,
        resend_available_at=resend_available_at,
        is_used=False,
        created_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info("Generated OTP record", purpose=purpose, email_domain=clean_email.split("@")[-1])
    return record, plaintext_otp


def verify_otp(
    db: Session,
    email: str,
    purpose: str,
    otp_code: str,
) -> Tuple[bool, str, Optional[OTPVerification], Optional[str]]:
    """
    Verifies an entered OTP code against the latest active OTP record.
    Returns (success: bool, message: str, record: Optional[OTPVerification], reset_token: Optional[str]).
    """
    clean_email = email.strip().lower()
    now = datetime.now(timezone.utc)

    record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == clean_email,
            OTPVerification.purpose == purpose,
            OTPVerification.is_used == False,
        )
        .order_by(OTPVerification.id.desc())
        .first()
    )

    if not record:
        return False, "No active verification code found for this email. Please request a new code.", None, None

    # Check expiry
    exp_time = record.expires_at
    if exp_time.tzinfo is None:
        exp_time = exp_time.replace(tzinfo=timezone.utc)
    if now > exp_time:
        record.is_used = True
        db.commit()
        return False, "The verification code has expired. Please request a new code.", None, None

    # Check attempt limit
    if record.attempts >= record.max_attempts:
        record.is_used = True
        db.commit()
        return False, "Maximum verification attempts exceeded. Please request a new code.", None, None

    # Increment attempts
    record.attempts += 1
    input_hash = hash_token(otp_code)

    if input_hash != record.otp_hash:
        remaining = record.max_attempts - record.attempts
        if remaining <= 0:
            record.is_used = True
            db.commit()
            return False, "Incorrect code. Maximum attempts reached. Please request a new code.", None, None
        db.commit()
        return False, f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.", None, None

    # Code matches!
    reset_token = None
    if purpose == "password_reset":
        reset_token = generate_reset_token()
        record.reset_token_hash = hash_token(reset_token)
        record.reset_token_expires_at = now + timedelta(minutes=15)
        # Mark OTP as consumed (so the code cannot be reused), but reset token stays active
        record.is_used = True
        db.commit()
        return True, "Verification successful. You may now set your new password.", record, reset_token
    else:
        # Signup verification
        record.is_used = True
        db.commit()
        return True, "Account successfully verified.", record, None


def verify_reset_token(
    db: Session,
    email: str,
    reset_token: str,
) -> Tuple[bool, str, Optional[OTPVerification]]:
    """
    Validates a short-lived password reset token issued after OTP verification.
    """
    clean_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    token_hash = hash_token(reset_token)

    record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == clean_email,
            OTPVerification.purpose == "password_reset",
            OTPVerification.reset_token_hash == token_hash,
        )
        .order_by(OTPVerification.id.desc())
        .first()
    )

    if not record or not record.reset_token_expires_at:
        return False, "Invalid or expired password reset authorization.", None

    exp = record.reset_token_expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        return False, "Password reset session has expired. Please request a new code.", None

    return True, "Valid authorization.", record


def invalidate_reset_token(db: Session, record: OTPVerification) -> None:
    """Clear reset token hash after successful password reset to prevent replay."""
    record.reset_token_hash = None
    record.reset_token_expires_at = None
    db.commit()
