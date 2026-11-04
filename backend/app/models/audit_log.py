"""
SOR SENTINEL — Audit Log ORM Model (Oracle)
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Identity, func
from sqlalchemy.orm import relationship

from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "AUDIT_LOGS"

    id = Column(Integer, Identity(always=False), primary_key=True)
    user_id = Column(Integer, ForeignKey("USERS.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(200), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())

    # Relationship
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action}>"
