# SOR SENTINEL — REST API Documentation

Base URL: `/api/v1`  
Specification: OpenAPI 3.1.0 compliant (Interactive Swagger UI at `/docs`, ReDoc at `/redoc`)

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register`
Creates a new user account and returns JWT credentials.
- **Request Body**:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!",
    "confirm_password": "SecurePassword123!",
    "terms_accepted": true
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2026-11-03T12:00:00Z"
    }
  }
  ```

### `POST /auth/login`
Authenticates an existing user and returns JWT access tokens.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (`200 OK`): `TokenResponse`

### `POST /auth/logout`
Invalidates the current session.
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`): `{"message": "Logged out successfully"}`

### `GET /auth/me`
Retrieves the profile of the currently signed-in user.
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`): `User`

---

## 2. User Management Endpoints (`/api/v1/users`)

### `GET /users/me`
Returns the current user profile.

### `PUT /users/me`
Updates user profile information (e.g., full name).
- **Request Body**:
  ```json
  {
    "full_name": "Jane Smith"
  }
  ```

### `POST /users/me/change-password`
Changes the user's password. Requires verification of the current password.
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!",
    "confirm_new_password": "NewPassword456!"
  }
  ```

---

## 3. Analysis Endpoints (`/api/v1/analyses`)

### `POST /analyses/text`
Submits raw text for AI-powered credibility, misleading indicator, and sensitivity analysis.
- **Rate Limit**: 5 requests / minute
- **Request Body**:
  ```json
  {
    "text": "Full text passage between 50 and 10000 characters..."
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": 42,
    "user_id": 1,
    "analysis_type": "text",
    "input_text": "...",
    "status": "completed",
    "overall_assessment": "Potentially Misleading",
    "summary": "The text contains unverified medical assertions...",
    "credibility_score": 45,
    "sensitivity_level": "medium",
    "ai_model_used": "google/gemini-2.0-flash-001",
    "processing_time_ms": 1420,
    "created_at": "2026-11-03T12:30:00Z",
    "findings": [
      {
        "id": 101,
        "finding_type": "credibility_concern",
        "title": "Unsubstantiated Statistical Claim",
        "description": "Claims 94% efficacy without linking to peer-reviewed trial data.",
        "severity": "high",
        "confidence": "high"
      }
    ],
    "source_references": []
  }
  ```

### `POST /analyses/url`
Safely scrapes public web page content and processes it through the analysis pipeline.
- **Rate Limit**: 5 requests / minute
- **Request Body**:
  ```json
  {
    "url": "https://example.org/article"
  }
  ```

### `GET /analyses/`
Lists historical analyses for the authenticated user with pagination and filtering.
- **Query Parameters**:
  - `page`: integer (default 1)
  - `page_size`: integer (default 10, max 50)
  - `analysis_type`: string (`text` | `url`)
  - `status`: string (`completed` | `failed` | `pending`)

### `GET /analyses/{id}`
Fetches complete analysis details including all findings and source references.

### `DELETE /analyses/{id}`
Deletes an analysis record owned by the authenticated user.

---

## 4. Dashboard Endpoints (`/api/v1/dashboard`)

### `GET /dashboard/summary`
Returns personal telemetry for the signed-in user:
- Total analysis counts (overall, text, URL)
- Completed vs failed ratios
- Breakdown by sensitivity and assessment type
- Recent 5 analyses

### `GET /dashboard/activity`
Returns daily submission frequency over a requested historical period:
- **Query Parameter**: `days` (default 30)

---

## 5. Contact Endpoints (`/api/v1/contact`)

### `POST /contact/`
Submits a public enquiry or feedback message.
- **Rate Limit**: 3 requests / minute
- **Request Body**:
  ```json
  {
    "name": "Alex Taylor",
    "email": "alex@example.com",
    "subject": "Academic Demonstration Enquiry",
    "message": "We would like to review the architecture documentation..."
  }
  ```

---

## 6. Admin Endpoints (`/api/v1/admin`)

*All admin endpoints require an active user account with `role = 'admin'`.*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/overview` | System-wide counts, Oracle DB status, and AI service reachability |
| `GET` | `/admin/users` | Searchable, paginated user list with analysis volumes |
| `PUT` | `/admin/users/{id}/activate` | Reactivates a suspended user account |
| `PUT` | `/admin/users/{id}/deactivate` | Suspends an active user account |
| `GET` | `/admin/analyses` | System-wide log of all submitted analyses |
| `GET` | `/admin/messages` | Inbox of public contact enquiries |
| `PUT` | `/admin/messages/{id}/read` | Marks an enquiry as resolved/read |
| `GET` | `/admin/audit-logs` | Chronological security and audit event trail |

---

## 7. Health Endpoints (`/api/v1/health`)

### `GET /health/`
Lightweight readiness probe returning `{"status": "ok"}`.

### `GET /health/detailed`
Deep telemetry probe checking Oracle Database connectivity, connection pool metrics, and OpenRouter AI reachability.
