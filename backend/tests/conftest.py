"""
SOR SENTINEL — Test Configuration and Fixtures
"""
import os
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="module")
def mock_db():
    """Mock SQLAlchemy session."""
    return MagicMock()


@pytest.fixture(scope="module")
def client(mock_db):
    """Test client with mocked database dependency and user lookup."""
    from app.main import app
    from app.db.database import get_db
    from app.models.user import User

    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    def mock_get_user_by_id(db, user_id: int):
        if user_id == 99:
            return User(
                id=99,
                full_name="Admin User",
                email="admin@example.com",
                role="admin",
                is_active=True,
            )
        return User(
            id=user_id,
            full_name="Test User",
            email="test@example.com",
            role="user",
            is_active=True,
        )

    with patch("app.repositories.user_repository.get_user_by_id", side_effect=mock_get_user_by_id), \
         patch("app.api.dependencies.user_repository.get_user_by_id", side_effect=mock_get_user_by_id):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

    app.dependency_overrides.clear()


def make_token(user_id: int = 1, role: str = "user") -> str:
    """Create a valid JWT token for testing."""
    from app.core.security import create_access_token
    return create_access_token({"sub": str(user_id), "email": "test@example.com", "role": role})


@pytest.fixture
def user_token_headers():
    token = make_token(user_id=1, role="user")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token_headers():
    token = make_token(user_id=99, role="admin")
    return {"Authorization": f"Bearer {token}"}
