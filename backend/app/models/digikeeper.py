"""
SOR SENTINEL — DigiKeeper Document Model
Secure Document Vault for Personal Identity, Academic & Certified Documents
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, LargeBinary, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.database import Base


class DigiKeeperDocument(Base):
    """
    DigiKeeper encrypted document record stored in Oracle Database 21c XE.
    The encrypted_blob contains the authenticated AES-256-GCM ciphertext + tag.
    The encryption key is never persisted in this table or database.
    """
    __tablename__ = "DIGIKEEPER_DOCUMENTS"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(
        Integer,
        ForeignKey("USERS.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="Other")
    title = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # Original plaintext file size in bytes
    sha256_hash = Column(String(64), nullable=False)  # Plaintext SHA-256 integrity hash
    encryption_version = Column(String(50), nullable=False, default="AES-256-GCM-v1")
    iv = Column(String(64), nullable=False)  # Base64-encoded 12-byte initialization vector / nonce
    encrypted_blob = Column(LargeBinary, nullable=False)  # AES-256-GCM ciphertext + 16-byte tag
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

    owner = relationship("User", backref="digikeeper_documents")

    __table_args__ = (
        Index("idx_digikeeper_owner_cat", "owner_user_id", "category"),
        Index("idx_digikeeper_owner_date", "owner_user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<DigiKeeperDocument id={self.id} owner={self.owner_user_id} "
            f"category='{self.category}' filename='{self.original_filename}'>"
        )
