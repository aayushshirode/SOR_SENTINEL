"""
SOR SENTINEL — FastAPI Application Entry Point
"""
import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)
settings = get_settings()

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "SOR SENTINEL starting",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
    # Verify/create tables on startup
    try:
        from app.db.database import create_all_tables
        import app.models  # ensure models are registered with Base.metadata
        create_all_tables()
        logger.info("Oracle DB tables verified on startup")
    except Exception as exc:
        logger.warning("Could not auto-verify Oracle tables on startup", error=str(exc))
    yield
    logger.info("SOR SENTINEL shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "SOR SENTINEL — AI-powered source credibility and sensitivity checker. "
        "Analyzes text and web content for credibility indicators, misleading patterns, "
        "and sensitive content using the OpenRouter AI platform."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
    swagger_ui_init_oauth={
        "appName": "SOR SENTINEL",
        "usePkceWithAuthorizationCodeGrant": False,
    },
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Document both JSON and Form urlencoded request bodies for /api/v1/auth/login
    components = openapi_schema.setdefault("components", {})
    schemas = components.setdefault("schemas", {})
    if "OAuth2PasswordRequestForm" not in schemas:
        schemas["OAuth2PasswordRequestForm"] = {
            "title": "OAuth2PasswordRequestForm",
            "type": "object",
            "required": ["username", "password"],
            "properties": {
                "grant_type": {"title": "Grant Type", "type": "string", "default": "password"},
                "username": {"title": "Username / Email", "type": "string"},
                "password": {"title": "Password", "type": "string", "format": "password"},
                "scope": {"title": "Scope", "type": "string", "default": ""},
                "client_id": {"title": "Client ID (Optional)", "type": "string", "nullable": True},
                "client_secret": {"title": "Client Secret (Optional)", "type": "string", "nullable": True, "format": "password"},
            },
        }

    paths = openapi_schema.get("paths", {})
    login_op = paths.get("/api/v1/auth/login", {}).get("post")
    if login_op:
        login_op["requestBody"] = {
            "description": "Login credentials via JSON object or OAuth2 form-urlencoded parameters.",
            "required": True,
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/UserLogin"}
                },
                "application/x-www-form-urlencoded": {
                    "schema": {"$ref": "#/components/schemas/OAuth2PasswordRequestForm"}
                },
            },
        }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_origins = list({
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
})
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Request ID + Logging Middleware ───────────────────────────────────────────
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.monotonic()
    response = await call_next(request)
    duration_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        "HTTP request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ── Exception Handlers ────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field or "request", "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "health": "/api/v1/health/",
    }
