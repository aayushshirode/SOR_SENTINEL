"""
SOR SENTINEL — Contact and Audit Log Repositories
"""
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.contact import ContactMessage
from app.models.audit_log import AuditLog
from app.schemas.contact import ContactCreate


# ── Contact Repository ────────────────────────────────────────────────────────
def create_message(
    db: Session, data: ContactCreate, ip: Optional[str] = None
) -> ContactMessage:
    msg = ContactMessage(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        subject=data.subject.strip(),
        message=data.message.strip(),
        ip_address=ip,
        status="unread",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def list_messages(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
) -> tuple[list[ContactMessage], int]:
    query = db.query(ContactMessage)
    if status:
        query = query.filter(ContactMessage.status == status)
    total = query.count()
    items = query.order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def mark_read(db: Session, message_id: int) -> Optional[ContactMessage]:
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        return None
    msg.status = "read"
    msg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return msg


def count_unread(db: Session) -> int:
    return db.query(ContactMessage).filter(ContactMessage.status == "unread").count()


# ── Audit Repository ──────────────────────────────────────────────────────────
def log_action(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    **kwargs,
) -> None:
    """Log an auditable action. Silently swallows errors to avoid breaking the main flow."""
    try:
        resolved_ip = ip or ip_address
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            details=details,
            ip_address=resolved_ip,
            user_agent=user_agent,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()


def get_logs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
) -> tuple[list[AuditLog], int]:
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return items, total
