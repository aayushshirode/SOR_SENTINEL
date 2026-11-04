"""
SOR SENTINEL — Dashboard Endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.repositories import analysis_repository
from app.schemas.contact import DashboardSummary, DashboardActivity, ActivityDataPoint, RecentAnalysisItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return dashboard summary statistics for the current user."""
    data = analysis_repository.get_dashboard_summary(db, current_user.id)
    recent = [
        RecentAnalysisItem(
            id=a.id,
            analysis_type=a.analysis_type,
            overall_assessment=a.overall_assessment,
            credibility_score=a.credibility_score,
            sensitivity_level=a.sensitivity_level,
            created_at=a.created_at,
            status=a.status,
        )
        for a in data["recent_analyses"]
    ]
    return DashboardSummary(
        total_analyses=data["total_analyses"],
        text_analyses=data["text_analyses"],
        url_analyses=data["url_analyses"],
        completed_analyses=data["completed_analyses"],
        failed_analyses=data["failed_analyses"],
        recent_analyses=recent,
        assessment_distribution=data["assessment_distribution"],
        sensitivity_distribution=data["sensitivity_distribution"],
    )


@router.get("/activity", response_model=DashboardActivity)
def get_activity(
    days: int = Query(30, ge=7, le=90),
    view: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return continuous chronological analysis activity for the requested period and view."""
    rows = analysis_repository.get_activity_data(db, current_user.id, days, view)
    return DashboardActivity(
        data=[ActivityDataPoint(date=r["date"], count=r["count"], label=r.get("label")) for r in rows],
        period_days=days,
        view=view,
    )
