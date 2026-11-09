"""
SOR SENTINEL — Backend Entry Point Re-export
Allows running either:
  python -m uvicorn main:app --reload --host 127.0.0.1 --port 8010
or:
  python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
directly from the backend directory.
"""
from app.main import app

__all__ = ["app"]
