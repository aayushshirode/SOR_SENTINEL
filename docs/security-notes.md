# SOR SENTINEL — Security Architecture & Threat Mitigation Notes

This document describes the application security controls, defensive countermeasures, and architectural boundaries implemented throughout SOR SENTINEL.

---

## 1. Threat Modeling & Countermeasures

| Threat Vector | Risk Description | Countermeasure Implemented |
|---|---|---|
| **Server-Side Request Forgery (SSRF)** | Malicious users submit internal URLs (e.g. `http://169.254.169.254/` or `http://localhost/admin`) to extract sensitive cloud metadata or scan internal services. | Multi-tier URL validation: Scheme enforcement (`http`, `https`), DNS pre-flight resolution, and immediate rejection of RFC 1918 private subnets, loopback interfaces, multicast, and link-local ranges. |
| **Credential Compromise & Replay** | Passwords compromised through rainbow tables or weak hashing. | Direct `bcrypt` algorithm hashing with salt cost factor 12. Plaintext passwords never persist in memory, logs, or databases. |
| **Token Hijacking & Session Abuse** | Stolen or expired authentication tokens. | Signed HMAC-SHA256 JWT tokens with explicit expiration timestamps (`exp`) and issuer validation (`iss`). Stored in client `sessionStorage` rather than `localStorage`. |
| **Denial of Service & API Abuse** | Brute-force attacks or automated scraping overloading the backend or exhausting LLM tokens. | In-memory distributed rate limiting via SlowAPI (e.g. 5 req/min on analysis endpoints, 3 req/min on contact). |
| **Secret Exposure** | Leaking AI API keys or database passwords to the frontend or public version control. | Strict backend isolation: Secrets reside exclusively in server-side environment variables (`.env`). The React client has zero awareness of the OpenRouter key or database credentials. |
| **Privilege Escalation** | Regular users modifying admin endpoints or escalating roles. | Role-Based Access Control (RBAC) enforced via FastAPI dependency injection (`get_current_admin`), cross-verifying user database status on every privileged route. |
| **SQL & ORM Injection** | Malicious payloads in query parameters or user text input. | Complete abstraction via SQLAlchemy 2.0 ORM with parameterized binding; no dynamic raw SQL string interpolation. |

---

## 2. SSRF Protection Implementation Details

The URL analysis engine (`backend/app/services/url_service.py`) incorporates strict SSRF validation prior to executing HTTP requests:

```python
# Prohibited Schemes
ALLOWED_SCHEMES = {"http", "https"}

# Blocked IP ranges:
# - Loopback: 127.0.0.0/8, ::1
# - Private: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
# - Cloud Metadata / Link-Local: 169.254.0.0/16, fe80::/10
# - Multicast & Broadcast: 224.0.0.0/4, 240.0.0.0/4
```

### Pre-Flight DNS Inspection
Before dispatching any HTTP request:
1. The hostname is extracted and parsed.
2. The hostname is resolved to its underlying IP addresses using `socket.getaddrinfo()`.
3. Every resolved IP address is checked against `ipaddress.ip_address()`.
4. If an IP falls into a private, loopback, or reserved subnet, an `HTTPException(400)` is thrown immediately before any connection is initiated.

---

## 3. Cryptographic Standards

- **Password Hashing**: `bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))`
- **JWT Signing**: Algorithm `HS256` with high-entropy `SECRET_KEY`
- **Session Expiration**: Configurable (default: 60 minutes for access tokens, 7 days for refresh tokens)

---

## 4. Responsible AI Guardrails

1. **System Prompt Hardening**: The AI prompt explicitly requires structured JSON responses, forces adherence to typed schema fields, and restricts the model from generating fabricated citations.
2. **Explicit Uncertainty Disclosure**: When submitted text lacks evidence, the engine mandates that findings be tagged as `requires_verification` or `insufficient_information`.
3. **Observation vs. Interpretation Separation**: The user interface clearly demarcates extracted text evidence from AI interpretations.
