"""
SOR SENTINEL — AI Timeout, Error Handling, and Retry Tests
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services import ai_service
from app.services.ai_service import (
    AI_ERR_AUTH,
    AI_ERR_CONNECT_TIMEOUT,
    AI_ERR_CREDIT,
    AI_ERR_MALFORMED,
    AI_ERR_MODEL_UNAVAILABLE,
    AI_ERR_NETWORK,
    AI_ERR_PROVIDER,
    AI_ERR_RATE_LIMIT,
    AI_ERR_READ_TIMEOUT,
    analyze_content,
)


@pytest.fixture(autouse=True)
def fast_retry_sleep():
    """Patch asyncio.sleep so retries execute instantly during tests."""
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        yield mock_sleep


@pytest.mark.asyncio
async def test_ai_successful_response():
    """Verify successful OpenRouter response parsing and formatting."""
    valid_payload = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "overall_assessment": "Likely Credible",
                        "summary": "The claims are supported by verifiable clinical trial data.",
                        "credibility_score": 88,
                        "sensitivity_level": "low",
                        "credibility_concerns": [],
                        "misleading_indicators": [],
                        "sensitive_content": [],
                        "recommendations": [
                            {"title": "Check peer review", "description": "Review published findings."}
                        ],
                        "source_references": [
                            {"title": "PubMed Study", "url": "https://pubmed.ncbi.nlm.nih.gov/123", "description": "Clinical trial", "relevance": "high"}
                        ],
                        "evidence_limitations": "Short observation window.",
                        "uncertainty_note": "Early phase data.",
                    })
                }
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = valid_payload

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        res = await analyze_content("A" * 100)

    assert res["status"] == "completed"
    assert res["overall_assessment"] == "Likely Credible"
    assert res["credibility_score"] == 88
    assert res["sensitivity_level"] == "low"
    assert len(res["findings"]) == 1
    assert len(res["source_references"]) == 1
    assert "request_id" in res


@pytest.mark.asyncio
async def test_ai_connect_timeout():
    """Verify ConnectTimeout produces AI_CONNECTION_TIMEOUT and user friendly message."""
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectTimeout("Connection timed out")):
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_CONNECT_TIMEOUT
    assert "timed out" in res["error_message"].lower()
    assert "request_id" in res


@pytest.mark.asyncio
async def test_ai_read_timeout():
    """Verify ReadTimeout produces AI_READ_TIMEOUT and appropriate message."""
    with patch("httpx.AsyncClient.post", side_effect=httpx.ReadTimeout("Read timed out")):
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_READ_TIMEOUT
    assert "timed out" in res["error_message"].lower()


@pytest.mark.asyncio
async def test_ai_auth_error_401():
    """Verify HTTP 401 returns AI_AUTH_ERROR immediately without retrying."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_AUTH
    assert "authentication failed" in res["error_message"].lower()
    # Should not retry permanent auth error
    assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_ai_credit_exhausted_402():
    """Verify HTTP 402 returns AI_CREDIT_EXHAUSTED immediately without retrying."""
    mock_resp = MagicMock()
    mock_resp.status_code = 402

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_CREDIT
    assert "credits" in res["error_message"].lower() or "quota" in res["error_message"].lower()
    assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_ai_rate_limit_429_exhausted():
    """Verify HTTP 429 returns AI_RATE_LIMIT after transient retries."""
    mock_resp = MagicMock()
    mock_resp.status_code = 429

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_RATE_LIMIT
    assert "rate limit" in res["error_message"].lower()
    # Retries were attempted
    assert mock_post.call_count > 1


@pytest.mark.asyncio
async def test_ai_provider_error_5xx():
    """Verify HTTP 502/503 provider errors return AI_PROVIDER_ERROR."""
    mock_resp = MagicMock()
    mock_resp.status_code = 503

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_PROVIDER
    assert "503" in res["error_message"]


@pytest.mark.asyncio
async def test_ai_model_unavailable_404():
    """Verify HTTP 404 returns AI_MODEL_UNAVAILABLE."""
    mock_resp = MagicMock()
    mock_resp.status_code = 404

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_MODEL_UNAVAILABLE


@pytest.mark.asyncio
async def test_ai_malformed_json_response():
    """Verify malformed unrepairable JSON returns AI_MALFORMED_RESPONSE."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is plain prose, completely non-JSON content <<<>>>"}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        res = await analyze_content("A" * 100)

    assert res["status"] == "failed"
    assert res["error_code"] == AI_ERR_MALFORMED


@pytest.mark.asyncio
async def test_ai_fallback_model_success():
    """Verify fallback model is used when primary model fails with 404."""
    # First response: 404 from primary model
    # Second response: 200 from fallback model
    resp_404 = MagicMock()
    resp_404.status_code = 404

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "overall_assessment": "Potentially Misleading",
                        "summary": "Generated by fallback model.",
                        "credibility_score": 40,
                        "sensitivity_level": "medium",
                        "credibility_concerns": [],
                        "misleading_indicators": [],
                        "sensitive_content": [],
                        "recommendations": [],
                        "source_references": [],
                    })
                }
            }
        ]
    }

    with patch.object(ai_service.settings, "OPENROUTER_FALLBACK_MODEL", "openrouter/free"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[resp_404, resp_200]):
            res = await analyze_content("A" * 100)

    assert res["status"] == "completed"
    assert res["overall_assessment"] == "Potentially Misleading"
    assert res["ai_model_used"] == "openrouter/free"
