"""
SOR SENTINEL — Safe Database Initialization & Admin Provisioning Script
Creates all tables if they do not exist and provisions an initial admin securely.
"""
import sys
import os
import getpass

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.db.database import Base, engine, SessionLocal
from app.models import User, Analysis, AnalysisFinding, SourceReference, ContactMessage, AuditLog
from app.core.security import hash_password
from app.core.config import get_settings


def init_database(admin_email: str = None, admin_password: str = None, admin_name: str = "System Administrator"):
    settings = get_settings()
    print("=" * 60)
    print("SOR SENTINEL - Database Initialization")
    print("=" * 60)
    print(f"Connecting to Oracle DSN: {settings.ORACLE_DSN} as {settings.ORACLE_USER}...")

    try:
        # Create tables using SQLAlchemy ORM models
        Base.metadata.create_all(bind=engine)
        print("[OK] All tables created or verified successfully.")

        # Provision administrator if credentials provided
        if admin_email and admin_password:
            db = SessionLocal()
            try:
                existing = db.query(User).filter(User.email == admin_email.lower().strip()).first()
                if existing:
                    print(f"Administrator account '{admin_email}' already exists. Updating role to admin...")
                    existing.role = "admin"
                    existing.is_active = True
                    db.commit()
                else:
                    admin_user = User(
                        full_name=admin_name,
                        email=admin_email.lower().strip(),
                        password_hash=hash_password(admin_password),
                        role="admin",
                        is_active=True,
                    )
                    db.add(admin_user)
                    db.commit()
                    print(f"[OK] Administrator account '{admin_email}' provisioned successfully.")
            finally:
                db.close()

        print("\nDatabase initialization complete.")
        return 0
    except Exception as exc:
        print(f"ERROR initializing database: {exc}")
        return 1


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Initialize SOR SENTINEL Oracle Database")
    parser.add_argument("--admin-email", help="Admin email to provision", default=None)
    parser.add_argument("--admin-password", help="Admin password", default=None)
    parser.add_argument("--admin-name", help="Admin display name", default="System Administrator")
    args = parser.parse_args()

    sys.exit(init_database(args.admin_email, args.admin_password, args.admin_name))
