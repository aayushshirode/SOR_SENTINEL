"""
SOR SENTINEL — Contact Message ORM Model (Oracle)
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Identity, func

from app.db.database import Base


class ContactMessage(Base):
    __tablename__ = "CONTACT_MESSAGES"

    id = Column(Integer, Identity(always=False), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="unread")  # unread | read | replied
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    def __repr__(self) -> str:
        return f"<ContactMessage id={self.id} email={self.email} status={self.status}>"
