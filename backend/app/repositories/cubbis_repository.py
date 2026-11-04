"""
SOR SENTINEL — Cubbis Repository Layer
Atomic Oracle Database CRUD operations for AI Cyber Assistant conversations & messages.
Strict ownership isolation enforced at query level.
"""
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.cubbis import CubbisConversation, CubbisMessage


def get_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> Optional[CubbisConversation]:
    """Retrieve conversation strictly verifying ownership by user_id."""
    return (
        db.query(CubbisConversation)
        .filter(
            CubbisConversation.id == conversation_id,
            CubbisConversation.user_id == user_id,
        )
        .first()
    )


def create_conversation(
    db: Session,
    user_id: int,
    title: str = "New Conversation",
    language: str = "en",
) -> CubbisConversation:
    """Create a new conversation session for user."""
    conv = CubbisConversation(
        user_id=user_id,
        title=title[:255],
        language=language,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def update_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
    title: Optional[str] = None,
    language: Optional[str] = None,
) -> Optional[CubbisConversation]:
    """Update title or language and touch updated_at timestamp."""
    conv = get_conversation(db, conversation_id=conversation_id, user_id=user_id)
    if not conv:
        return None

    if title:
        conv.title = title[:255]
    if language:
        conv.language = language
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)
    return conv


def add_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    model_used: Optional[str] = None,
) -> CubbisMessage:
    """Add a message turn and update conversation updated_at."""
    msg = CubbisMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        model_used=model_used,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    # Touch conversation updated_at
    db.query(CubbisConversation).filter(CubbisConversation.id == conversation_id).update(
        {"updated_at": datetime.now(timezone.utc)}
    )
    db.commit()
    db.refresh(msg)
    return msg


def list_conversations(
    db: Session,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    List conversations for authenticated user with message count.
    Ordered newest updated first.
    """
    total = (
        db.query(func.count(CubbisConversation.id))
        .filter(CubbisConversation.user_id == user_id)
        .scalar()
        or 0
    )

    convs = (
        db.query(
            CubbisConversation,
            func.count(CubbisMessage.id).label("message_count"),
        )
        .outerjoin(CubbisMessage, CubbisConversation.id == CubbisMessage.conversation_id)
        .filter(CubbisConversation.user_id == user_id)
        .group_by(
            CubbisConversation.id,
            CubbisConversation.user_id,
            CubbisConversation.title,
            CubbisConversation.language,
            CubbisConversation.created_at,
            CubbisConversation.updated_at,
        )
        .order_by(desc(CubbisConversation.updated_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    results = []
    for conv, count in convs:
        results.append({
            "id": conv.id,
            "title": conv.title,
            "language": conv.language,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": count or 0,
        })

    return results, total


def delete_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> bool:
    """Delete a conversation if owned by user. Returns True if deleted."""
    conv = get_conversation(db, conversation_id=conversation_id, user_id=user_id)
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True


def clear_history(
    db: Session,
    user_id: int,
) -> int:
    """Delete all conversations owned by authenticated user."""
    convs = (
        db.query(CubbisConversation)
        .filter(CubbisConversation.user_id == user_id)
        .all()
    )
    count = len(convs)
    for c in convs:
        db.delete(c)
    db.commit()
    return count
