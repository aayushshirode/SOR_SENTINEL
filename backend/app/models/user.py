"""
SOR SENTINEL — User ORM Model (Oracle)
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Integer, String, Identity, func
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "USERS"

    id = Column(Integer, Identity(always=False), primary_key=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")          # 'user' | 'admin'
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())
    last_login_at = Column(DateTime, nullable=True)
    previous_login_at = Column(DateTime, nullable=True)

    # Relationships
    analyses = relationship("Analysis", back_populates="user", lazy="select",
                            cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="select")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
