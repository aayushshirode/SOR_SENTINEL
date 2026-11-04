"""
SOR SENTINEL — Cubbis AI Cyber Assistant API Endpoints
Provides authenticated chat, conversation management, and history retrieval.
"""
from typing import Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from google.genai import errors as genai_errors

from app.core.config import get_settings
from app.db.database import get_db
from app.models.user import User
from app.api.dependencies import get_current_active_user
from app.repositories import cubbis_repository
from app.repositories.contact_repository import log_action
from app.services import cubbis_service
from app.schemas.cubbis import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationListResponse,
    ConversationDetail,
    ConversationSummary,
    MessageItem,
    DeleteResponse,
)

logger = structlog.get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/cubbis", tags=["Cubbis AI Assistant"])


@router.post("/chat", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
async def chat_with_cubbis(
    payload: ChatMessageRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Send a message to Cubbis AI Cyber Assistant.
    Maintains conversation session, user isolation, and Oracle DB persistence.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    # 1. Resolve or create conversation
    conv = None
    if payload.conversation_id:
        conv = cubbis_repository.get_conversation(
            db, conversation_id=payload.conversation_id, user_id=current_user.id
        )
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )
    else:
        # Generate initial title from first 30 chars of user message
        title_text = payload.message.strip()
        if len(title_text) > 40:
            title_text = title_text[:37] + "..."
        conv = cubbis_repository.create_conversation(
            db,
            user_id=current_user.id,
            title=title_text,
            language=payload.language,
        )

    # 2. Retrieve recent message history for context
    history_records = (
        db.query(cubbis_repository.CubbisMessage)
        .filter(cubbis_repository.CubbisMessage.conversation_id == conv.id)
        .order_by(cubbis_repository.CubbisMessage.created_at.asc())
        .all()
    )
    formatted_history = [
        {"role": m.role, "content": m.content}
        for m in history_records[-10:]
    ]

    # 3. Save User Message to Database
    user_msg = cubbis_repository.add_message(
        db,
        conversation_id=conv.id,
        role="user",
        content=payload.message,
    )

    # 4. Generate AI response via Gemini Service
    try:
        ai_result = await cubbis_service.generate_cubbis_response(
            user_message=payload.message,
            conversation_history=formatted_history,
            language=payload.language,
            analysis_context=payload.analysis_context,
        )
    except ValueError as val_err:
        logger.warning("Gemini configuration issue", error=str(val_err))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cubbis AI service is not configured. Please ensure GEMINI_API_KEY is set in the backend.",
        )
    except genai_errors.ClientError as ce:
        status_code = getattr(ce, "code", 400)
        logger.error("Gemini API ClientError", code=status_code, error=str(ce))
        if status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI service rate limit exceeded. Please wait a moment and try again.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error communicating with AI service. Please check your credentials.",
        )
    except genai_errors.ServerError as se:
        logger.error("Gemini ServerError", error=str(se))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is currently experiencing high demand. Please try again shortly.",
        )
    except Exception as exc:
        logger.error("Cubbis response generation failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while communicating with Cubbis AI. Please try again.",
        )

    # 5. Save Assistant Message to Database (Only on successful AI generation!)
    assistant_msg = cubbis_repository.add_message(
        db,
        conversation_id=conv.id,
        role="assistant",
        content=ai_result["content"],
        model_used=ai_result["model_used"],
    )

    # 6. Audit log
    log_action(
        db,
        action="cubbis.chat.message",
        user_id=current_user.id,
        resource_type="cubbis_conversation",
        resource_id=str(conv.id),
        details=f"Prompt len: {len(payload.message)}, Model: {ai_result['model_used']}",
        ip=client_ip,
        user_agent=user_agent,
    )

    return ChatMessageResponse(
        conversation_id=conv.id,
        message_id=assistant_msg.id,
        role="assistant",
        content=assistant_msg.content,
        model_used=assistant_msg.model_used,
        created_at=assistant_msg.created_at,
    )


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all previous Cubbis conversations belonging to the authenticated user."""
    items, total = cubbis_repository.list_conversations(
        db, user_id=current_user.id, limit=limit, offset=offset
    )
    return ConversationListResponse(
        items=[ConversationSummary(**item) for item in items],
        total=total,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(
    conversation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve full message history for a specific conversation session."""
    conv = cubbis_repository.get_conversation(
        db, conversation_id=conversation_id, user_id=current_user.id
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        language=conv.language,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            MessageItem(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                model_used=m.model_used,
                created_at=m.created_at,
            )
            for m in conv.messages
        ],
    )


@router.delete("/conversations/{conversation_id}", response_model=DeleteResponse)
def delete_conversation(
    conversation_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a specific conversation and all associated messages."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    deleted = cubbis_repository.delete_conversation(
        db, conversation_id=conversation_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )

    log_action(
        db,
        action="cubbis.conversation.deleted",
        user_id=current_user.id,
        resource_type="cubbis_conversation",
        resource_id=str(conversation_id),
        details="User deleted conversation",
        ip=client_ip,
        user_agent=user_agent,
    )

    return DeleteResponse(
        message="Conversation deleted successfully.",
        deleted_id=conversation_id,
    )


@router.delete("/history", response_model=DeleteResponse)
def clear_history(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Permanently clear all Cubbis conversation history for the current user."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    count = cubbis_repository.clear_history(db, user_id=current_user.id)

    log_action(
        db,
        action="cubbis.history.cleared",
        user_id=current_user.id,
        resource_type="cubbis_conversation",
        resource_id=None,
        details=f"User cleared all {count} conversations",
        ip=client_ip,
        user_agent=user_agent,
    )

    return DeleteResponse(
        message=f"Cleared {count} conversations successfully.",
    )
