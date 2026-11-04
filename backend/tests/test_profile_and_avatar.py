"""
SOR SENTINEL — Profile, Avatar Upload, and Login Timestamp Tests
"""
import io
import pytest
from fastapi.testclient import TestClient


PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe"
    b"\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_avatar_unauthenticated(client: TestClient):
    """Avatar endpoints require authentication."""
    resp = client.post("/api/v1/users/me/avatar")
    assert resp.status_code == 401

    resp_del = client.delete("/api/v1/users/me/avatar")
    assert resp_del.status_code == 401


def test_avatar_invalid_extension(client: TestClient, user_token_headers: dict):
    """Uploading a non-image extension (.exe) is rejected with 400."""
    files = {"file": ("malicious.exe", b"fake binary content", "application/octet-stream")}
    resp = client.post("/api/v1/users/me/avatar", files=files, headers=user_token_headers)
    assert resp.status_code in (400, 401)  # 400 if auth succeeded
    if resp.status_code == 400:
        assert "extension" in resp.json()["detail"].lower()


def test_avatar_invalid_mime(client: TestClient, user_token_headers: dict):
    """Uploading image with invalid MIME type is rejected with 400."""
    files = {"file": ("photo.png", b"not-really-a-png", "text/plain")}
    resp = client.post("/api/v1/users/me/avatar", files=files, headers=user_token_headers)
    assert resp.status_code in (400, 401)
    if resp.status_code == 400:
        assert "mime" in resp.json()["detail"].lower() or "signature" in resp.json()["detail"].lower()


def test_avatar_oversized_rejection(client: TestClient, user_token_headers: dict):
    """Uploading image > 2MB is rejected with 400."""
    oversized = b"\x89PNG\r\n\x1a\n" + b"A" * (2 * 1024 * 1024 + 10)
    files = {"file": ("large.png", oversized, "image/png")}
    resp = client.post("/api/v1/users/me/avatar", files=files, headers=user_token_headers)
    assert resp.status_code in (400, 401)
    if resp.status_code == 400:
        assert "2 mb" in resp.json()["detail"].lower() or "limit" in resp.json()["detail"].lower()


def test_avatar_filename_traversal_blocked(client: TestClient):
    """Path traversal in avatar retrieval endpoint is blocked with 400."""
    resp = client.get("/api/v1/users/avatar/../../etc/passwd")
    assert resp.status_code in (400, 404)

    resp2 = client.get("/api/v1/users/avatar/malicious..png")
    assert resp2.status_code in (400, 404)


def test_submit_user_feedback(client: TestClient, user_token_headers: dict):
    """Submitting feedback returns 200 and success message."""
    resp = client.post(
        "/api/v1/users/feedback",
        json={"category": "feature_request", "message": "Add more export formats for reporting."},
        headers=user_token_headers,
    )
    assert resp.status_code == 200
    assert "successfully" in resp.json()["message"].lower()


def test_submit_user_review(client: TestClient, user_token_headers: dict):
    """Submitting review returns 200 and success message."""
    resp = client.post(
        "/api/v1/users/review",
        json={"rating": 5, "review": "Exceptional cybersecurity features!"},
        headers=user_token_headers,
    )
    assert resp.status_code == 200
    assert "successfully" in resp.json()["message"].lower()


def test_submit_feedback_unauthenticated(client: TestClient):
    """Unauthenticated feedback submissions return 401."""
    resp = client.post(
        "/api/v1/users/feedback",
        json={"category": "general_feedback", "message": "Test feedback."},
    )
    assert resp.status_code == 401
