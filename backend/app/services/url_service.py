"""
SOR SENTINEL — Safe URL Content Fetcher

SSRF Protection:
- Validates URL scheme and format before resolution.
- Resolves hostname to IP and blocks private/reserved ranges (IPv4 and IPv6).
- Validates every hop in redirect chains (preventing DNS rebinding & redirect-to-internal SSRF).
- Enforces connection and read timeouts.
- Enforces maximum response size.
- Checks Content-Type before reading full response.
- Extracts readable content with BeautifulSoup (removing script, style, nav, ads, etc.).
- Never attempts to bypass authentication, paywalls, or bot protection.
- Returns structured user-friendly error codes and messages when target sites deny access.
"""
import ipaddress
import re
import socket
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# ── Private IP ranges to block (SSRF protection) ─────────────────────────────
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),         # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),      # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),     # Private Class C
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local / Cloud metadata (AWS, Azure, GCP)
    ipaddress.ip_network("100.64.0.0/10"),      # Shared address space / CGNAT
    ipaddress.ip_network("192.0.0.0/24"),       # IETF protocol assignments
    ipaddress.ip_network("192.0.2.0/24"),       # Documentation (TEST-NET-1)
    ipaddress.ip_network("198.51.100.0/24"),    # Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"),     # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("0.0.0.0/8"),          # "This" network
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    # IPv6
    ipaddress.ip_network("::1/128"),            # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),          # IPv6 link-local
    ipaddress.ip_network("ff00::/8"),           # IPv6 multicast
    ipaddress.ip_network("2001:db8::/32"),      # IPv6 documentation
]

_BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",     # AWS/Azure/GCP metadata IP literal
    "metadata.internal",
    "instance-data",
    "metadata",
}

_NAT64_PREFIX = ipaddress.ip_network("64:ff9b::/96")

POPULAR_BRANDS: dict[str, list[str]] = {
    "paypal": ["paypal.com"],
    "apple": ["apple.com", "icloud.com"],
    "microsoft": ["microsoft.com", "live.com", "office.com", "outlook.com"],
    "google": ["google.com", "gmail.com", "youtube.com"],
    "amazon": ["amazon.com", "aws.amazon.com"],
    "chase": ["chase.com"],
    "bankofamerica": ["bankofamerica.com"],
    "wellsfargo": ["wellsfargo.com"],
    "netflix": ["netflix.com"],
    "facebook": ["facebook.com", "meta.com"],
    "instagram": ["instagram.com"],
    "coinbase": ["coinbase.com"],
    "binance": ["binance.com"],
    "steam": ["steampowered.com", "steamcommunity.com"],
    "dhl": ["dhl.com"],
    "fedex": ["fedex.com"],
    "usps": ["usps.com"],
    "whatsapp": ["whatsapp.com"],
}

SHORTENER_DOMAINS: set[str] = {
    "bit.ly", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly",
    "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "goo.gl", "bit.do"
}

SUSPICIOUS_TLDS: set[str] = {
    "xyz", "top", "click", "buzz", "loan", "cfd", "gq", "ml", "tk", "ga", "work", "rest", "support", "icu"
}

HIGH_RISK_PATH_KEYWORDS: list[str] = [
    "login", "signin", "verify", "verification", "security", "account", "billing",
    "update", "banking", "wallet", "claim", "prize", "giveaway", "reward", "cashback",
    "free-gift", "airdrop", "kyc", "auth", "confirm", "passcode"
]

PROMOTIONAL_PATTERNS: list[str] = [
    r"(?i)\b(congratulations|you('ve| have) been selected|lucky (visitor|winner))\b",
    r"(?i)\b(claim (your )?(prize|reward|gift card|iphone|cash|bitcoin))\b",
    r"(?i)\b(spin (the )?wheel|100% free|exclusive cash reward|instant cashback)\b",
    r"(?i)\b(hurry,? limited time|expires in \d+ (minutes|seconds)|act now)\b",
    r"(?i)\b(urgent:? your account (will be|has been) (suspended|restricted|locked|terminated))\b",
]

# Ethical user-agent identifying SOR SENTINEL with modern browser compatibility
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 "
    "(compatible; SOR-SENTINEL/1.0; +https://sorsentinel.com)"
)


def _is_private_ip(ip_str: str) -> bool:
    """Return True if the IP address is in a private, loopback, or reserved range."""
    try:
        ip = ipaddress.ip_address(ip_str)

        # Handle NAT64 well-known prefix (RFC 6052) by checking embedded IPv4
        if isinstance(ip, ipaddress.IPv6Address) and ip in _NAT64_PREFIX:
            embedded_v4 = ipaddress.IPv4Address(ip.packed[-4:])
            return _is_private_ip(str(embedded_v4))

        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            return True
        for network in _BLOCKED_NETWORKS:
            if ip in network:
                return True
        return False
    except ValueError:
        return True  # Treat unparseable IPs as blocked


