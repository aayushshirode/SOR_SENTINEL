"""
SOR SENTINEL — Health Endpoint Tests
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


def test_health_basic(client: TestClient):
    """Health endpoint returns 200 and correct structure."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data


def test_root_endpoint(client: TestClient):
    """Root endpoint redirects to API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "docs" in data


def test_openapi_schema_accessible(client: TestClient):
    """OpenAPI schema endpoint is accessible."""
    response = client.get("/api/openapi.json")
    assert response.status_code == 200


def test_health_detailed_returns_structure(client: TestClient):
    """Detailed health check returns dependency statuses."""
    with patch("app.api.v1.endpoints.health.check_db_connection", return_value=False), \
         patch("app.api.v1.endpoints.health.check_ai_connectivity", return_value=False):
        response = client.get("/api/v1/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "dependencies" in data
    assert "oracle_database" in data["dependencies"]
    assert "openrouter_ai" in data["dependencies"]
