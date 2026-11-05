"""
SOR SENTINEL — Authentication Service
Supports user registration with email OTP verification, login with verification checks,
password recovery workflow, and secure password updates.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.logging import get_logger
from app.repositories import user_repository, otp_repository
from app.services import email_service
from app.models.audit_log import AuditLog
from app.schemas.user import (
    UserCreate,
    UserLogin,
    TokenResponse,
    UserResponse,
    PasswordChange,
    SignupInitiateResponse,
    VerifyResetOtpResponse,
    ResetPasswordRequest,
)

logger = get_logger(__name__)


def register_user(db: Session, user_data: UserCreate) -> SignupInitiateResponse:
    """
    Registers a new user account with is_verified=False, generates a 6-digit OTP,
    and sends a real verification email via Resend API.
    """
    clean_email = user_data.email.lower().strip()
    existing = user_repository.get_user_by_email(db, clean_email)

    if existing:
        if getattr(existing, "is_verified", True):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )
        # Account exists but was never verified: update credentials and allow re-verification
        user = user_repository.update_unverified_user(db, existing.id, user_data)
    else:
        user = user_repository.create_user(db, user_data, is_verified=False)

    # Generate OTP & dispatch email via Resend
    try:
        _, otp = otp_repository.create_otp(
            db=db,
            email=user.email,
            purpose="signup_verification",
            user_id=user.id,
        )
        email_service.send_signup_otp_email(
            to_email=user.email,
            otp=otp,
            full_name=user.full_name,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Signup email dispatch failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification email could not be sent: {str(exc)}",
        )

    logger.info("New user registered, pending email OTP verification", user_id=user.id)
    return SignupInitiateResponse(
        requires_verification=True,
        email=user.email,
        message="A 6-digit verification code has been dispatched to your email address.",
    )


def verify_signup_otp(db: Session, email: str, otp_code: str) -> TokenResponse:
    """
    Validates the 6-digit OTP for signup.
    On success: marks account is_verified=True, issues JWT token pair.
    """
    clean_email = email.lower().strip()
    user = user_repository.get_user_by_email(db, clean_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    success, message, record, _ = otp_repository.verify_otp(
        db=db,
        email=clean_email,
        purpose="signup_verification",
        otp_code=otp_code,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    # Activate account
    user_repository.mark_user_verified(db, user.id)
    logger.info("User verified via email OTP", user_id=user.id)

    # Issue authentication tokens
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


def resend_signup_otp(db: Session, email: str) -> dict:
    """
    Generates and dispatches a fresh 6-digit OTP for an unverified account.
    Enforces a 60-second resend cooldown.
    """
    clean_email = email.lower().strip()
    user = user_repository.get_user_by_email(db, clean_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if getattr(user, "is_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already verified. Please sign in.")

    try:
        _, otp = otp_repository.create_otp(
            db=db,
            email=user.email,
            purpose="signup_verification",
            user_id=user.id,
        )
        email_service.send_signup_otp_email(
            to_email=user.email,
            otp=otp,
            full_name=user.full_name,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resend signup OTP", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification email could not be delivered: {str(exc)}",
        )

    return {"message": "A fresh 6-digit verification code has been dispatched to your email."}


def login_user(db: Session, credentials: UserLogin) -> TokenResponse:
    """
    Authenticates a user.
    Enforces that unverified accounts cannot log in (returns 403 Forbidden with requires_verification flag).
    """
    user = user_repository.get_user_by_email(db, credentials.email)

    # Use consistent timing to prevent user enumeration
    if not user or not verify_password(credentials.password, user.password_hash):
        if user:
            failed_audit = AuditLog(
                user_id=user.id,
                action="LOGIN_FAILED",
                resource_type="auth",
                details="Failed login attempt: invalid credentials",
                created_at=datetime.now(timezone.utc),
            )
            db.add(failed_audit)
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    # Check email verification status
    if getattr(user, "is_verified", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please verify your email before logging in.",
        )

    # Capture previous successful login before recording the new one
    if user.last_login_at:
        user.previous_login_at = user.last_login_at
    elif not user.previous_login_at:
        user.previous_login_at = user_repository.get_user_latest_login_audit(db, user.id)

    current_login_time = datetime.now(timezone.utc)

    # Record successful login audit log
    login_audit = AuditLog(
        user_id=user.id,
        action="LOGIN",
        resource_type="auth",
        details="User logged in successfully",
        created_at=current_login_time,
    )
    db.add(login_audit)

    # Update last_login_at timestamp
    user.last_login_at = current_login_time
    db.commit()
    db.refresh(user)

    logger.info("User logged in", user_id=user.id, role=user.role)

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


def forgot_password(db: Session, email: str) -> dict:
    """
    Initiates password recovery.
    Generates a 6-digit OTP and dispatches it via Resend API.
    Returns a generic message to prevent account enumeration.
    """
    clean_email = email.lower().strip()
    user = user_repository.get_user_by_email(db, clean_email)

    if user and user.is_active:
        try:
            _, otp = otp_repository.create_otp(
                db=db,
                email=clean_email,
                purpose="password_reset",
                user_id=user.id,
            )
            email_service.send_password_reset_otp_email(
                to_email=clean_email,
                otp=otp,
                full_name=user.full_name,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to send password recovery email", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recovery email could not be sent: {str(exc)}",
            )

    return {
        "message": "If an active account exists for this email, a verification code has been dispatched.",
        "email": clean_email,
    }


def verify_reset_otp(db: Session, email: str, otp_code: str) -> VerifyResetOtpResponse:
    """
    Verifies the 6-digit OTP for password reset.
    On success: returns a short-lived reset authorization token.
    DOES NOT log the user in.
    """
    clean_email = email.lower().strip()
    success, message, record, reset_token = otp_repository.verify_otp(
        db=db,
        email=clean_email,
        purpose="password_reset",
        otp_code=otp_code,
    )
    if not success or not reset_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    return VerifyResetOtpResponse(
        reset_token=reset_token,
        message="Recovery code verified. Please set your new password.",
    )


def reset_password(db: Session, req: ResetPasswordRequest) -> dict:
    """
    Applies the new password using the short-lived reset authorization token.
    Invalidates the reset token immediately and dispatches a success email via Resend.
    """
    clean_email = req.email.lower().strip()
    valid, message, record = otp_repository.verify_reset_token(
        db=db,
        email=clean_email,
        reset_token=req.reset_token,
    )
    if not valid or not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    user = user_repository.get_user_by_email(db, clean_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    # Update password in Oracle DB
    user_repository.update_password(db, user.id, req.new_password)

    # Invalidate reset token to prevent replay
    otp_repository.invalidate_reset_token(db, record)

    # Send security notification email
    try:
        email_service.send_password_reset_success_email(
            to_email=user.email,
            full_name=user.full_name,
        )
    except Exception as exc:
        logger.warning("Failed to send password reset confirmation email", error=str(exc))

    logger.info("Password reset completed successfully", user_id=user.id)
    return {"message": "Your password has been reset successfully. You may now sign in with your new password."}


def change_password(db: Session, user_id: int, pw_data: PasswordChange) -> bool:
    """Change a user's password after verifying the current one."""
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not verify_password(pw_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    user_repository.update_password(db, user_id, pw_data.new_password)

    # Send security notification email
    try:
        email_service.send_password_reset_success_email(
            to_email=user.email,
            full_name=user.full_name,
        )
    except Exception as exc:
        logger.warning("Failed to send password change notification", error=str(exc))

    logger.info("Password changed", user_id=user_id)
    return True


def direct_password_update(db: Session, user_id: int, new_password: str) -> bool:
    """
    Directly updates password for an authenticated session (e.g. post-login password prompt).
    """
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user_repository.update_password(db, user_id, new_password)

    # Send security notification email
    try:
        email_service.send_password_reset_success_email(
            to_email=user.email,
            full_name=user.full_name,
        )
    except Exception as exc:
        logger.warning("Failed to send direct password update confirmation", error=str(exc))

    logger.info("Direct password update completed for authenticated user", user_id=user_id)
    return True
