"""
SOR SENTINEL — OTP Verification ORM Model (Oracle)
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Identity, Index
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class OTPVerification(Base):
    """
    Stores cryptographically hashed one-time passwords for:
    - Signup email verification ('signup_verification')
    - Password reset ('password_reset')
    Plaintext OTPs are never stored.
    """
    __tablename__ = "OTP_VERIFICATIONS"

    id = Column(Integer, Identity(always=False), primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("USERS.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    email = Column(String(255), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    purpose = Column(String(50), nullable=False)  # 'signup_verification' | 'password_reset'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    resend_available_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)
    reset_token_hash = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", backref="otp_verifications")

    __table_args__ = (
        Index("ix_otp_email_purpose", "email", "purpose"),
    )

    def __repr__(self) -> str:
        return f"<OTPVerification id={self.id} email={self.email} purpose={self.purpose} used={self.is_used}>"
