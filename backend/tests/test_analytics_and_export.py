"""
SOR SENTINEL — Analytics, History & Export Regression Tests
"""
import pytest
from fastapi.testclient import TestClient


def test_dashboard_activity_default_daily(client: TestClient, user_token_headers: dict):
    """Activity endpoint returns daily timeline data with days and view fields."""
    response = client.get("/api/v1/dashboard/activity?days=14", headers=user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["period_days"] == 14
    assert data["view"] == "daily"
    assert isinstance(data["data"], list)


def test_dashboard_activity_weekly(client: TestClient, user_token_headers: dict):
    """Activity endpoint supports weekly view."""
    response = client.get("/api/v1/dashboard/activity?view=weekly", headers=user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["view"] == "weekly"
    assert isinstance(data["data"], list)


def test_dashboard_activity_monthly(client: TestClient, user_token_headers: dict):
    """Activity endpoint supports monthly view."""
    response = client.get("/api/v1/dashboard/activity?view=monthly", headers=user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["view"] == "monthly"
    assert isinstance(data["data"], list)


def test_dashboard_activity_unauthenticated(client: TestClient):
    """Unauthenticated access to activity returns 401."""
    response = client.get("/api/v1/dashboard/activity")
    assert response.status_code == 401


def test_list_analyses_with_filters(client: TestClient, user_token_headers: dict):
    """List analyses supports search, verdict, sensitivity, sorting, and pagination."""
    response = client.get(
        "/api/v1/analyses/?page=1&page_size=5&analysis_type=url&sensitivity_level=low&sort_by=score&sort_order=desc",
        headers=user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 5


def test_list_analyses_search(client: TestClient, user_token_headers: dict):
    """List analyses supports keyword search."""
    response = client.get("/api/v1/analyses/?search=example", headers=user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


def test_export_analyses_csv(client: TestClient, user_token_headers: dict):
    """CSV export returns downloadable text/csv attachment with valid headers."""
    response = client.get("/api/v1/analyses/export/csv", headers=user_token_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "attachment; filename=\"sor_sentinel_analyses.csv\"" in response.headers.get("content-disposition", "")
    text = response.text
    assert "Analysis ID" in text
    assert "Overall Assessment / Verdict" in text


def test_export_analyses_csv_filtered(client: TestClient, user_token_headers: dict):
    """CSV export respects query filters."""
    response = client.get("/api/v1/analyses/export/csv?analysis_type=text&sensitivity_level=high", headers=user_token_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


def test_export_analyses_pdf(client: TestClient, user_token_headers: dict):
    """PDF export returns downloadable application/pdf with PDF magic bytes."""
    response = client.get("/api/v1/analyses/export/pdf", headers=user_token_headers)
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "attachment; filename=\"sor_sentinel_analyses.pdf\"" in response.headers.get("content-disposition", "")
    content = response.content
    assert content.startswith(b"%PDF-")


def test_export_unauthenticated(client: TestClient):
    """Unauthenticated export requests return 401."""
    assert client.get("/api/v1/analyses/export/csv").status_code == 401
    assert client.get("/api/v1/analyses/export/pdf").status_code == 401
