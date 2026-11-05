"""
SOR SENTINEL — Auth Endpoints
"""
from fastapi import APIRouter, Depends, Request, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    TokenResponse,
    UserResponse,
    SignupInitiateResponse,
    VerifySignupOtpRequest,
    ResendOtpRequest,
    ForgotPasswordRequest,
    VerifyResetOtpRequest,
    VerifyResetOtpResponse,
    ResetPasswordRequest,
    DirectPasswordUpdate,
)
from app.services.auth_service import (
    register_user,
    login_user,
    verify_signup_otp,
    resend_signup_otp,
    forgot_password as forgot_password_service,
    verify_reset_otp as verify_reset_otp_service,
    reset_password as reset_password_service,
    direct_password_update,
)
from app.repositories import user_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=SignupInitiateResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.
    Dispatches a 6-digit verification OTP to the user's email via Resend API.
    """
    return register_user(db, user_data)


@router.post("/verify-signup-otp", response_model=TokenResponse)
def verify_signup(data: VerifySignupOtpRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP sent upon signup.
    Activates the user account and returns JWT tokens.
    """
    return verify_signup_otp(db, data.email, data.otp)


@router.post("/resend-signup-otp")
def resend_signup(data: ResendOtpRequest, db: Session = Depends(get_db)):
    """
    Resend a fresh 6-digit OTP for an unverified account (subject to 60s cooldown).
    """
    return resend_signup_otp(db, data.email)


@router.post("/forgot-password")
def forgot_password_endpoint(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request a password reset OTP sent to the user's registered email via Resend.
    """
    return forgot_password_service(db, data.email)


@router.post("/verify-reset-otp", response_model=VerifyResetOtpResponse)
def verify_reset_otp_endpoint(data: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit recovery OTP.
    Returns a short-lived reset authorization token valid for 15 minutes.
    """
    return verify_reset_otp_service(db, data.email, data.otp)


@router.post("/reset-password")
def reset_password_endpoint(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Apply a new password using the verified reset authorization token.
    Invalidates the reset token immediately and sends a confirmation email.
    """
    return reset_password_service(db, data)


@router.post("/secure-account-password")
def secure_account_password(
    data: DirectPasswordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Directly update password for currently authenticated user (post-login password prompt).
    """
    direct_password_update(db, current_user.id, data.new_password)
    return {"message": "Your account password has been updated successfully."}


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Authenticate and receive JWT tokens.
    Supports both JSON payloads (frontend/API) and form-urlencoded data (OAuth2/Swagger UI).
    """
    content_type = request.headers.get("content-type", "").lower()

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        raw_email = form.get("username") or form.get("email")
        raw_password = form.get("password")
        raw_data = {"email": raw_email, "password": raw_password}
    else:
        try:
            raw_data = await request.json()
        except Exception:
            raise RequestValidationError([{"loc": ("body",), "msg": "Invalid JSON body", "type": "json_invalid"}])

        if not isinstance(raw_data, dict):
            raise RequestValidationError([{"loc": ("body",), "msg": "Input should be a valid dictionary", "type": "dict_type"}])

        if "email" not in raw_data and "username" in raw_data:
            raw_data["email"] = raw_data["username"]

    try:
        credentials = UserLogin(**raw_data)
    except ValidationError as err:
        raise RequestValidationError(err.errors())

    return login_user(db, credentials)


@router.post("/logout")
def logout():
    """
    Stateless logout — client must delete stored tokens.
    """
    return {"message": "Logged out successfully. Please delete your access token."}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    current_user.previous_login_at = user_repository.get_user_previous_login(db, current_user.id)
    return current_user
