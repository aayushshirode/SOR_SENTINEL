"""
SOR SENTINEL — Analysis Repository (Oracle DB operations)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.analysis import Analysis, AnalysisFinding, SourceReference


def _is_oracle_db(db: Session) -> bool:
    """Safely check if the underlying database is Oracle (handles mocks gracefully)."""
    try:
        bind = db.get_bind()
        name = getattr(getattr(bind, "dialect", None), "name", None)
        return str(name) == "oracle"
    except Exception:
        return False


def find_inflight_analysis(
    db: Session,
    user_id: int,
    analysis_type: str,
    input_text: Optional[str] = None,
    input_url: Optional[str] = None,
) -> Optional[Analysis]:
    """Find an ongoing identical analysis in 'processing' status created within the last 60 seconds."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
    query = (
        db.query(Analysis)
        .options(joinedload(Analysis.findings), joinedload(Analysis.source_references))
        .filter(
            Analysis.user_id == user_id,
            Analysis.analysis_type == analysis_type,
            Analysis.status == "processing",
            Analysis.created_at >= cutoff,
        )
    )
    if analysis_type == "text" and input_text:
        is_oracle = _is_oracle_db(db)

        if is_oracle:
            # In Oracle, CLOB cannot be compared directly with =; use dbms_lob.compare
            query = query.filter(
                Analysis.input_text.isnot(None),
                func.dbms_lob.compare(Analysis.input_text, input_text) == 0,
            )
        else:
            query = query.filter(Analysis.input_text == input_text)
    elif analysis_type == "url" and input_url:
        query = query.filter(Analysis.input_url == input_url)
    return query.first()


def create_analysis(
    db: Session,
    user_id: int,
    analysis_type: str,
    input_text: Optional[str] = None,
    input_url: Optional[str] = None,
) -> Analysis:
    analysis = Analysis(
        user_id=user_id,
        analysis_type=analysis_type,
        input_text=input_text,
        input_url=input_url,
        status="processing",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def update_analysis_result(db: Session, analysis_id: int, result: dict) -> Optional[Analysis]:
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            return None

        analysis.status = (result.get("status") or "completed")[:50]
        analysis.overall_assessment = (result.get("overall_assessment") or "")[:100] or None
        analysis.summary = result.get("summary")
        analysis.credibility_score = result.get("credibility_score")
        analysis.sensitivity_level = (result.get("sensitivity_level") or "")[:50] or None
        analysis.ai_model_used = (result.get("ai_model_used") or "")[:200] or None
        analysis.processing_time_ms = result.get("processing_time_ms")
        analysis.error_message = (result.get("error_message") or "")[:1000] or None
        analysis.updated_at = datetime.now(timezone.utc)

        # Attach transient error attributes for API serialization
        analysis.error_code = result.get("error_code")
        analysis.request_id = result.get("request_id")

        # Save findings
        for finding_data in result.get("findings", []):
            finding = AnalysisFinding(
                analysis_id=analysis_id,
                finding_type=(finding_data.get("finding_type") or "credibility_concern")[:100],
                category=(finding_data.get("category") or "")[:200] or None,
                title=(finding_data.get("title") or "Finding")[:500],
                description=finding_data.get("description") or "",
                severity=(finding_data.get("severity") or "")[:50] or None,
                confidence=(finding_data.get("confidence") or "")[:50] or None,
            )
            db.add(finding)

        # Save source references
        for ref_data in result.get("source_references", []):
            ref = SourceReference(
                analysis_id=analysis_id,
                title=(ref_data.get("title") or "")[:500] or None,
                url=(ref_data.get("url") or "")[:2000] or None,
                description=ref_data.get("description"),
                relevance=(ref_data.get("relevance") or "")[:500] or None,
            )
            db.add(ref)

        db.commit()
        db.refresh(analysis)
        return analysis
    except Exception:
        db.rollback()
        raise


def get_analysis_by_id(db: Session, analysis_id: int) -> Optional[Analysis]:
    return (
        db.query(Analysis)
        .options(joinedload(Analysis.findings), joinedload(Analysis.source_references))
        .filter(Analysis.id == analysis_id)
        .first()
    )


def get_user_analyses(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    verdict_filter: Optional[str] = None,
    sensitivity_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Analysis], int]:
    """Retrieve paginated and filtered analyses for a specific user with Oracle-safe queries."""
    query = db.query(Analysis).filter(Analysis.user_id == user_id)

    if type_filter and type_filter in ("text", "url"):
        query = query.filter(Analysis.analysis_type == type_filter)

    if status_filter:
        query = query.filter(Analysis.status == status_filter)

    if verdict_filter:
        query = query.filter(Analysis.overall_assessment.ilike(f"%{verdict_filter}%"))

    if sensitivity_filter:
        query = query.filter(func.lower(Analysis.sensitivity_level) == sensitivity_filter.lower())

    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date[:10])
            query = query.filter(Analysis.created_at >= s_dt)
        except Exception:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date[:10]) + timedelta(days=1)
            query = query.filter(Analysis.created_at < e_dt)
        except Exception:
            pass

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        is_oracle = _is_oracle_db(db)

        conditions = [
            Analysis.input_url.ilike(search_pattern),
            Analysis.overall_assessment.ilike(search_pattern),
            Analysis.summary.ilike(search_pattern),
        ]
        if is_oracle:
            conditions.append(func.dbms_lob.instr(Analysis.input_text, search.strip()) > 0)
        else:
            conditions.append(Analysis.input_text.ilike(search_pattern))

        query = query.filter(or_(*conditions))

    total = query.count()

    # Sorting
    is_asc = (sort_order.lower() == "asc")
    if sort_by in ("score", "credibility_score"):
        order_col = Analysis.credibility_score.asc().nullsfirst() if is_asc else Analysis.credibility_score.desc().nullslast()
    elif sort_by in ("type", "analysis_type"):
        order_col = Analysis.analysis_type.asc() if is_asc else Analysis.analysis_type.desc()
    else:
        order_col = Analysis.created_at.asc() if is_asc else Analysis.created_at.desc()

    items = query.order_by(order_col).offset(skip).limit(limit).all()
    return items, total


