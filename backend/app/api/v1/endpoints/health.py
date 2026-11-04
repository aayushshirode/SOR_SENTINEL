"""
SOR SENTINEL — Health Check Endpoints
"""
from fastapi import APIRouter
from app.db.database import check_db_connection
from app.services.ai_service import check_ai_connectivity
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", include_in_schema=False)
@router.get("/")
def health():
    """Basic health check — confirms the API is running."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/detailed")
async def health_detailed():
    """
    Detailed health check including Oracle DB and OpenRouter AI status.
    Does NOT expose secrets — only connectivity status.
    """
    db_ok = check_db_connection()
    try:
        ai_ok = await check_ai_connectivity()
    except Exception:
        ai_ok = False

    overall = "ok" if (db_ok and ai_ok) else "degraded"

    return {
        "status": overall,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "dependencies": {
            "oracle_database": "connected" if db_ok else "disconnected",
            "openrouter_ai": "reachable" if ai_ok else "unreachable",
        },
    }
