"""
SOR SENTINEL — Application Configuration
Reads all settings from environment variables (never from hardcoded values).
"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_ROOT_DIR / ".env", _BACKEND_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "SOR SENTINEL"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production-minimum-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    DIGIKEEPER_SECRET_KEY: str = ""
    DIGIKEEPER_MAX_FILE_BYTES: int = 25 * 1024 * 1024  # 25 MB

    # Oracle Database
    ORACLE_USER: str = "sor_sentinel"
    ORACLE_PASSWORD: str = "changeme"
    ORACLE_DSN: str = "localhost:1521/XEPDB1"
    ORACLE_MIN_POOL: int = 2
    ORACLE_MAX_POOL: int = 10

    # OpenRouter AI
    OPENROUTER_API_KEY: str = "sk-or-changeme"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_FALLBACK_MODEL: str | None = None
    OPENROUTER_CONNECT_TIMEOUT: int = 15
    OPENROUTER_READ_TIMEOUT: int = 90
    OPENROUTER_TIMEOUT: int = 90
    OPENROUTER_MAX_RETRIES: int = 2

    # Google Gemini AI (Cubbis Cyber Assistant)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3-flash-preview"
    GEMINI_TIMEOUT: int = 45

    # Resend Email Service
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_TEST_RECIPIENT_EMAIL: str = "aayushshirode2007@gmail.com"

    # Frontend
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Analysis limits
    MAX_TEXT_LENGTH: int = 10000
    MIN_TEXT_LENGTH: int = 50
    MAX_URL_CONTENT_LENGTH: int = 50000
    MAX_ANALYSES_PER_HOUR: int = 20
    RATE_LIMIT_ANALYSES: str = "20/hour"
    RATE_LIMIT_CONTACT: str = "5/hour"

    # URL fetching
    URL_CONNECT_TIMEOUT: int = 10
    URL_READ_TIMEOUT: int = 15
    URL_MAX_SIZE_BYTES: int = 2_097_152  # 2 MB


@lru_cache()
def get_settings() -> Settings:
    return Settings()
