"""
SOR SENTINEL — Analysis Endpoints
"""
import csv
import io
import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.repositories import analysis_repository
from app.schemas.analysis import (
    TextAnalysisRequest, URLAnalysisRequest,
    AnalysisResponse, AnalysisSummary, PaginatedAnalyses,
)
from app.services.analysis_service import analyze_text, analyze_url

router = APIRouter(prefix="/analyses", tags=["Analysis"])


@router.post("/text", response_model=AnalysisResponse, status_code=201)
async def run_text_analysis(
    request: TextAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit text for credibility and sensitivity analysis."""
    return await analyze_text(db, current_user.id, request)


@router.post("/url", response_model=AnalysisResponse, status_code=201)
async def run_url_analysis(
    request: URLAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit a URL for credibility and sensitivity analysis."""
    return await analyze_url(db, current_user.id, request)


@router.get("/", response_model=PaginatedAnalyses)
def list_analyses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    analysis_type: Optional[str] = Query(None, pattern="^(text|url)$"),
    status: Optional[str] = Query(None, pattern="^(pending|processing|completed|failed)$"),
    verdict: Optional[str] = Query(None),
    sensitivity_level: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at", pattern="^(created_at|score|credibility_score|type|analysis_type)$"),
    sort_order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List the current user's analyses with advanced search, filtering, sorting, and pagination."""
    skip = (page - 1) * page_size
    items, total = analysis_repository.get_user_analyses(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        type_filter=analysis_type,
        status_filter=status,
        verdict_filter=verdict,
        sensitivity_filter=sensitivity_level,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by or "created_at",
        sort_order=sort_order or "desc",
    )
    if isinstance(total, int):
        total_pages = max(1, math.ceil(total / page_size))
    else:
        total = 0
        total_pages = 1

    summaries = []
    for item in items:
        text_preview = None
        if item.input_text:
            text_preview = item.input_text[:120] + ("..." if len(item.input_text) > 120 else "")
        summaries.append(
            AnalysisSummary(
                id=item.id,
                analysis_type=item.analysis_type,
                input_url=item.input_url,
                input_text_preview=text_preview,
                status=item.status,
                overall_assessment=item.overall_assessment,
                credibility_score=item.credibility_score,
                sensitivity_level=item.sensitivity_level,
                created_at=item.created_at,
            )
        )

    return PaginatedAnalyses(
        items=summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/export/csv")
def export_analyses_csv(
    analysis_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    sensitivity_level: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Export filtered user analyses as a downloadable CSV file."""
    analyses = analysis_repository.get_analyses_for_export(
        db=db,
        user_id=current_user.id,
        type_filter=analysis_type,
        status_filter=status,
        verdict_filter=verdict,
        sensitivity_filter=sensitivity_level,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )

    output = io.StringIO()
    # Add UTF-8 BOM so Excel opens accented/Devanagari characters properly
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow([
        "Analysis ID",
        "Type",
        "Target / Submitted Content",
        "Status",
        "Overall Assessment / Verdict",
        "Credibility Score (%)",
        "Sensitivity Level",
        "AI Model Used",
        "Processing Time (ms)",
        "Findings Count",
        "Created At (UTC)",
        "Summary / Findings Explanation",
    ])

    for a in analyses:
        target = a.input_url or (a.input_text[:250] if a.input_text else "—")
        summary_clean = (a.summary or "—").replace("\r\n", " ").replace("\n", " ").strip()
        writer.writerow([
            a.id,
            a.analysis_type.upper(),
            target,
            a.status,
            a.overall_assessment or "—",
            a.credibility_score if a.credibility_score is not None else "—",
            (a.sensitivity_level or "—").capitalize(),
            a.ai_model_used or "—",
            a.processing_time_ms if a.processing_time_ms is not None else "—",
            len(a.findings) if hasattr(a, "findings") and a.findings else 0,
            a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else "—",
            summary_clean,
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="sor_sentinel_analyses.csv"'},
    )


@router.get("/export/pdf")
def export_analyses_pdf(
    analysis_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    sensitivity_level: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Export filtered user analyses as an executive cybersecurity audit PDF."""
    analyses = analysis_repository.get_analyses_for_export(
        db=db,
        user_id=current_user.id,
        type_filter=analysis_type,
        status_filter=status,
        verdict_filter=verdict,
        sensitivity_filter=sensitivity_level,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )

    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f1629"),
    )
    meta_style = ParagraphStyle(
        "ReportMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    cell_style = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f1629"),
    )

    elements = []
    # Header Banner
    elements.append(Paragraph("SOR SENTINEL — CYBER AUDIT & ANALYSIS REPORT", title_style))
    elements.append(Spacer(1, 4))
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    filter_summary = f"User: {current_user.full_name} ({current_user.email}) | Generated: {now_str} | Total Records: {len(analyses)}"
    elements.append(Paragraph(filter_summary, meta_style))
    elements.append(Spacer(1, 12))

    # Metrics Summary Box
    total_count = len(analyses)
    scores = [a.credibility_score for a in analyses if a.credibility_score is not None]
    avg_score = f"{round(sum(scores) / len(scores))}%" if scores else "N/A"
    summary_data = [
        [
            Paragraph("<b>Total Analyses</b>", cell_style),
            Paragraph("<b>Average Credibility</b>", cell_style),
            Paragraph("<b>Completed Status</b>", cell_style),
            Paragraph("<b>Security Compliance</b>", cell_style),
        ],
        [
            Paragraph(f"<font size=11><b>{total_count}</b></font>", cell_bold),
            Paragraph(f"<font size=11><b>{avg_score}</b></font>", cell_bold),
            Paragraph(f"<font size=11><b>{sum(1 for a in analyses if a.status == 'completed')}</b></font>", cell_bold),
            Paragraph("<font size=11><b>VERIFIED</b></font>", cell_bold),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[135, 135, 135, 135])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 12))

    # Analyses Table
    table_data = [
        [
            Paragraph("<b>ID</b>", cell_bold),
            Paragraph("<b>Type</b>", cell_bold),
            Paragraph("<b>Target / Content Preview</b>", cell_bold),
            Paragraph("<b>Overall Verdict</b>", cell_bold),
            Paragraph("<b>Score</b>", cell_bold),
            Paragraph("<b>Sensitivity</b>", cell_bold),
            Paragraph("<b>Date</b>", cell_bold),
        ]
    ]

    for a in analyses:
        raw_target = a.input_url if a.input_url else ((a.input_text[:60] + "...") if a.input_text else "—")
        # escape HTML special characters for reportlab Paragraph
        target_preview = raw_target.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        raw_verdict = a.overall_assessment or "—"
        verdict_clean = raw_verdict.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        score_text = f"{a.credibility_score}%" if a.credibility_score is not None else "—"
        date_text = a.created_at.strftime("%b %d, %Y") if a.created_at else "—"
        table_data.append([
            Paragraph(str(a.id), cell_style),
            Paragraph(a.analysis_type.upper(), cell_style),
            Paragraph(target_preview, cell_style),
            Paragraph(verdict_clean, cell_style),
            Paragraph(score_text, cell_bold),
            Paragraph((a.sensitivity_level or "—").capitalize(), cell_style),
            Paragraph(date_text, cell_style),
        ])

    col_widths = [30, 45, 180, 115, 45, 65, 60]
    audit_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    audit_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1629")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
            ("TOPPADDING", (0, 0), (-1, 0), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    elements.append(audit_table)
    doc.build(elements)

    pdf_bytes = pdf_buffer.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="sor_sentinel_analyses.pdf"'},
    )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific analysis by ID. Users can only access their own analyses."""
    analysis = analysis_repository.get_analysis_by_id(db, analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    # Ownership check
    if analysis.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return analysis


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete an analysis. Users can only delete their own analyses."""
    deleted = analysis_repository.delete_analysis(db, analysis_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found or you do not have permission to delete it.",
        )