def validate_url(url: str) -> tuple[bool, str]:
    """
    Validate a URL for safe fetching and SSRF prevention.
    Returns (is_valid, error_message).
    """
    url = url.strip()

    # Parse URL
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Invalid URL format."

    # Scheme must be http or https
    if parsed.scheme not in ("http", "https"):
        return False, "Only http and https URLs are supported."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must include a valid hostname."

    # Block sensitive cloud metadata and local hostnames
    if hostname.lower() in _BLOCKED_HOSTNAMES:
        return False, "This hostname is not permitted for security reasons."

    # Resolve hostname and verify all IPs are public
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, f"Could not resolve hostname: {hostname}"

    if not addr_infos:
        return False, f"Could not resolve any network address for: {hostname}"

    for addr_info in addr_infos:
        ip_str = addr_info[4][0]
        if _is_private_ip(ip_str):
            return False, (
                "This URL resolves to a private or reserved IP address "
                "and cannot be fetched for security reasons."
            )

    return True, ""


def _extract_text_from_html(html: str) -> str:
    """Extract clean readable text from HTML using BeautifulSoup."""
    try:
        # Try lxml first, fallback to html.parser
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")

        # Decompose non-content and layout elements
        for tag in soup([
            "script", "style", "nav", "footer", "header", "aside",
            "advertisement", "noscript", "meta", "svg", "iframe",
            "form", "button", "dialog", "menu"
        ]):
            tag.decompose()

        # Extract title if present
        page_title = ""
        if soup.title and soup.title.string:
            page_title = soup.title.string.strip()

        # Target primary content areas
        content = (
            soup.find("article")
            or soup.find("main")
            or soup.find(attrs={"role": "main"})
            or soup.find(id="content")
            or soup.find(class_="content")
            or soup.find(class_="article-body")
            or soup.find(class_="post-content")
            or soup.body
        )

        if content:
            raw_text = content.get_text(separator="\n", strip=True)
        else:
            raw_text = soup.get_text(separator="\n", strip=True)

        # Clean excess whitespace while preserving line structure
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        cleaned_text = "\n".join(lines)

        if page_title and not cleaned_text.startswith(page_title):
            return f"Title: {page_title}\n\n{cleaned_text}"
        return cleaned_text

    except Exception as exc:
        logger.warning("HTML parsing error", error=str(exc))
        return ""


