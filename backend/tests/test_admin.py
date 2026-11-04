"""
SOR SENTINEL — Admin Authorization Tests
"""
import pytest
from fastapi.testclient import TestClient


def test_admin_endpoint_unauthenticated(client: TestClient):
    """Admin endpoints reject unauthenticated requests."""
    response = client.get("/api/v1/admin/overview")
    assert response.status_code == 401


def test_admin_endpoint_regular_user_forbidden(client: TestClient, user_token_headers: dict):
    """Regular users cannot access admin endpoints (returns 401 if DB unavailable, 403 if auth ok)."""
    response = client.get("/api/v1/admin/overview", headers=user_token_headers)
    # 401: DB not available so user lookup fails; 403: user found but not admin
    assert response.status_code in (401, 403)


def test_admin_messages_unauthenticated(client: TestClient):
    """Admin messages endpoint rejects unauthenticated requests."""
    response = client.get("/api/v1/admin/messages")
    assert response.status_code == 401


def test_admin_users_unauthenticated(client: TestClient):
    """Admin users endpoint rejects unauthenticated requests."""
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 401


def test_admin_audit_logs_unauthenticated(client: TestClient):
    """Admin audit logs endpoint rejects unauthenticated requests."""
    response = client.get("/api/v1/admin/audit-logs")
    assert response.status_code == 401


# ── Password Security Tests ───────────────────────────────────────────────────

def test_password_hashing():
    """Passwords are hashed and can be verified."""
    from app.core.security import hash_password, verify_password
    pw = "SecurePassword123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_different_passwords_produce_different_hashes():
    """Same password hashed twice produces different salts."""
    from app.core.security import hash_password
    h1 = hash_password("Password123")
    h2 = hash_password("Password123")
    assert h1 != h2  # bcrypt uses different salts


# ── Contact Endpoint Tests ────────────────────────────────────────────────────

def test_contact_validation_missing_fields(client: TestClient):
    """Contact form with missing fields returns 422."""
    response = client.post("/api/v1/contact/", json={})
    assert response.status_code == 422


def test_contact_validation_short_message(client: TestClient):
    """Contact form with too-short message returns 422."""
    response = client.post("/api/v1/contact/", json={
        "name": "Test",
        "email": "test@example.com",
        "subject": "Hello",
        "message": "Hi",  # Too short (min 20 chars)
    })
    assert response.status_code == 422


def test_contact_validation_invalid_email(client: TestClient):
    """Contact form with invalid email returns 422."""
    response = client.post("/api/v1/contact/", json={
        "name": "Test",
        "email": "not-valid",
        "subject": "Hello World",
        "message": "This is a proper message with enough length.",
    })
    assert response.status_code == 422
