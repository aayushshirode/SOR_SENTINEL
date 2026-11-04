"""
SOR SENTINEL — Contact Endpoint
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.repositories.contact_repository import create_message
from app.schemas.contact import ContactCreate, ContactResponse

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", response_model=ContactResponse, status_code=201, include_in_schema=False)
@router.post("/", response_model=ContactResponse, status_code=201)
def submit_contact(
    data: ContactCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Submit a contact form message. Persisted to Oracle database."""
    ip = request.client.host if request.client else None
    msg = create_message(db, data, ip)
    return msg
