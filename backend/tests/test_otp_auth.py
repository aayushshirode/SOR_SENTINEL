"""
SOR SENTINEL — Email OTP Verification & Password Recovery Tests
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.models.user import User
from app.models.otp import OTPVerification
from app.core.security import hash_password
from app.repositories.otp_repository import hash_token
from tests.conftest import make_token


def test_login_unverified_user_rejected_with_403(client: TestClient):
    """Login is rejected with 403 Forbidden if user email is unverified."""
    unverified_user = User(
        id=10,
        full_name="Unverified User",
        email="unverified@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="user",
        is_active=True,
        is_verified=False,
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.user_repository.get_user_by_email", return_value=unverified_user):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "unverified@example.com", "password": "ValidPassword123!"},
        )
        assert response.status_code == 403
        assert "not verified" in response.json()["detail"].lower()


def test_verify_signup_otp_invalid(client: TestClient):
    """Submitting incorrect OTP returns 400 Bad Request."""
    mock_user = User(
        id=10,
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="user",
        is_active=True,
        is_verified=False,
        created_at=datetime.now(timezone.utc),
    )

    mock_otp = OTPVerification(
        id=1,
        email="test@example.com",
        otp_hash=hash_token("123456"),
        purpose="signup_verification",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts=0,
        max_attempts=5,
        resend_available_at=datetime.now(timezone.utc) + timedelta(seconds=60),
        is_used=False,
    )

    with patch("app.repositories.user_repository.get_user_by_email", return_value=mock_user), \
         patch("app.repositories.otp_repository.verify_otp", return_value=(False, "Incorrect code. 4 attempts remaining.", None, None)):
        response = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"email": "test@example.com", "otp": "999999"},
        )
        assert response.status_code == 400
        assert "Incorrect code" in response.json()["detail"]


def test_verify_signup_otp_success(client: TestClient):
    """Submitting valid OTP activates account and returns JWT tokens."""
    mock_user = User(
        id=10,
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="user",
        is_active=True,
        is_verified=True,
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.user_repository.get_user_by_email", return_value=mock_user), \
         patch("app.repositories.otp_repository.verify_otp", return_value=(True, "Verified", MagicMock(), None)), \
         patch("app.repositories.user_repository.mark_user_verified", return_value=mock_user):
        response = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"email": "test@example.com", "otp": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"


def test_forgot_password_generic_response(client: TestClient):
    """Forgot password returns generic confirmation to prevent user enumeration."""
    with patch("app.repositories.user_repository.get_user_by_email", return_value=None):
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
        )
        assert response.status_code == 200
        assert "verification code has been dispatched" in response.json()["message"]


def test_verify_reset_otp_returns_reset_token(client: TestClient):
    """Valid reset OTP returns short-lived reset authorization token."""
    with patch("app.repositories.otp_repository.verify_otp", return_value=(True, "Verified", MagicMock(), "test-reset-auth-token-12345")):
        response = client.post(
            "/api/v1/auth/verify-reset-otp",
            json={"email": "test@example.com", "otp": "654321"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reset_token"] == "test-reset-auth-token-12345"


def test_reset_password_success(client: TestClient):
    """Resetting password with valid reset token succeeds."""
    mock_user = User(
        id=10,
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("OldPassword123!"),
        role="user",
        is_active=True,
        is_verified=True,
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.otp_repository.verify_reset_token", return_value=(True, "Valid", MagicMock())), \
         patch("app.repositories.user_repository.get_user_by_email", return_value=mock_user), \
         patch("app.repositories.user_repository.update_password", return_value=True), \
         patch("app.repositories.otp_repository.invalidate_reset_token"), \
         patch("app.services.email_service.send_password_reset_success_email"):
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": "test@example.com",
                "reset_token": "valid-long-reset-token-sample-123",
                "new_password": "NewStrongPassword123!",
                "confirm_password": "NewStrongPassword123!",
            },
        )
        assert response.status_code == 200
        assert "reset successfully" in response.json()["message"]


def test_secure_account_password_authenticated(client: TestClient):
    """Authenticated user can update password via post-login security prompt."""
    token = make_token(user_id=1, role="user")

    with patch("app.repositories.user_repository.update_password", return_value=True), \
         patch("app.services.email_service.send_password_reset_success_email"):
        response = client.post(
            "/api/v1/auth/secure-account-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "new_password": "BrandNewPassword123!",
                "confirm_password": "BrandNewPassword123!",
            },
        )
        assert response.status_code == 200
        assert "updated successfully" in response.json()["message"]
