"""
SOR SENTINEL — User Repository (Oracle DB operations)
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    clean = email.lower().strip()
    # 1. Direct case-insensitive match
    user = db.query(User).filter(func.lower(func.trim(User.email)) == clean).first()
    if user:
        return user

    # 2. Support account identity aliases for User 3 (Aayush Shirode)
    # Allows seamless authentication across original, requested, and stored email variants
    # without modifying database records or resetting credentials.
    aayush_aliases = {
        "aayush@gmail.com",
        "aayushshirode@gmail.com",
        "aayushshiorde@gmail.com",
    }
    if clean in aayush_aliases:
        user = (
            db.query(User)
            .filter(
                or_(
                    User.id == 3,
                    func.lower(func.trim(User.email)).in_(list(aayush_aliases)),
                )
            )
            .first()
        )
        if user:
            return user

    return None


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def update_user_email(db: Session, user_id: int, new_email: str) -> Optional[User]:
    clean = new_email.lower().strip()
    existing = db.query(User).filter(User.email == clean, User.id != user_id).first()
    if existing:
        raise ValueError(f"Email {clean} is already registered to another user.")
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.email = clean
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(
        full_name=user_data.full_name.strip(),
        email=user_data.email.lower().strip(),
        password_hash=hash_password(user_data.password),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: UserUpdate) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def update_password(db: Session, user_id: int, new_password: str) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return True


def update_last_login(db: Session, user_id: int) -> None:
    user = get_user_by_id(db, user_id)
    if user:
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()


def get_user_latest_login_audit(db: Session, user_id: int) -> Optional[datetime]:
    """Retrieve the latest successful login timestamp from audit logs before creating a new one."""
    log = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id, AuditLog.action == "LOGIN")
        .order_by(AuditLog.id.desc())
        .first()
    )
    if log and log.created_at:
        dt = log.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def get_user_previous_login(db: Session, user_id: int) -> Optional[datetime]:
    """Retrieve the previous successful login timestamp from audit logs (excluding current active login)."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id, AuditLog.action == "LOGIN")
        .order_by(AuditLog.id.desc())
        .limit(2)
        .all()
    )
    if len(logs) >= 2 and logs[1].created_at:
        dt = logs[1].created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
) -> tuple[list[User], int]:
    query = db.query(User)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users, total


def set_user_active(db: Session, user_id: int, is_active: bool) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.is_active = is_active
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def get_user_analysis_count(db: Session, user_id: int) -> int:
    from app.models.analysis import Analysis
    return db.query(func.count(Analysis.id)).filter(Analysis.user_id == user_id).scalar() or 0
