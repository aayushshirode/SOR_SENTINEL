"""
SOR SENTINEL — Oracle Database Connection and Session Management
Uses python-oracledb (thin mode) with SQLAlchemy ORM.
"""
from typing import Generator

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# ── Try to import oracledb; provide a clear error if missing ──────────────────
try:
    import oracledb  # noqa: F401
    _oracledb_available = True
except ImportError:
    _oracledb_available = False
    logger.warning(
        "oracledb not installed. Run: pip install oracledb. "
        "Database operations will fail until installed."
    )

from sqlalchemy import URL, create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ── Engine ───────────────────────────────────────────────────────────────────
_dsn = settings.ORACLE_DSN.strip() if settings.ORACLE_DSN else "localhost:1521/XEPDB1"
_host = "localhost"
_port = 1521
_service_name = "XEPDB1"

if "/" in _dsn:
    _host_port, _service_name = _dsn.split("/", 1)
    if ":" in _host_port:
        _host, _port_str = _host_port.split(":", 1)
        try:
            _port = int(_port_str)
        except ValueError:
            _port = 1521
    else:
        _host = _host_port

DATABASE_URL = URL.create(
    "oracle+oracledb",
    username=settings.ORACLE_USER,
    password=settings.ORACLE_PASSWORD,
    host=_host,
    port=_port,
    query={"service_name": _service_name},
)


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,           # Test connections before use
    pool_size=settings.ORACLE_MIN_POOL,
    max_overflow=settings.ORACLE_MAX_POOL - settings.ORACLE_MIN_POOL,
    echo=settings.DEBUG,          # SQL logging in debug mode
    connect_args={
        "mode": oracledb.DEFAULT_AUTH if _oracledb_available else None,
    } if _oracledb_available else {},
)

# ── Session ───────────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Base ──────────────────────────────────────────────────────────────────────
Base = declarative_base()


# ── Dependency ────────────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """
    Attempt a lightweight query to verify Oracle connectivity.
    Returns True if connection succeeds, False otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM DUAL"))
        return True
    except Exception as exc:
        logger.warning("Oracle DB health check failed", error=str(exc))
        return False


def create_all_tables() -> None:
    """Create all tables (used for development/testing only)."""
    Base.metadata.create_all(bind=engine)
