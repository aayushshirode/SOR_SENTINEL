"""
SOR SENTINEL — Cubbis AI Cyber Assistant Backend Tests
Validates authentication, input validation, conversation ownership, session persistence, and error handling.
"""
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.cubbis import CubbisConversation, CubbisMessage


def _auth_header(user_id: int = 1) -> dict:
    token = create_access_token(data={"sub": str(user_id), "role": "user"})
    return {"Authorization": f"Bearer {token}"}


# ── Authentication Protection Tests ──────────────────────────────────────────

def test_cubbis_chat_unauthenticated_rejected(client: TestClient):
    """Chat endpoint rejects unauthenticated calls with 401."""
    response = client.post("/api/v1/cubbis/chat", json={"message": "Hello"})
    assert response.status_code == 401


def test_cubbis_conversations_unauthenticated_rejected(client: TestClient):
    """Listing conversations rejects unauthenticated calls with 401."""
    response = client.get("/api/v1/cubbis/conversations")
    assert response.status_code == 401


def test_cubbis_conversation_detail_unauthenticated_rejected(client: TestClient):
    """Conversation detail rejects unauthenticated calls with 401."""
    response = client.get("/api/v1/cubbis/conversations/1")
    assert response.status_code == 401


def test_cubbis_delete_conversation_unauthenticated_rejected(client: TestClient):
    """Deleting conversation rejects unauthenticated calls with 401."""
    response = client.delete("/api/v1/cubbis/conversations/1")
    assert response.status_code == 401


def test_cubbis_clear_history_unauthenticated_rejected(client: TestClient):
    """Clearing history rejects unauthenticated calls with 401."""
    response = client.delete("/api/v1/cubbis/history")
    assert response.status_code == 401


# ── Input Validation Tests ───────────────────────────────────────────────────

def test_cubbis_chat_empty_message_rejected(client: TestClient):
    """Empty or whitespace-only messages fail validation with 422."""
    response = client.post(
        "/api/v1/cubbis/chat",
        headers=_auth_header(1),
        json={"message": "   "},
    )
    assert response.status_code == 422


def test_cubbis_chat_oversized_message_rejected(client: TestClient):
    """Messages exceeding 4000 characters fail validation with 422."""
    huge_msg = "A" * 4001
    response = client.post(
        "/api/v1/cubbis/chat",
        headers=_auth_header(1),
        json={"message": huge_msg},
    )
    assert response.status_code == 422


# ── Workflow & Ownership Isolation Tests ─────────────────────────────────────

def test_cubbis_chat_successful_workflow(client: TestClient):
    """Chat sends prompt, receives AI response, and saves both turns."""
    mock_ai_result = {
        "content": "Phishing is a social engineering technique. Never share OTPs.",
        "model_used": "gemini-3-flash-preview",
        "status": "success",
    }

    with patch("app.services.cubbis_service.generate_cubbis_response", return_value=mock_ai_result), \
         patch("app.repositories.cubbis_repository.get_conversation", return_value=None), \
         patch("app.repositories.cubbis_repository.create_conversation") as mock_create, \
         patch("app.repositories.cubbis_repository.add_message") as mock_msg:

        mock_conv = CubbisConversation(
            id=10,
            user_id=1,
            title="How to spot phishing",
            language="en",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        mock_create.return_value = mock_conv

        mock_assistant_msg = CubbisMessage(
            id=25,
            conversation_id=10,
            role="assistant",
            content=mock_ai_result["content"],
            model_used=mock_ai_result["model_used"],
            created_at=datetime.now(timezone.utc),
        )
        # First call is user msg, second call is assistant msg
        mock_msg.side_effect = [MagicMock(id=24), mock_assistant_msg]

        response = client.post(
            "/api/v1/cubbis/chat",
            headers=_auth_header(1),
            json={"message": "How to spot phishing?", "language": "en"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["conversation_id"] == 10
        assert data["message_id"] == 25
        assert data["role"] == "assistant"
        assert "Phishing is a social engineering" in data["content"]
        assert data["model_used"] == "gemini-3-flash-preview"


def test_cubbis_ownership_isolation_cross_user_denied(client: TestClient):
    """User 2 cannot access or delete User 1's conversation (returns 404)."""
    with patch("app.repositories.cubbis_repository.get_conversation", return_value=None):
        # Attempt to get detail
        res_get = client.get(
            "/api/v1/cubbis/conversations/999",
            headers=_auth_header(user_id=2),
        )
        assert res_get.status_code == 404

    with patch("app.repositories.cubbis_repository.delete_conversation", return_value=False):
        # Attempt to delete
        res_del = client.delete(
            "/api/v1/cubbis/conversations/999",
            headers=_auth_header(user_id=2),
        )
        assert res_del.status_code == 404


def test_cubbis_chat_missing_api_key_handled_safely(client: TestClient):
    """When Gemini API key is missing, endpoint returns 503 with safe non-crashing error."""
    with patch(
        "app.services.cubbis_service.generate_cubbis_response",
        side_effect=ValueError("GEMINI_API_KEY is not configured in backend environment."),
    ):
        response = client.post(
            "/api/v1/cubbis/chat",
            headers=_auth_header(1),
            json={"message": "Check my password safety."},
        )
        assert response.status_code == 503
        assert "not configured" in response.json()["detail"]


def test_cubbis_clear_history_workflow(client: TestClient):
    """Clearing history invokes repository and returns cleared count."""
    with patch("app.repositories.cubbis_repository.clear_history", return_value=5):
        response = client.delete(
            "/api/v1/cubbis/history",
            headers=_auth_header(1),
        )
        assert response.status_code == 200
        assert "5" in response.json()["message"]
