"""
SOR SENTINEL — Contact and Dashboard Pydantic Schemas
"""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Contact ───────────────────────────────────────────────────────────────────
class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    subject: str = Field(..., min_length=5, max_length=500)
    message: str = Field(..., min_length=20, max_length=5000)


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ─────────────────────────────────────────────────────────────────
class RecentAnalysisItem(BaseModel):
    id: int
    analysis_type: str
    overall_assessment: Optional[str] = None
    credibility_score: Optional[int] = None
    sensitivity_level: Optional[str] = None
    created_at: datetime
    status: str

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    total_analyses: int
    text_analyses: int
    url_analyses: int
    completed_analyses: int
    failed_analyses: int
    recent_analyses: list[RecentAnalysisItem]
    assessment_distribution: dict[str, int]
    sensitivity_distribution: dict[str, int]


class ActivityDataPoint(BaseModel):
    date: str   # ISO date string or formatted interval
    count: int
    label: Optional[str] = None


class DashboardActivity(BaseModel):
    data: list[ActivityDataPoint]
    period_days: int
    view: Optional[str] = "daily"


# ── Admin Overview ────────────────────────────────────────────────────────────
class AdminOverview(BaseModel):
    total_users: int
    active_users: int
    total_analyses: int
    analyses_today: int
    pending_messages: int
    db_status: str
    ai_status: str


# ── Generic pagination ────────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
