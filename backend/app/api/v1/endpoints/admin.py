"""
SOR SENTINEL — Admin Endpoints (all require admin role)
"""
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_admin
from app.db.database import get_db, check_db_connection
from app.models.user import User
from app.repositories import user_repository, analysis_repository
from app.repositories.contact_repository import list_messages, mark_read, count_unread
from app.repositories.contact_repository import get_logs as get_audit_logs_repo
from app.repositories.contact_repository import log_action
from app.schemas.contact import AdminOverview, ContactResponse
from app.schemas.user import AdminUserListItem
from app.services.ai_service import check_ai_connectivity

# We re-import audit funcs from correct module
from app.repositories.contact_repository import get_logs as audit_get_logs

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/overview", response_model=AdminOverview)
async def admin_overview(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """System-wide statistics for the admin dashboard."""
    from sqlalchemy import func
    from app.models.user import User as UserModel
    from app.models.analysis import Analysis

    total_users = db.query(func.count(UserModel.id)).scalar() or 0
    active_users = db.query(func.count(UserModel.id)).filter(UserModel.is_active == True).scalar() or 0
    analysis_stats = analysis_repository.get_admin_stats(db)
    unread_msgs = count_unread(db)
    db_ok = check_db_connection()

    # Non-blocking AI check
    try:
        ai_ok = await check_ai_connectivity()
    except Exception:
        ai_ok = False

    return AdminOverview(
        total_users=total_users,
        active_users=active_users,
        total_analyses=analysis_stats["total_analyses"],
        analyses_today=analysis_stats["analyses_today"],
        pending_messages=unread_msgs,
        db_status="connected" if db_ok else "disconnected",
        ai_status="reachable" if ai_ok else "unreachable",
    )


@router.get("/users")
def list_all_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all users with search and pagination."""
    skip = (page - 1) * page_size
    users, total = user_repository.list_users(db, skip, page_size, search)
    items = []
    for u in users:
        count = user_repository.get_user_analysis_count(db, u.id)
        items.append(AdminUserListItem(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login_at=u.last_login_at,
            analysis_count=count,
        ))
    return {"items": [i.model_dump() for i in items], "total": total, "page": page,
            "page_size": page_size, "total_pages": max(1, math.ceil(total / page_size))}


@router.put("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Activate a user account."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account status.")
    user = user_repository.set_user_active(db, user_id, True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    log_action(db, "admin.user.activate", admin.id, "user", str(user_id))
    return {"message": f"User {user_id} activated."}


@router.put("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a user account."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    user = user_repository.set_user_active(db, user_id, False)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    log_action(db, "admin.user.deactivate", admin.id, "user", str(user_id))
    return {"message": f"User {user_id} deactivated."}


@router.get("/analyses")
def list_all_analyses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all analyses across all users."""
    skip = (page - 1) * page_size
    items, total = analysis_repository.get_admin_analyses(db, skip, page_size, search)
    return {
        "items": [
            {
                "id": a.id, "user_id": a.user_id, "analysis_type": a.analysis_type,
                "status": a.status, "overall_assessment": a.overall_assessment,
                "credibility_score": a.credibility_score,
                "sensitivity_level": a.sensitivity_level, "created_at": str(a.created_at),
            }
            for a in items
        ],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


@router.get("/messages")
def list_contact_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    msg_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List contact form submissions."""
    skip = (page - 1) * page_size
    items, total = list_messages(db, skip, page_size, msg_status)
    return {
        "items": [ContactResponse.model_validate(m).model_dump() for m in items],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


@router.put("/messages/{message_id}/read")
def mark_message_read(
    message_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Mark a contact message as read."""
    msg = mark_read(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    return {"message": "Message marked as read."}


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """View system audit logs."""
    from app.repositories.contact_repository import get_logs as _get_logs
    skip = (page - 1) * page_size
    items, total = _get_logs(db, skip, page_size, user_id, action)
    return {
        "items": [
            {
                "id": l.id, "user_id": l.user_id, "action": l.action,
                "resource_type": l.resource_type, "resource_id": l.resource_id,
                "ip_address": l.ip_address, "created_at": str(l.created_at),
            }
            for l in items
        ],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }
