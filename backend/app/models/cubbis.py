"""
SOR SENTINEL — Cubbis AI Cyber Assistant Database Models
Oracle Database 21c XE persistence for conversations and messages.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Identity
from sqlalchemy.orm import relationship

from app.db.database import Base


class CubbisConversation(Base):
    """
    User conversation session with Cubbis Cyber Assistant.
    Strictly isolated per authenticated user (USERS.id).
    """
    __tablename__ = "CUBBIS_CONVERSATIONS"

    id = Column(Integer, Identity(always=False), primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("USERS.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(255), nullable=False, default="New Conversation")
    language = Column(String(10), nullable=False, default="en")  # 'en' or 'hi'
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", backref="cubbis_conversations")
    messages = relationship(
        "CubbisMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="CubbisMessage.created_at.asc()",
    )

    __table_args__ = (
        Index("idx_cubbis_conv_user", "user_id", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<CubbisConversation id={self.id} user={self.user_id} title='{self.title[:20]}'>"


class CubbisMessage(Base):
    """
    Individual message turn within a Cubbis conversation.
    Supports user prompts and assistant cyber education responses.
    """
    __tablename__ = "CUBBIS_MESSAGES"

    id = Column(Integer, Identity(always=False), primary_key=True)
    conversation_id = Column(
        Integer,
        ForeignKey("CUBBIS_CONVERSATIONS.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)     # Oracle CLOB for comprehensive cyber education text
    model_used = Column(String(100), nullable=True)  # e.g., 'gemini-3-flash-preview'
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    conversation = relationship("CubbisConversation", back_populates="messages")

    __table_args__ = (
        Index("idx_cubbis_msg_order", "conversation_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<CubbisMessage id={self.id} conv={self.conversation_id} role='{self.role}'>"
