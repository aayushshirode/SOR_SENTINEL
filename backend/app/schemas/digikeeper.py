"""
SOR SENTINEL — DigiKeeper Pydantic Validation & Serialization Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_CATEGORIES = {
    "Aadhaar",
    "PAN",
    "Certificates",
    "Marksheets",
    "Personal PDFs",
    "Other",
}


def normalize_category(cat: Optional[str]) -> str:
    """Normalize input category to match standard title case values."""
    if not cat:
        return "Other"
    clean = cat.strip().lower()
    mapping = {
        "aadhaar": "Aadhaar",
        "aadhar": "Aadhaar",
        "pan": "PAN",
        "pancard": "PAN",
        "pan card": "PAN",
        "certificate": "Certificates",
        "certificates": "Certificates",
        "marksheet": "Marksheets",
        "marksheets": "Marksheets",
        "personal pdf": "Personal PDFs",
        "personal pdfs": "Personal PDFs",
        "personal": "Personal PDFs",
        "other": "Other",
        "others": "Other",
    }
    return mapping.get(clean, "Other")


class DocumentMetadataResponse(BaseModel):
    id: int
    owner_user_id: int
    original_filename: str
    category: str
    title: Optional[str] = None
    mime_type: str
    file_size: int
    sha256_hash: str
    encryption_version: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentMetadataResponse]
    total: int
    categories: dict[str, int]


class DocumentUploadResponse(BaseModel):
    message: str = "Document uploaded and encrypted successfully."
    document: DocumentMetadataResponse


class DocumentDeleteResponse(BaseModel):
    message: str = "Document securely deleted."
    deleted_id: int