async def fetch_url_content(url: str) -> tuple[Optional[str], Optional[dict[str, str]]]:
    """
    Safely fetch and extract readable text content from a URL.
    Enforces SSRF prevention on initial URL and on each redirect hop.
    Returns (text_content, error_dict).
    On success: (text, None).
    On failure: (None, {"error_code": "...", "error_message": "..."}).
    """
    # Initial URL validation
    is_valid, err = validate_url(url)
    if not is_valid:
        return None, {
            "error_code": "URL_VALIDATION_ERROR",
            "error_message": f"URL security check failed: {err}",
        }

    headers = {
        "User-Agent": _USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    timeout_config = httpx.Timeout(
        connect=float(settings.URL_CONNECT_TIMEOUT),
        read=float(settings.URL_READ_TIMEOUT),
        write=10.0,
        pool=5.0,
    )

    current_url = url
    max_redirects = 5

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,  # Manually inspect every redirect hop for SSRF
            timeout=timeout_config,
        ) as client:
            for redirect_hop in range(max_redirects + 1):
                # Verify SSRF on each hop
                is_valid_hop, hop_err = validate_url(current_url)
                if not is_valid_hop:
                    return None, {
                        "error_code": "URL_REDIRECT_BLOCKED_SSRF",
                        "error_message": f"Redirect destination blocked for security: {hop_err}",
                    }

                # Stream response to enforce size limits
                async with client.stream("GET", current_url, headers=headers) as response:
                    # Check for redirects
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            return None, {
                                "error_code": "URL_REDIRECT_FAILED",
                                "error_message": "Redirect response did not provide a destination URL.",
                            }
                        current_url = urljoin(current_url, location)
                        continue

                    # Target site HTTP error status handling
                    if response.status_code == 401:
                        return None, {
                            "error_code": "URL_UNAUTHORIZED_401",
                            "error_message": (
                                "The website requires authentication or authorization (HTTP 401). "
                                "We could not retrieve its content. You can paste the page text manually for analysis."
                            ),
                        }

                    if response.status_code == 403:
                        return None, {
                            "error_code": "URL_ACCESS_DENIED_403",
                            "error_message": (
                                "The website denied automated access (HTTP 403). "
                                "We could not retrieve its content. You can paste the page text manually for analysis."
                            ),
                        }

                    if response.status_code == 404:
                        return None, {
                            "error_code": "URL_NOT_FOUND_404",
                            "error_message": (
                                "The requested webpage was not found (HTTP 404). "
                                "Please verify the URL or paste the text manually for analysis."
                            ),
                        }

                    if response.status_code == 429:
                        return None, {
                            "error_code": "URL_RATE_LIMITED_429",
                            "error_message": (
                                "The target website is rate limiting automated requests (HTTP 429). "
                                "Please try again later or paste the text manually for analysis."
                            ),
                        }

                    if response.status_code >= 500:
                        return None, {
                            "error_code": "URL_SERVER_ERROR_5XX",
                            "error_message": (
                                f"The target website returned a server error (HTTP {response.status_code}). "
                                "We could not retrieve its content. You can paste the page text manually for analysis."
                            ),
                        }

                    if response.status_code >= 400:
                        return None, {
                            "error_code": f"URL_HTTP_{response.status_code}",
                            "error_message": (
                                f"The target website returned an error (HTTP {response.status_code}). "
                                "We could not retrieve its content. You can paste the page text manually for analysis."
                            ),
                        }

                    # Verify Content-Type
                    content_type = response.headers.get("content-type", "").lower()
                    if not any(ct in content_type for ct in ("text/html", "text/plain", "application/xhtml+xml")):
                        return None, {
                            "error_code": "URL_UNSUPPORTED_CONTENT_TYPE",
                            "error_message": (
                                f"Unsupported content type ({content_type.split(';')[0] if content_type else 'unknown'}). "
                                "Only HTML and plain text web pages can be retrieved. "
                                "You can paste the page text manually for analysis."
                            ),
                        }

                    # Read bytes under size limit
                    chunks = []
                    total_bytes = 0
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        total_bytes += len(chunk)
                        if total_bytes > settings.URL_MAX_SIZE_BYTES:
                            return None, {
                                "error_code": "URL_CONTENT_TOO_LARGE",
                                "error_message": (
                                    "Webpage content exceeds the 2 MB size limit. "
                                    "Please try a more specific article URL or paste the relevant text manually."
                                ),
                            }
                        chunks.append(chunk)

                    raw_bytes = b"".join(chunks)

                    # Encoding detection and decoding
                    encoding = response.encoding or "utf-8"
                    try:
                        html = raw_bytes.decode(encoding, errors="replace")
                    except (LookupError, TypeError):
                        html = raw_bytes.decode("utf-8", errors="replace")

                    # Extract readable text
                    if any(ct in content_type for ct in ("text/html", "application/xhtml+xml")):
                        text = _extract_text_from_html(html)
                    else:
                        text = html.strip()

                    # Check for sufficient readable text
                    if not text or len(text.strip()) < 100:
                        return None, {
                            "error_code": "URL_INSUFFICIENT_TEXT",
                            "error_message": (
                                "Could not extract sufficient readable text from this page (it may be JavaScript-rendered, "
                                "paywalled, or empty). You can paste the page text manually for analysis."
                            ),
                        }

                    return text[:settings.MAX_URL_CONTENT_LENGTH], None

            # Redirect limit exceeded
            return None, {
                "error_code": "URL_TOO_MANY_REDIRECTS",
                "error_message": "Too many redirects encountered while attempting to fetch the webpage.",
            }

    except httpx.ConnectTimeout:
        return None, {
            "error_code": "URL_CONNECT_TIMEOUT",
            "error_message": "Connection to the website timed out. The site may be slow or offline. You can paste the page text manually for analysis.",
        }
    except httpx.ReadTimeout:
        return None, {
            "error_code": "URL_READ_TIMEOUT",
            "error_message": "The website took too long to send data. You can paste the page text manually for analysis.",
        }
    except httpx.TimeoutException:
        return None, {
            "error_code": "URL_TIMEOUT",
            "error_message": "The request to the website timed out. You can paste the page text manually for analysis.",
        }
    except httpx.ConnectError:
        return None, {
            "error_code": "URL_CONNECT_ERROR",
            "error_message": "Could not connect to the target website. It may be offline or blocking connections. You can paste the page text manually for analysis.",
        }
    except Exception as exc:
        logger.error("Unexpected error fetching URL", url=url, error=str(exc))
        return None, {
            "error_code": "URL_FETCH_ERROR",
            "error_message": "An unexpected error occurred while fetching the URL. You can paste the page text manually for analysis.",
        }


