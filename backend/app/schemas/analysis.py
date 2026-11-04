"""
SOR SENTINEL — Analysis Pydantic Schemas
"""
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class TextAnalysisRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=50,
        max_length=10000,
        description="Text content to analyze for credibility and sensitivity.",
    )


class URLAnalysisRequest(BaseModel):
    url: str = Field(
        ...,
        description="A publicly accessible HTTP/HTTPS URL to analyze.",
        examples=["https://example.com/article"],
    )

    @field_validator("url")
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        v = v.strip()
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("URL must use http or https scheme.")
        if not parsed.netloc:
            raise ValueError("URL must include a valid domain.")
        return v


class FindingResponse(BaseModel):
    id: int
    finding_type: str
    category: Optional[str] = None
    title: str
    description: str
    severity: Optional[str] = None
    confidence: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SourceReferenceResponse(BaseModel):
    id: int
    title: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    relevance: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    id: int
    user_id: int
    analysis_type: str
    input_text: Optional[str] = None
    input_url: Optional[str] = None
    status: str
    overall_assessment: Optional[str] = None
    summary: Optional[str] = None
    credibility_score: Optional[int] = None
    sensitivity_level: Optional[str] = None
    ai_model_used: Optional[str] = None
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    request_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    findings: list[FindingResponse] = []
    source_references: list[SourceReferenceResponse] = []

    model_config = {"from_attributes": True}


class AnalysisSummary(BaseModel):
    id: int
    analysis_type: str
    input_url: Optional[str] = None
    input_text_preview: Optional[str] = None  # First 100 chars
    status: str
    overall_assessment: Optional[str] = None
    credibility_score: Optional[int] = None
    sensitivity_level: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAnalyses(BaseModel):
    items: list[AnalysisSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
