"""
SOR SENTINEL — Analysis ORM Models (Oracle)
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, func, Numeric, Identity
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Analysis(Base):
    __tablename__ = "ANALYSES"

    id = Column(Integer, Identity(always=False), primary_key=True)
    user_id = Column(Integer, ForeignKey("USERS.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False)          # 'text' | 'url'
    input_text = Column(Text, nullable=True)
    input_url = Column(String(2000), nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    # pending | processing | completed | failed
    overall_assessment = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    credibility_score = Column(Integer, nullable=True)          # 0-100
    sensitivity_level = Column(String(50), nullable=True)       # low|medium|high|critical
    ai_model_used = Column(String(200), nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    error_message = Column(String(1000), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="analyses")
    findings = relationship("AnalysisFinding", back_populates="analysis",
                            cascade="all, delete-orphan", lazy="select")
    source_references = relationship("SourceReference", back_populates="analysis",
                                     cascade="all, delete-orphan", lazy="select")

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} type={self.analysis_type} status={self.status}>"


class AnalysisFinding(Base):
    __tablename__ = "ANALYSIS_FINDINGS"

    id = Column(Integer, Identity(always=False), primary_key=True)
    analysis_id = Column(Integer, ForeignKey("ANALYSES.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    finding_type = Column(String(100), nullable=False)
    # credibility_concern | misleading_indicator | sensitive_content | recommendation
    category = Column(String(200), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=True)       # low | medium | high
    confidence = Column(String(50), nullable=True)     # low | medium | high
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())

    # Relationship
    analysis = relationship("Analysis", back_populates="findings")

    def __repr__(self) -> str:
        return f"<AnalysisFinding id={self.id} type={self.finding_type}>"


class SourceReference(Base):
    __tablename__ = "SOURCE_REFERENCES"

    id = Column(Integer, Identity(always=False), primary_key=True)
    analysis_id = Column(Integer, ForeignKey("ANALYSES.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    title = Column(String(500), nullable=True)
    url = Column(String(2000), nullable=True)
    description = Column(Text, nullable=True)
    relevance = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())

    # Relationship
    analysis = relationship("Analysis", back_populates="source_references")

    def __repr__(self) -> str:
        return f"<SourceReference id={self.id} title={self.title}>"
