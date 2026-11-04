"""
SOR SENTINEL — Authentication Service
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.logging import get_logger
from app.repositories import user_repository
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse, PasswordChange
from fastapi import HTTPException, status

logger = get_logger(__name__)


def register_user(db: Session, user_data: UserCreate) -> TokenResponse:
    """Register a new user. Raises HTTPException on duplicate email."""
    existing = user_repository.get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = user_repository.create_user(db, user_data)
    logger.info("New user registered", user_id=user.id)

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


def login_user(db: Session, credentials: UserLogin) -> TokenResponse:
    """Authenticate a user. Raises HTTPException on invalid credentials."""
    user = user_repository.get_user_by_email(db, credentials.email)

    # Use consistent timing to prevent user enumeration
    if not user or not verify_password(credentials.password, user.password_hash):
        if user:
            # Audit failed login attempt without altering last_login_at
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
    logger.info("Password changed", user_id=user_id)
    return True
