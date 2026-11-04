"""
SOR SENTINEL — Oracle Database Connection Verification Script
Tests Oracle connectivity using python-oracledb and reports status.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.core.config import get_settings
from app.db.database import check_db_connection, engine
from sqlalchemy import text


def main():
    settings = get_settings()
    print("=" * 60)
    print("SOR SENTINEL - Oracle Database Verification Utility")
    print("=" * 60)
    print(f"Target DSN: {settings.ORACLE_DSN}")
    print(f"User:       {settings.ORACLE_USER}")
    print("Testing connection...")

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM v$version WHERE ROWNUM = 1")).fetchone()
            print("STATUS: CONNECTED SUCCESSFULLY!")
            print(f"Oracle Version: {result[0] if result else 'Unknown'}")

            # Check tables
            tables = conn.execute(text(
                "SELECT table_name FROM user_tables WHERE table_name IN "
                "('USERS', 'ANALYSES', 'ANALYSIS_FINDINGS', 'SOURCE_REFERENCES', 'CONTACT_MESSAGES', 'AUDIT_LOGS')"
            )).fetchall()
            existing_tables = [t[0] for t in tables]
            print(f"Initialized tables found ({len(existing_tables)}/6): {', '.join(existing_tables) if existing_tables else 'None'}")
            return 0
    except Exception as exc:
        print("STATUS: CONNECTION FAILED")
        print(f"Details: {exc}")
        print("\nTroubleshooting tips:")
        print("1. Ensure Oracle Database service / container is started (e.g. docker run -d -p 1521:1521 gvenzl/oracle-xe)")
        print("2. Check ORACLE_DSN, ORACLE_USER, and ORACLE_PASSWORD in your .env file")
        print("3. Ensure the target user has CREATE SESSION and RESOURCE privileges")
        return 1


if __name__ == "__main__":
    sys.exit(main())
