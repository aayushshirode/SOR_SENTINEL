"""
SOR SENTINEL — Authentication Tests
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.core.security import create_access_token


# ── Registration Tests ────────────────────────────────────────────────────────

def test_register_missing_fields(client: TestClient):
    """Registration with missing required fields returns 422."""
    response = client.post("/api/v1/auth/register", json={})
    assert response.status_code == 422


def test_register_weak_password(client: TestClient):
    """Registration with weak password returns 422."""
    response = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "weak",
        "confirm_password": "weak",
        "terms_accepted": True,
    })
    assert response.status_code == 422


def test_register_password_mismatch(client: TestClient):
    """Registration with mismatched passwords returns 422."""
    response = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "StrongPass1",
        "confirm_password": "DifferentPass1",
        "terms_accepted": True,
    })
    assert response.status_code == 422


def test_register_terms_not_accepted(client: TestClient):
    """Registration without accepting terms returns 422."""
    response = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "terms_accepted": False,
    })
    assert response.status_code == 422


def test_register_invalid_email(client: TestClient):
    """Registration with invalid email format returns 422."""
    response = client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "not-an-email",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "terms_accepted": True,
    })
    assert response.status_code == 422


# ── Login Tests ───────────────────────────────────────────────────────────────

def test_login_missing_fields(client: TestClient):
    """Login with missing fields returns 422."""
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


def test_login_oauth2_form_missing_fields(client: TestClient):
    """OAuth2 form login with missing fields returns 422."""
    response = client.post(
        "/api/v1/auth/login",
        data={"grant_type": "password", "client_id": "", "client_secret": ""},
    )
    assert response.status_code == 422


def test_login_oauth2_form_invalid_credentials(client: TestClient):
    """OAuth2 form login with invalid credentials returns 401."""
    with patch("app.repositories.user_repository.get_user_by_email", return_value=None):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "WrongPassword123!",
                "grant_type": "password",
                "client_id": "",
                "client_secret": "",
            },
        )
        assert response.status_code == 401


def test_login_oauth2_form_success(client: TestClient):
    """OAuth2 form login (Swagger Authorize format) succeeds with valid credentials."""
    from datetime import datetime, timezone
    from app.models.user import User
    from app.core.security import hash_password

    mock_user = User(
        id=1,
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="user",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.user_repository.get_user_by_email", return_value=mock_user), \
         patch("app.models.audit_log.AuditLog"):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "ValidPassword123!",
                "grant_type": "password",
                "client_id": "",
                "client_secret": "",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"


def test_login_json_with_username_field(client: TestClient):
    """JSON login accepting 'username' alias succeeds."""
    from datetime import datetime, timezone
    from app.models.user import User
    from app.core.security import hash_password

    mock_user = User(
        id=1,
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="user",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.user_repository.get_user_by_email", return_value=mock_user), \
         patch("app.models.audit_log.AuditLog"):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "test@example.com", "password": "ValidPassword123!"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()


def test_logout_returns_message(client: TestClient):
    """Logout endpoint returns success message."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert "message" in response.json()


# ── Protected Route Tests ─────────────────────────────────────────────────────

def test_me_without_token_returns_401(client: TestClient):
    """Accessing /me without a token returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client: TestClient):
    """Accessing /me with an invalid token returns 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    assert response.status_code == 401


def test_valid_token_format():
    """Created access token can be decoded correctly."""
    from app.core.security import decode_token
    token = create_access_token({"sub": "42", "email": "test@test.com", "role": "user"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["role"] == "user"


def test_expired_token_returns_none():
    """Expired token returns None from decode_token."""
    from datetime import timedelta
    from app.core.security import decode_token
    token = create_access_token(
        {"sub": "1", "email": "t@t.com", "role": "user"},
        expires_delta=timedelta(seconds=-1)
    )
    result = decode_token(token)
    assert result is None