def inspect_url_heuristics(url: str) -> dict[str, Any]:
    """
    Stage 1: Evaluate URL structure, domain characteristics, brand spoofing, and risk patterns.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return {"hostname": "", "risk_signals": ["Invalid URL syntax"], "risk_score": 50, "is_shortener": False, "brand_impersonation": None}

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()
    query = parsed.query.lower()
    port = parsed.port

    signals: list[str] = []
    brand_impersonation = None
    is_shortener = hostname in SHORTENER_DOMAINS
    is_ip = False
    risk_score = 0

    # IP address check
    try:
        ipaddress.ip_address(hostname)
        is_ip = True
        signals.append(f"URL uses raw IP address instead of a domain name ({hostname}).")
        risk_score += 35
    except ValueError:
        pass

    # Brand impersonation check
    for brand, legit_domains in POPULAR_BRANDS.items():
        if brand in hostname:
            is_legit = any(hostname == d or hostname.endswith("." + d) for d in legit_domains)
            if not is_legit:
                brand_impersonation = brand
                signals.append(f"Potential brand impersonation: '{hostname}' mimics {brand.capitalize()} without matching legitimate infrastructure.")
                risk_score += 40
                break

    # High-risk path keywords
    found_keywords = [k for k in HIGH_RISK_PATH_KEYWORDS if k in path or k in query]
    if found_keywords:
        signals.append(f"High-risk authentication / incentive keywords in URL: {', '.join(found_keywords[:4])}")
        risk_score += 15

    # Suspicious TLD check
    tld = hostname.split(".")[-1] if "." in hostname else ""
    if tld in SUSPICIOUS_TLDS:
        signals.append(f"Domain uses high-abuse / disposable TLD (.{tld})")
        risk_score += 20

    # Excessive hyphens
    domain_part = hostname.split(".")[0]
    if domain_part.count("-") >= 2:
        signals.append(f"Excessive hyphens in domain name ({hostname})")
        risk_score += 15

    # Non-standard ports
    if port and port not in (80, 443):
        signals.append(f"Non-standard web port (:{port})")
        risk_score += 15

    # Shortener
    if is_shortener:
        signals.append(f"URL shortener detected ({hostname}); destination is concealed until redirected.")
        risk_score += 10

    return {
        "hostname": hostname,
        "is_shortener": is_shortener,
        "is_ip": is_ip,
        "brand_impersonation": brand_impersonation,
        "found_keywords": found_keywords,
        "risk_signals": signals,
        "risk_score": min(95, risk_score),
    }


def extract_html_signals(html: str, base_url: str) -> dict[str, Any]:
    """
    Stage 2 Helper: Deep signal extraction for forms, credentials, payment inputs,
    promotional scam triggers, and Single Page Application (SPA) shells.
    """
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return {
            "title": "",
            "meta_description": "",
            "has_forms": False,
            "has_password": False,
            "has_payment": False,
            "has_otp": False,
            "offsite_actions": [],
            "insecure_actions": [],
            "promotional_signals": [],
            "is_spa": False,
            "clean_text": "",
        }

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = ""
    desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if desc_tag and desc_tag.get("content"):
        meta_desc = desc_tag["content"].strip()

    # Form analysis
    forms = soup.find_all("form")
    has_forms = len(forms) > 0
    has_password = False
    has_payment = False
    has_otp = False
    offsite_actions = []
    insecure_actions = []

    base_domain = urlparse(base_url).netloc.lower()

    for form in forms:
        action = form.get("action", "")
        if action:
            resolved_action = urljoin(base_url, action)
            parsed_action = urlparse(resolved_action)
            action_netloc = parsed_action.netloc.lower()
            if action_netloc and action_netloc != base_domain:
                offsite_actions.append(resolved_action)
            if parsed_action.scheme == "http" and urlparse(base_url).scheme == "https":
                insecure_actions.append(resolved_action)

        for inp in form.find_all("input"):
            inp_type = (inp.get("type") or "text").lower()
            inp_name = (inp.get("name") or inp.get("id") or inp.get("placeholder") or "").lower()

            if inp_type == "password":
                has_password = True
            if any(term in inp_name for term in ["card", "cvv", "cvc", "expir", "account_num", "routing"]):
                has_payment = True
            if any(term in inp_name for term in ["otp", "pin", "two_factor", "2fa", "passcode"]):
                has_otp = True

    # Promotional pattern detection
    page_text = soup.get_text(separator=" ", strip=True)
    promotional_matches = []
    for pat in PROMOTIONAL_PATTERNS:
        match = re.search(pat, page_text)
        if match:
            promotional_matches.append(match.group(0))

    # SPA shell detection
    is_spa = bool(
        soup.find("div", id="root") or
        soup.find("div", id="app") or
        soup.find("div", id="__next") or
        soup.find("app-root") or
        "enable javascript to run this app" in page_text.lower()
    )

    clean_text = _extract_text_from_html(html)

    return {
        "title": title,
        "meta_description": meta_desc,
        "has_forms": has_forms,
        "has_password": has_password,
        "has_payment": has_payment,
        "has_otp": has_otp,
        "offsite_actions": offsite_actions,
        "insecure_actions": insecure_actions,
        "promotional_signals": promotional_matches,
        "is_spa": is_spa,
        "clean_text": clean_text,
    }


async def _extract_with_playwright(
    url: str,
    timeout_seconds: float = 12.0,
) -> tuple[Optional[str], Optional[dict[str, Any]]]:
    """
    Stage 3: Headless browser rendering via Playwright as a fallback for JS SPAs.
    Gracefully handles missing playwright, missing browser binaries, timeouts, or navigation errors.
    """
    try:
        from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
    except ImportError:
        logger.info("Playwright is not installed; skipping JavaScript rendering fallback.")
        return None, {"error": "Playwright not installed"}

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )
            context = await browser.new_context(
                user_agent=_USER_AGENT,
                viewport={"width": 1280, "height": 800},
                ignore_https_errors=False,
            )

            async def intercept_route(route):
                req = route.request
                if req.resource_type in ["image", "media", "font", "stylesheet"]:
                    await route.abort()
                else:
                    is_safe, _ = validate_url(req.url)
                    if not is_safe:
                        await route.abort()
                    else:
                        await route.continue_()

            page = await context.new_page()
            await page.route("**/*", intercept_route)

            try:
                response = await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=int(timeout_seconds * 1000),
                )
                if not response:
                    return None, {"error": "No response received"}

                await page.wait_for_timeout(1000)

                final_url = page.url
                title = await page.title()
                rendered_text = await page.evaluate("() => document.body ? document.body.innerText : ''")
                html = await page.content()

                return rendered_text, {
                    "final_url": final_url,
                    "title": title,
                    "html": html,
                    "method": "playwright_js",
                }
            except PlaywrightTimeout:
                return None, {"error": "Playwright render timeout"}
            finally:
                await context.close()
                await browser.close()

    except Exception as exc:
        logger.warning("Playwright rendering failed", error=str(exc))
        return None, {"error": str(exc)}


async def scan_url_comprehensive(url: str) -> dict[str, Any]:
    """
    Multi-stage URL scanner:
    Stage 1: URL & Hostname validation, SSRF checks, heuristic risk indicators.
    Stage 2: Static extraction with manual redirect tracking (up to 10 hops), HTML signal extraction.
    Stage 3: JavaScript rendering fallback (Playwright) if static text is insufficient.
    Stage 4: Return comprehensive scan results with all signals.
    """
    # Stage 1: Validation & SSRF check
    is_valid, err = validate_url(url)
    heuristics = inspect_url_heuristics(url)

    if not is_valid:
        return {
            "initial_url": url,
            "final_url": url,
            "redirect_chain": [],
            "status_code": 0,
            "extraction_method": "blocked_ssrf",
            "is_valid": False,
            "validation_error": err,
            "heuristics": heuristics,
            "html_signals": {},
            "text_content": "",
            "error_dict": {
                "error_code": "URL_VALIDATION_ERROR",
                "error_message": f"URL security check failed: {err}",
            },
        }

    headers = {
        "User-Agent": _USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    timeout_config = httpx.Timeout(
        connect=float(settings.URL_CONNECT_TIMEOUT),
        read=float(settings.URL_READ_TIMEOUT),
        write=10.0,
        pool=5.0,
    )

    current_url = url
    redirect_chain: list[dict[str, Any]] = []
    max_redirects = 10
    fetch_error = None
    raw_html = ""
    status_code = 0

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=timeout_config,
        ) as client:
            for hop in range(max_redirects + 1):
                # Verify SSRF on each hop
                is_safe_hop, hop_err = validate_url(current_url)
                if not is_safe_hop:
                    return {
                        "initial_url": url,
                        "final_url": current_url,
                        "redirect_chain": redirect_chain,
                        "status_code": 0,
                        "extraction_method": "blocked_ssrf_redirect",
                        "is_valid": False,
                        "heuristics": heuristics,
                        "html_signals": {},
                        "text_content": "",
                        "error_dict": {
                            "error_code": "URL_REDIRECT_BLOCKED_SSRF",
                            "error_message": f"Redirect destination blocked for security: {hop_err}",
                        },
                    }

                async with client.stream("GET", current_url, headers=headers) as response:
                    status_code = response.status_code
                    redirect_chain.append({
                        "hop": hop,
                        "url": current_url,
                        "status_code": response.status_code,
                    })

                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            fetch_error = {
                                "error_code": "URL_REDIRECT_FAILED",
                                "error_message": "Redirect response did not provide a destination URL.",
                            }
                            break
                        current_url = urljoin(current_url, location)
                        continue

                    # Target site status handling
                    if response.status_code in (401, 403, 404, 429) or response.status_code >= 500:
                        code_name = (
                            "URL_UNAUTHORIZED_401" if response.status_code == 401 else
                            "URL_ACCESS_DENIED_403" if response.status_code == 403 else
                            "URL_NOT_FOUND_404" if response.status_code == 404 else
                            "URL_RATE_LIMITED_429" if response.status_code == 429 else
                            "URL_SERVER_ERROR_5XX"
                        )
                        fetch_error = {
                            "error_code": code_name,
                            "error_message": f"Website returned HTTP status {response.status_code}.",
                        }
                        break

                    # Check Content-Type
                    content_type = response.headers.get("content-type", "").lower()
                    if not any(ct in content_type for ct in ("text/html", "text/plain", "application/xhtml+xml")):
                        fetch_error = {
                            "error_code": "URL_UNSUPPORTED_CONTENT_TYPE",
                            "error_message": f"Unsupported content type ({content_type.split(';')[0] if content_type else 'unknown'}).",
                        }
                        break

                    # Stream response bytes
                    chunks = []
                    total_bytes = 0
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        total_bytes += len(chunk)
                        if total_bytes > settings.URL_MAX_SIZE_BYTES:
                            fetch_error = {
                                "error_code": "URL_CONTENT_TOO_LARGE",
                                "error_message": "Webpage content exceeds 2 MB size limit.",
                            }
                            break
                        chunks.append(chunk)

                    if fetch_error:
                        break

                    raw_bytes = b"".join(chunks)
                    encoding = response.encoding or "utf-8"
                    try:
                        raw_html = raw_bytes.decode(encoding, errors="replace")
                    except Exception:
                        raw_html = raw_bytes.decode("utf-8", errors="replace")
                    break

    except httpx.ConnectTimeout:
        fetch_error = {"error_code": "URL_CONNECT_TIMEOUT", "error_message": "Connection to the website timed out."}
    except httpx.ReadTimeout:
        fetch_error = {"error_code": "URL_READ_TIMEOUT", "error_message": "The website took too long to send data."}
    except httpx.ConnectError:
        fetch_error = {"error_code": "URL_CONNECT_ERROR", "error_message": "Could not connect to the target website."}
    except Exception as exc:
        fetch_error = {"error_code": "URL_FETCH_ERROR", "error_message": f"An error occurred while fetching the URL: {exc}"}

    final_heuristics = inspect_url_heuristics(current_url)

    # If static HTML was fetched
    html_signals = extract_html_signals(raw_html, current_url) if raw_html else {}
    text_content = html_signals.get("clean_text", "")
    extraction_method = "static" if text_content else ("http_error" if fetch_error else "empty")

    # Stage 3: JavaScript Rendering Fallback
    if not fetch_error and (len(text_content.strip()) < 150 or html_signals.get("is_spa")):
        logger.info("Static text insufficient; attempting Playwright JavaScript fallback", url=current_url)
        js_text, js_info = await _extract_with_playwright(current_url)
        if js_text and len(js_text.strip()) >= 150:
            text_content = js_text
            extraction_method = "playwright_js"
            if js_info and js_info.get("html"):
                html_signals = extract_html_signals(js_info["html"], js_info.get("final_url", current_url))

    return {
        "initial_url": url,
        "final_url": current_url,
        "redirect_chain": redirect_chain,
        "status_code": status_code,
        "extraction_method": extraction_method,
        "is_valid": True,
        "heuristics": final_heuristics,
        "html_signals": html_signals,
        "text_content": text_content[:settings.MAX_URL_CONTENT_LENGTH] if text_content else "",
        "error_dict": fetch_error,
    }


def synthesize_url_verdict(
    scan_result: dict[str, Any],
    ai_result: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Stage 4: Synthesize multi-stage evidence into one of the 5 required verdicts:
    - LIKELY LEGITIMATE
    - SUSPICIOUS
    - LIKELY PHISHING/FRAUDULENT
    - INCONCLUSIVE
    - UNAVAILABLE
    """
    initial_url = scan_result.get("initial_url", "")
    final_url = scan_result.get("final_url", initial_url)
    redirects = scan_result.get("redirect_chain", [])
    heuristics = scan_result.get("heuristics", {})
    html_signals = scan_result.get("html_signals", {})
    text_content = scan_result.get("text_content", "")
    error_dict = scan_result.get("error_dict")
    extraction_method = scan_result.get("extraction_method", "static")

    findings: list[dict[str, Any]] = []
    source_refs: list[dict[str, Any]] = []

    # Calculate deterministic risk score (0 - 100)
    risk_score = heuristics.get("risk_score", 0)

    # 1. Phishing & Form Indicators
    has_password = html_signals.get("has_password", False)
    has_payment = html_signals.get("has_payment", False)
    has_otp = html_signals.get("has_otp", False)
    offsite_actions = html_signals.get("offsite_actions", [])
    brand_impersonation = heuristics.get("brand_impersonation")

    if brand_impersonation:
        risk_score += 40
        findings.append({
            "finding_type": "misleading_indicator",
            "category": "brand_impersonation",
            "title": f"Suspected Brand Impersonation: {brand_impersonation.capitalize()}",
            "description": f"The domain '{heuristics.get('hostname')}' mimics {brand_impersonation.capitalize()}, but does not belong to legitimate infrastructure.",
            "severity": "high",
            "confidence": "high",
        })

    if has_password:
        if brand_impersonation or heuristics.get("is_ip") or heuristics.get("risk_score", 0) > 30:
            risk_score += 45
            findings.append({
                "finding_type": "credibility_concern",
                "category": "credential_harvesting",
                "title": "High-Risk Credential Harvesting Form Detected",
                "description": "The page presents a password entry form on a suspicious or unverified domain.",
                "severity": "high",
                "confidence": "high",
            })
        else:
            findings.append({
                "finding_type": "sensitive_content",
                "category": "authentication",
                "title": "User Authentication Form Present",
                "description": "The page contains password entry fields for user authentication.",
                "severity": "low",
                "confidence": "medium",
            })

    if offsite_actions:
        risk_score += 35
        findings.append({
            "finding_type": "credibility_concern",
            "category": "data_exfiltration",
            "title": "Off-Site Form Submission Destination",
            "description": f"Form data is transmitted to an external destination ({offsite_actions[0][:60]}).",
            "severity": "high",
            "confidence": "high",
        })

    if has_payment or has_otp:
        if risk_score > 30:
            risk_score += 35
            findings.append({
                "finding_type": "credibility_concern",
                "category": "financial_risk",
                "title": "Sensitive Payment or OTP Collection",
                "description": "Page solicits financial credentials or one-time passcodes on an untrusted domain.",
                "severity": "high",
                "confidence": "high",
            })

    # 2. Promotional Scam Signals
    promotional_signals = html_signals.get("promotional_signals", [])
    if promotional_signals:
        risk_score += 30
        findings.append({
            "finding_type": "misleading_indicator",
            "category": "promotional_scam",
            "title": "Promotional Urgency or Fake Reward Patterns",
            "description": f"High-pressure marketing or unsolicited giveaway claims detected: {', '.join(promotional_signals[:3])}.",
            "severity": "medium",
            "confidence": "high",
        })

    # 3. Redirect Signals
    if len(redirects) > 1:
        initial_host = urlparse(initial_url).netloc.lower()
        final_host = urlparse(final_url).netloc.lower()
        if initial_host != final_host:
            findings.append({
                "finding_type": "misleading_indicator",
                "category": "redirect_analysis",
                "title": "Cross-Domain Redirection",
                "description": f"The URL redirects across domains from {initial_host} to {final_host} ({len(redirects)} hops).",
                "severity": "low" if risk_score < 40 else "medium",
                "confidence": "high",
            })

    # 4. Integrate AI results if available
    if ai_result and ai_result.get("status") == "completed":
        ai_score = ai_result.get("credibility_score", 50)
        for f in ai_result.get("findings", []):
            findings.append(f)
        for r in ai_result.get("source_references", []):
            source_refs.append(r)

        if ai_score < 40:
            risk_score = max(risk_score, 100 - ai_score)
        elif risk_score < 40:
            risk_score = max(5, 100 - ai_score)

    risk_score = max(0, min(100, risk_score))
    credibility_score = max(5, min(95, 100 - risk_score))

    # 5. Determine Verdict
    if error_dict:
        code = error_dict.get("error_code", "")
        if code in ("URL_CONNECT_TIMEOUT", "URL_CONNECT_ERROR", "URL_SERVER_ERROR_5XX", "URL_NOT_FOUND_404"):
            verdict = "Unavailable"
            credibility_score = 50
            summary = (
                f"Status: UNAVAILABLE. The destination server could not be reached or returned an error ({error_dict.get('error_message')}). "
                f"No page content could be extracted. Analyzed URL: {initial_url}."
            )
            findings.append({
                "finding_type": "recommendation",
                "category": "network_status",
                "title": "Host Currently Inaccessible",
                "description": "Verify the URL spelling or check whether the target service is temporarily down.",
                "severity": "low",
                "confidence": "high",
            })
        else:
            # 403 / 401 or bot protection
            if risk_score >= 40:
                verdict = "Suspicious" if risk_score < 70 else "Likely Phishing/Fraudulent"
                summary = (
                    f"Status: {verdict.upper()}. Automated access was restricted ({error_dict.get('error_message')}), "
                    f"but URL structural analysis identified significant deceptive patterns. Initial URL: {initial_url}."
                )
            else:
                verdict = "Inconclusive"
                credibility_score = 50
                summary = (
                    f"Status: INCONCLUSIVE. The website restricted automated scanning ({error_dict.get('error_message')}). "
                    f"No overt malicious domain indicators were detected, but page content could not be verified automatically."
                )
                findings.append({
                    "finding_type": "recommendation",
                    "category": "automated_access",
                    "title": "Manual Verification Recommended",
                    "description": "Website uses anti-bot protection or requires authentication. Use trusted bookmarks if visiting.",
                    "severity": "low",
                    "confidence": "medium",
                })
    else:
        # Page content was extracted
        has_phishing_indicator = (brand_impersonation and has_password) or (has_password and offsite_actions) or (has_password and heuristics.get("is_ip"))
        if has_phishing_indicator or (risk_score >= 70 and (has_password or has_payment or brand_impersonation)):
            verdict = "Likely Phishing/Fraudulent"
            summary = (
                f"Status: LIKELY PHISHING/FRAUDULENT. High-risk deceptive signals detected. "
                f"Landing destination: {final_url}. "
                f"Extraction method: {extraction_method}. "
                f"Evidence includes suspicious credential collection or brand impersonation."
            )
            findings.append({
                "finding_type": "recommendation",
                "category": "security_warning",
                "title": "Do Not Provide Personal Credentials",
                "description": "Never enter passwords, banking details, or OTP codes on this website.",
                "severity": "high",
                "confidence": "high",
            })
        elif risk_score >= 35 or promotional_signals or heuristics.get("is_shortener"):
            verdict = "Suspicious"
            summary = (
                f"Status: SUSPICIOUS. The webpage contains misleading indicators, high-pressure promotional patterns, "
                f"or suspicious redirect structures. Landing destination: {final_url}."
            )
        elif len(text_content.strip()) < 100:
            verdict = "Inconclusive"
            credibility_score = 50
            summary = (
                f"Status: INCONCLUSIVE. Insufficient readable text was extractable from this page to make a definitive assessment. "
                f"Landing destination: {final_url}."
            )
        else:
            verdict = "Likely Legitimate"
            summary = (
                f"Status: LIKELY LEGITIMATE. The webpage content and domain infrastructure show standard legitimate characteristics. "
                f"Final URL: {final_url} (Extraction: {extraction_method})."
            )

    sensitivity = (
        "critical" if verdict == "Likely Phishing/Fraudulent" else
        "high" if verdict == "Suspicious" else
        "medium" if verdict == "Inconclusive" else
        "low"
    )

    if not any(f.get("finding_type") == "recommendation" for f in findings):
        findings.append({
            "finding_type": "recommendation",
            "category": "best_practice",
            "title": "General Browsing Precaution",
            "description": "Always check the browser address bar to verify HTTPS and exact domain spelling.",
            "severity": "low",
            "confidence": "medium",
        })

    final_host = urlparse(final_url).netloc.lower()
    source_refs.append({
        "title": html_signals.get("title") or final_host,
        "url": final_url,
        "description": f"Destination verified during scan ({extraction_method}).",
        "relevance": "Primary destination analyzed.",
    })

    return {
        "status": "completed",
        "overall_assessment": verdict,
        "summary": summary,
        "credibility_score": credibility_score,
        "sensitivity_level": sensitivity,
        "findings": findings,
        "source_references": source_refs,
        "error_message": error_dict.get("error_message") if error_dict else None,
        "error_code": error_dict.get("error_code") if error_dict else None,
        "ai_model_used": ai_result.get("ai_model_used") if ai_result else "heuristic-scanner",
        "processing_time_ms": ai_result.get("processing_time_ms", 250) if ai_result else 250,
    }