def get_analyses_for_export(
    db: Session,
    user_id: int,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    verdict_filter: Optional[str] = None,
    sensitivity_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 1000,
) -> list[Analysis]:
    """Retrieve full analysis records for CSV/PDF export with joined findings."""
    query = (
        db.query(Analysis)
        .options(joinedload(Analysis.findings))
        .filter(Analysis.user_id == user_id)
    )

    if type_filter and type_filter in ("text", "url"):
        query = query.filter(Analysis.analysis_type == type_filter)
    if status_filter:
        query = query.filter(Analysis.status == status_filter)
    if verdict_filter:
        query = query.filter(Analysis.overall_assessment.ilike(f"%{verdict_filter}%"))
    if sensitivity_filter:
        query = query.filter(func.lower(Analysis.sensitivity_level) == sensitivity_filter.lower())
    if start_date:
        try:
            query = query.filter(Analysis.created_at >= datetime.fromisoformat(start_date[:10]))
        except Exception:
            pass
    if end_date:
        try:
            query = query.filter(Analysis.created_at < datetime.fromisoformat(end_date[:10]) + timedelta(days=1))
        except Exception:
            pass
    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        is_oracle = _is_oracle_db(db)

        conditions = [
            Analysis.input_url.ilike(search_pattern),
            Analysis.overall_assessment.ilike(search_pattern),
            Analysis.summary.ilike(search_pattern),
        ]
        if is_oracle:
            conditions.append(func.dbms_lob.instr(Analysis.input_text, search.strip()) > 0)
        else:
            conditions.append(Analysis.input_text.ilike(search_pattern))
        query = query.filter(or_(*conditions))

    return query.order_by(Analysis.created_at.desc()).limit(limit).all()


