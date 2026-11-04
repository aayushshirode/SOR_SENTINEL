"""
SOR SENTINEL — DigiKeeper Repository Layer (Oracle Database Operations)
Enforces strict ownership isolation at the query level.
"""
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.digikeeper import DigiKeeperDocument


def create_document(
    db: Session,
    owner_user_id: int,
    original_filename: str,
    category: str,
    mime_type: str,
    file_size: int,
    sha256_hash: str,
    iv: str,
    encrypted_blob: bytes,
    title: Optional[str] = None,
    encryption_version: str = "AES-256-GCM-v1",
) -> DigiKeeperDocument:
    """
    Insert encrypted document and metadata atomically into Oracle Database.
    """
    doc = DigiKeeperDocument(
        owner_user_id=owner_user_id,
        original_filename=original_filename[:255],
        category=category[:50],
        title=title[:255] if title else None,
        mime_type=mime_type[:100],
        file_size=file_size,
        sha256_hash=sha256_hash[:64],
        iv=iv[:64],
        encrypted_blob=encrypted_blob,
        encryption_version=encryption_version[:50],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document_by_id(
    db: Session,
    document_id: int,
    owner_user_id: int,
) -> Optional[DigiKeeperDocument]:
    """
    Retrieve document verifying ownership. Returns None if document does not exist
    or is not owned by the requester (preventing ID enumeration).
    """
    return (
        db.query(DigiKeeperDocument)
        .filter(
            DigiKeeperDocument.id == document_id,
            DigiKeeperDocument.owner_user_id == owner_user_id,
        )
        .first()
    )


def list_user_documents(
    db: Session,
    owner_user_id: int,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
) -> Tuple[List[DigiKeeperDocument], int]:
    """
    List documents strictly isolated to the authenticated user with search and filtering.
    """
    query = db.query(DigiKeeperDocument).filter(
        DigiKeeperDocument.owner_user_id == owner_user_id
    )

    if category and category != "All":
        query = query.filter(DigiKeeperDocument.category == category)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                DigiKeeperDocument.original_filename.ilike(term),
                DigiKeeperDocument.title.ilike(term),
                DigiKeeperDocument.category.ilike(term),
            )
        )

    total = query.count()

    # Determine sorting
    is_desc = (sort_order.lower() == "desc")
    if sort_by == "name":
        order_col = DigiKeeperDocument.original_filename.desc() if is_desc else DigiKeeperDocument.original_filename.asc()
    elif sort_by == "size":
        order_col = DigiKeeperDocument.file_size.desc() if is_desc else DigiKeeperDocument.file_size.asc()
    else:  # default "date"
        order_col = DigiKeeperDocument.created_at.desc() if is_desc else DigiKeeperDocument.created_at.asc()

    items = query.order_by(order_col).all()
    return items, total


def get_category_counts(
    db: Session,
    owner_user_id: int,
) -> Dict[str, int]:
    """
    Calculate real document counts per category for the user's vault dashboard.
    """
    rows = (
        db.query(
            DigiKeeperDocument.category,
            func.count(DigiKeeperDocument.id),
        )
        .filter(DigiKeeperDocument.owner_user_id == owner_user_id)
        .group_by(DigiKeeperDocument.category)
        .all()
    )
    counts = {r[0]: r[1] for r in rows}
    return counts


def delete_document(
    db: Session,
    document_id: int,
    owner_user_id: int,
) -> bool:
    """
    Delete document with ownership validation. Returns True if deleted, False otherwise.
    """
    doc = (
        db.query(DigiKeeperDocument)
        .filter(
            DigiKeeperDocument.id == document_id,
            DigiKeeperDocument.owner_user_id == owner_user_id,
        )
        .first()
    )
    if not doc:
        return False

    db.delete(doc)
    db.commit()
    return True
