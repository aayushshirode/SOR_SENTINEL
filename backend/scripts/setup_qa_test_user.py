import sys
sys.path.insert(0, 'backend')
from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

with SessionLocal() as db:
    qa_user = db.query(User).filter(User.email == "qa_tester@sorsentinel.com").first()
    if not qa_user:
        qa_user = User(
            full_name="QA Production Tester",
            email="qa_tester@sorsentinel.com",
            password_hash=hash_password("QaTestPassword2026!"),
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db.add(qa_user)
        db.commit()
        db.refresh(qa_user)
        print(f"Created QA user: id={qa_user.id}, email={qa_user.email}")
    else:
        qa_user.password_hash = hash_password("QaTestPassword2026!")
        qa_user.is_active = True
        qa_user.is_verified = True
        qa_user.role = "admin"
        db.commit()
        print(f"Updated QA user: id={qa_user.id}, email={qa_user.email}")