def delete_analysis(db: Session, analysis_id: int, user_id: int) -> bool:
    """Delete an analysis only if it belongs to the specified user."""
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)
        .first()
    )
    if not analysis:
        return False
    db.delete(analysis)
    db.commit()
    return True


def get_dashboard_summary(db: Session, user_id: int) -> dict:
    total = db.query(func.count(Analysis.id)).filter(Analysis.user_id == user_id).scalar() or 0
    text_count = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.analysis_type == "text")
        .scalar() or 0
    )
    url_count = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.analysis_type == "url")
        .scalar() or 0
    )
    completed = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.status == "completed")
        .scalar() or 0
    )
    failed = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.status == "failed")
        .scalar() or 0
    )
    recent = (
        db.query(Analysis)
        .filter(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )

    # Assessment distribution
    assessment_rows = (
        db.query(Analysis.overall_assessment, func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.overall_assessment.isnot(None))
        .group_by(Analysis.overall_assessment)
        .all()
    )
    assessment_dist = {row[0].strip(): row[1] for row in assessment_rows if row[0] and row[0].strip()}

    # Sensitivity distribution (standardized lowercase)
    sens_col = func.lower(func.trim(Analysis.sensitivity_level))
    sensitivity_rows = (
        db.query(sens_col, func.count(Analysis.id))
        .filter(Analysis.user_id == user_id, Analysis.sensitivity_level.isnot(None))
        .group_by(sens_col)
        .all()
    )
    sensitivity_dist = {row[0]: row[1] for row in sensitivity_rows if row[0]}

    return {
        "total_analyses": total,
        "text_analyses": text_count,
        "url_analyses": url_count,
        "completed_analyses": completed,
        "failed_analyses": failed,
        "recent_analyses": recent,
        "assessment_distribution": assessment_dist,
        "sensitivity_distribution": sensitivity_dist,
    }


def get_activity_data(db: Session, user_id: int, days: int = 30, view: str = "daily") -> list[dict]:
    """
    Return continuous chronological analysis counts for the specified period and view.
    Fills empty days/weeks/months with count 0 so charts reflect true activity.
    """
    now = datetime.now(timezone.utc)
    is_oracle = _is_oracle_db(db)

    if view == "weekly":
        num_weeks = 12
        start_week = (now - timedelta(weeks=num_weeks - 1))
        start_week_date = (start_week - timedelta(days=start_week.weekday())).date()
        start_dt = datetime(start_week_date.year, start_week_date.month, start_week_date.day, tzinfo=timezone.utc)

        if is_oracle:
            week_col = func.trunc(Analysis.created_at, "IW")
        else:
            week_col = func.date(Analysis.created_at, "weekday 0", "-6 days")

        try:
            rows = (
                db.query(week_col.label("w"), func.count(Analysis.id).label("count"))
                .filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt)
                .group_by(week_col)
                .all()
            )
        except Exception:
            raw_rows = db.query(Analysis.created_at).filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt).all()
            counts: dict[str, int] = {}
            for r in raw_rows:
                if r.created_at:
                    w_date = (r.created_at.date() - timedelta(days=r.created_at.weekday())).strftime("%Y-%m-%d")
                    counts[w_date] = counts.get(w_date, 0) + 1
            rows = [(datetime.strptime(k, "%Y-%m-%d"), v) for k, v in counts.items()]

        counts_by_week: dict[str, int] = {}
        for r in rows:
            dt_val = r[0]
            d_str = dt_val.strftime("%Y-%m-%d") if hasattr(dt_val, "strftime") else str(dt_val)[:10]
            counts_by_week[d_str] = r[1]

        timeline = []
        for i in range(num_weeks):
            w_start = start_week_date + timedelta(weeks=i)
            w_str = w_start.strftime("%Y-%m-%d")
            timeline.append({
                "date": w_str,
                "count": counts_by_week.get(w_str, 0),
                "label": f"Wk of {w_start.strftime('%b %d')}",
            })
        return timeline

    elif view == "monthly":
        num_months = 12
        curr_year = now.year
        curr_month = now.month
        start_month_idx = curr_year * 12 + (curr_month - 1) - (num_months - 1)
        start_year = start_month_idx // 12
        start_month = (start_month_idx % 12) + 1
        start_dt = datetime(start_year, start_month, 1, tzinfo=timezone.utc)

        if is_oracle:
            m_col = func.trunc(Analysis.created_at, "MM")
        else:
            m_col = func.strftime("%Y-%m-01", Analysis.created_at)

        try:
            rows = (
                db.query(m_col.label("m"), func.count(Analysis.id).label("count"))
                .filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt)
                .group_by(m_col)
                .all()
            )
        except Exception:
            raw_rows = db.query(Analysis.created_at).filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt).all()
            counts = {}
            for r in raw_rows:
                if r.created_at:
                    m_str = r.created_at.strftime("%Y-%m-01")
                    counts[m_str] = counts.get(m_str, 0) + 1
            rows = [(datetime.strptime(k, "%Y-%m-%d"), v) for k, v in counts.items()]

        counts_by_month: dict[str, int] = {}
        for r in rows:
            dt_val = r[0]
            d_str = dt_val.strftime("%Y-%m-01") if hasattr(dt_val, "strftime") else str(dt_val)[:10]
            counts_by_month[d_str] = r[1]

        timeline = []
        for i in range(num_months):
            m_idx = start_month_idx + i
            y = m_idx // 12
            m = (m_idx % 12) + 1
            m_dt = datetime(y, m, 1)
            m_str = m_dt.strftime("%Y-%m-01")
            timeline.append({
                "date": m_str,
                "count": counts_by_month.get(m_str, 0),
                "label": m_dt.strftime("%b %Y"),
            })
        return timeline

    else:
        # Daily
        period = max(7, min(90, days))
        start_day = (now - timedelta(days=period - 1)).date()
        start_dt = datetime(start_day.year, start_day.month, start_day.day, tzinfo=timezone.utc)

        if is_oracle:
            day_col = func.trunc(Analysis.created_at)
        else:
            day_col = func.date(Analysis.created_at)

        try:
            rows = (
                db.query(day_col.label("d"), func.count(Analysis.id).label("count"))
                .filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt)
                .group_by(day_col)
                .all()
            )
        except Exception:
            raw_rows = db.query(Analysis.created_at).filter(Analysis.user_id == user_id, Analysis.created_at >= start_dt).all()
            counts = {}
            for r in raw_rows:
                if r.created_at:
                    d_key = r.created_at.strftime("%Y-%m-%d")
                    counts[d_key] = counts.get(d_key, 0) + 1
            rows = [(datetime.strptime(k, "%Y-%m-%d"), v) for k, v in counts.items()]

        counts_by_day: dict[str, int] = {}
        for r in rows:
            dt_val = r[0]
            d_str = dt_val.strftime("%Y-%m-%d") if hasattr(dt_val, "strftime") else str(dt_val)[:10]
            counts_by_day[d_str] = r[1]

        timeline = []
        for i in range(period):
            cur_date = start_day + timedelta(days=i)
            cur_str = cur_date.strftime("%Y-%m-%d")
            timeline.append({
                "date": cur_str,
                "count": counts_by_day.get(cur_str, 0),
                "label": cur_date.strftime("%b %d"),
            })
        return timeline


def get_admin_analyses(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
) -> tuple[list[Analysis], int]:
    query = db.query(Analysis)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Analysis.input_url.ilike(pattern),
                Analysis.overall_assessment.ilike(pattern),
            )
        )
    total = query.count()
    items = query.order_by(Analysis.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_admin_stats(db: Session) -> dict:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total = db.query(func.count(Analysis.id)).scalar() or 0
    today = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.created_at >= today_start)
        .scalar() or 0
    )
    return {"total_analyses": total, "analyses_today": today}
