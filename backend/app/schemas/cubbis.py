"""
SOR SENTINEL — Cubbis Pydantic Request & Response Schemas
Validation and serialization for AI Cyber Assistant interactions.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User's prompt or security question")
    conversation_id: Optional[int] = Field(None, description="Existing conversation ID to continue")
    language: str = Field("en", description="Language preference: 'en' for English or 'hi' for Hindi")
    analysis_context: Optional[str] = Field(None, max_length=8000, description="Optional SOR SENTINEL scan results context")

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Message cannot be empty or contain only whitespace.")
        return clean

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("en", "hi"):
            return "en"
        return clean


class MessageItem(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    model_used: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    conversation_id: int
    message_id: int
    role: str = "assistant"
    content: str
    model_used: Optional[str] = None
    created_at: Optional[datetime] = None


class ConversationSummary(BaseModel):
    id: int
    title: str
    language: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: int = 0

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: int
    title: str
    language: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[MessageItem] = []

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    items: List[ConversationSummary]
    total: int


class DeleteResponse(BaseModel):
    message: str
    deleted_id: Optional[int] = None
