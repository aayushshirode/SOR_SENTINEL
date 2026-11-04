"""
SOR SENTINEL — Analysis Orchestration Service
"""
import time
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.repositories import analysis_repository
from app.schemas.analysis import TextAnalysisRequest, URLAnalysisRequest, AnalysisResponse
from app.services import ai_service, url_service

logger = get_logger(__name__)


async def analyze_text(
    db: Session, user_id: int, request: TextAnalysisRequest
) -> AnalysisResponse:
    """Full text analysis workflow: deduplicate in-flight → create record → AI → save findings → return."""
    # Check for in-flight identical request to prevent duplicate submissions
    existing_inflight = analysis_repository.find_inflight_analysis(
        db=db,
        user_id=user_id,
        analysis_type="text",
        input_text=request.text,
    )
    if existing_inflight:
        logger.info("Found existing in-flight analysis, awaiting or returning record", analysis_id=existing_inflight.id)
        return AnalysisResponse.model_validate(existing_inflight)

    analysis = analysis_repository.create_analysis(
        db=db,
        user_id=user_id,
        analysis_type="text",
        input_text=request.text,
    )
    analysis_id = analysis.id

    try:
        result = await ai_service.analyze_content(
            content=request.text,
            content_type="text",
        )
        analysis_repository.update_analysis_result(db, analysis_id, result)
        updated = analysis_repository.get_analysis_by_id(db, analysis_id)
        if updated:
            updated.error_code = result.get("error_code")
            updated.request_id = result.get("request_id")
        return AnalysisResponse.model_validate(updated)
    except Exception as exc:
        logger.error("Text analysis failed", analysis_id=analysis_id, error=str(exc))
        try:
            db.rollback()
        except Exception:
            pass
        analysis_repository.update_analysis_result(db, analysis_id, {
            "status": "failed",
            "error_code": "AI_UNEXPECTED_ERROR",
            "error_message": "Analysis service error. Please try again.",
        })
        updated = analysis_repository.get_analysis_by_id(db, analysis_id)
        if updated:
            updated.error_code = "AI_UNEXPECTED_ERROR"
        return AnalysisResponse.model_validate(updated)


async def analyze_url(
    db: Session, user_id: int, request: URLAnalysisRequest
) -> AnalysisResponse:
    """Full URL analysis workflow: validate → deduplicate in-flight → fetch → AI → save → return."""
    # SSRF validation before creating DB record
    is_valid, err = url_service.validate_url(request.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"URL validation failed: {err}",
        )

    # Check for in-flight identical URL analysis
    existing_inflight = analysis_repository.find_inflight_analysis(
        db=db,
        user_id=user_id,
        analysis_type="url",
        input_url=request.url,
    )
    if existing_inflight:
        logger.info("Found existing in-flight URL analysis", analysis_id=existing_inflight.id)
        return AnalysisResponse.model_validate(existing_inflight)

    analysis = analysis_repository.create_analysis(
        db=db,
        user_id=user_id,
        analysis_type="url",
        input_url=request.url,
    )
    analysis_id = analysis.id

    try:
        scan_result = await url_service.scan_url_comprehensive(request.url)
        text_content = scan_result.get("text_content", "")

        ai_result = None
        if text_content and len(text_content.strip()) >= 50:
            context_parts = [
                f"Webpage URL: {scan_result.get('initial_url')}",
                f"Final Destination: {scan_result.get('final_url')} ({len(scan_result.get('redirect_chain', []))} redirect hops)",
                f"Extraction Method: {scan_result.get('extraction_method')}",
            ]
            html_sig = scan_result.get("html_signals", {})
            if html_sig.get("title"):
                context_parts.append(f"Page Title: {html_sig.get('title')}")
            if html_sig.get("has_password"):
                context_parts.append("Security Signal: User password / authentication form detected.")
            if html_sig.get("has_payment"):
                context_parts.append("Security Signal: Payment or financial card entry fields detected.")
            if html_sig.get("has_otp"):
                context_parts.append("Security Signal: One-Time Passcode (OTP) or 2FA entry fields detected.")
            if html_sig.get("promotional_signals"):
                context_parts.append(f"Security Signal: Promotional urgency/reward claims detected: {', '.join(html_sig.get('promotional_signals')[:3])}")
            if html_sig.get("offsite_actions"):
                context_parts.append("Security Signal: Form data submits to external third-party destination.")

            context_header = "\n".join(context_parts)
            full_content = f"{context_header}\n\nPage Content:\n{text_content}"

            ai_result = await ai_service.analyze_content(
                content=full_content,
                content_type="webpage",
                source_url=scan_result.get("final_url", request.url),
            )

        final_result = url_service.synthesize_url_verdict(scan_result, ai_result)
        analysis_repository.update_analysis_result(db, analysis_id, final_result)
        updated = analysis_repository.get_analysis_by_id(db, analysis_id)
        if updated:
            updated.error_code = final_result.get("error_code")
            updated.request_id = ai_result.get("request_id") if ai_result else None
        return AnalysisResponse.model_validate(updated)

    except Exception as exc:
        logger.error("URL analysis failed", analysis_id=analysis_id, error=str(exc))
        try:
            db.rollback()
        except Exception:
            pass
        analysis_repository.update_analysis_result(db, analysis_id, {
            "status": "failed",
            "error_code": "URL_PROCESSING_ERROR",
            "error_message": "An error occurred while processing the URL. Please try again.",
        })
        updated = analysis_repository.get_analysis_by_id(db, analysis_id)
        if updated:
            updated.error_code = "URL_PROCESSING_ERROR"
        return AnalysisResponse.model_validate(updated)
