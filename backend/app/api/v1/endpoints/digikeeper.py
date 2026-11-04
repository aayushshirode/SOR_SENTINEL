"""
SOR SENTINEL — DigiKeeper Secure Document Vault Endpoints
End-to-end encrypted document storage, retrieval, verification, and audit logging.
"""
import os
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.database import get_db
from app.models.user import User
from app.repositories import digikeeper_repository
from app.repositories.contact_repository import log_action
from app.schemas.digikeeper import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentMetadataResponse,
    DocumentUploadResponse,
    normalize_category,
)
from app.services.encryption_service import (
    CryptographicIntegrityError,
    decrypt_document,
    encrypt_document,
)

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/digikeeper", tags=["DigiKeeper Vault"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIMES = {"application/pdf", "image/png", "image/jpeg"}


def _sanitize_filename(filename: str) -> str:
    """Strip dangerous path traversal characters and normalize filename."""
    base = Path(filename).name.strip()
    # Replace any non-alphanumeric/dot/hyphen/underscore with an underscore
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    if not safe or safe.startswith("."):
        safe = f"doc_{safe}"
    return safe[:250]


@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("Other"),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Upload and encrypt document into Oracle Database DigiKeeper Vault.
    Validates file extension, MIME type, size limit, and signature magic bytes.
    Enforces AES-256-GCM encryption before storing in Oracle BLOB.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    raw_filename = file.filename or ""
    safe_filename = _sanitize_filename(raw_filename)
    ext = Path(safe_filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        log_action(
            db,
            "digikeeper.document.upload_failed",
            current_user.id,
            "document",
            None,
            details=f"Invalid extension '{ext}' for file '{safe_filename}'",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Only PDF, PNG, and JPEG documents are permitted.",
        )

    # Read contents into memory
    contents = await file.read()
    file_size = len(contents)

    if file_size > settings.DIGIKEEPER_MAX_FILE_BYTES:
        log_action(
            db,
            "digikeeper.document.upload_failed",
            current_user.id,
            "document",
            None,
            details=f"File size {file_size} exceeds limit {settings.DIGIKEEPER_MAX_FILE_BYTES}",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the {settings.DIGIKEEPER_MAX_FILE_BYTES // (1024 * 1024)} MB limit.",
        )

    if file_size < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted.",
        )

    # Signature magic bytes validation
    is_pdf = contents.startswith(b"%PDF-")
    is_jpeg = contents.startswith(b"\xff\xd8\xff")
    is_png = contents.startswith(b"\x89PNG\r\n\x1a\n")

    if not (is_pdf or is_jpeg or is_png):
        log_action(
            db,
            "digikeeper.document.upload_failed",
            current_user.id,
            "document",
            None,
            details=f"Magic byte check failed for '{safe_filename}'",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match legitimate PDF, PNG, or JPEG digital signatures.",
        )

    # Set authoritative MIME type based on signature
    authoritative_mime = (
        "application/pdf" if is_pdf else ("image/png" if is_png else "image/jpeg")
    )

    norm_category = normalize_category(category)
    doc_title = (title.strip() if title and title.strip() else Path(safe_filename).stem)[:255]

    try:
        # Encrypt with authenticated AES-256-GCM
        encrypted_blob, iv_b64, sha256_hash, enc_ver = encrypt_document(
            plaintext=contents,
            owner_user_id=current_user.id,
            original_filename=safe_filename,
        )

        # Atomic insert into Oracle Database 21c XE
        doc = digikeeper_repository.create_document(
            db=db,
            owner_user_id=current_user.id,
            original_filename=safe_filename,
            category=norm_category,
            title=doc_title,
            mime_type=authoritative_mime,
            file_size=file_size,
            sha256_hash=sha256_hash,
            iv=iv_b64,
            encrypted_blob=encrypted_blob,
            encryption_version=enc_ver,
        )

        log_action(
            db,
            "digikeeper.document.upload",
            current_user.id,
            "document",
            str(doc.id),
            details=f"filename={safe_filename};category={norm_category};size={file_size}",
            ip=client_ip,
            user_agent=user_agent,
        )

        logger.info(
            "DigiKeeper document uploaded & encrypted",
            doc_id=doc.id,
            owner_id=current_user.id,
            filename=safe_filename,
            category=norm_category,
            size=file_size,
        )

        return DocumentUploadResponse(
            message="Document uploaded and encrypted in vault successfully.",
            document=DocumentMetadataResponse.model_validate(doc),
        )

    except Exception as exc:
        db.rollback()
        logger.error("DigiKeeper upload transaction failed", error=str(exc))
        log_action(
            db,
            "digikeeper.document.upload_failed",
            current_user.id,
            "document",
            None,
            details=f"Internal error: {str(exc)[:200]}",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while securing and storing your document. Please try again.",
        )


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("date", pattern="^(date|name|size)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve document list strictly isolated to the authenticated user from Oracle DB.
    Cross-user access is impossible because queries filter by current_user.id.
    """
    items, total = digikeeper_repository.list_user_documents(
        db=db,
        owner_user_id=current_user.id,
        category=category,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    categories = digikeeper_repository.get_category_counts(
        db=db, owner_user_id=current_user.id
    )

    return DocumentListResponse(
        items=[DocumentMetadataResponse.model_validate(doc) for doc in items],
        total=total,
        categories=categories,
    )


@router.get("/documents/{document_id}", response_model=DocumentMetadataResponse)
def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve metadata for a specific document with ownership isolation.
    """
    doc = digikeeper_repository.get_document_by_id(
        db=db, document_id=document_id, owner_user_id=current_user.id
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )
    return DocumentMetadataResponse.model_validate(doc)


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Secure Document Decryption & Download Endpoint.
    1. Authenticates requester.
    2. Queries Oracle with document_id AND owner_user_id (ownership verification).
    3. Retrieves encrypted bytes from Oracle BLOB column.
    4. Decrypts via AES-256-GCM validating authentication tag & SHA-256 integrity.
    5. Returns original file attachment with strict security headers:
       - Cache-Control: no-store
       - X-Content-Type-Options: nosniff
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    doc = digikeeper_repository.get_document_by_id(
        db=db, document_id=document_id, owner_user_id=current_user.id
    )
    if not doc:
        log_action(
            db,
            "digikeeper.access.unauthorized",
            current_user.id,
            "document",
            str(document_id),
            details="Unauthorized or non-existent document download attempt",
            ip=client_ip,
            user_agent=user_agent,
        )
        # Consistent 404 response regardless of whether document exists for another user
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    try:
        # Decrypt from Oracle BLOB
        plaintext = decrypt_document(
            encrypted_bytes=bytes(doc.encrypted_blob),
            iv_base64=doc.iv,
            owner_user_id=current_user.id,
            original_filename=doc.original_filename,
            expected_sha256=doc.sha256_hash,
        )

        log_action(
            db,
            "digikeeper.document.download",
            current_user.id,
            "document",
            str(doc.id),
            details=f"filename={doc.original_filename};bytes={len(plaintext)}",
            ip=client_ip,
            user_agent=user_agent,
        )

        logger.info(
            "DigiKeeper document decrypted and dispatched for download",
            doc_id=doc.id,
            owner_id=current_user.id,
            filename=doc.original_filename,
            size=len(plaintext),
        )

        # Build clean download response
        content_disposition = f'attachment; filename="{doc.original_filename}"'
        headers = {
            "Content-Disposition": content_disposition,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "Content-Length": str(len(plaintext)),
        }

        return Response(
            content=plaintext,
            media_type=doc.mime_type or "application/octet-stream",
            headers=headers,
        )

    except CryptographicIntegrityError as err:
        logger.error(
            "Decryption integrity failure",
            doc_id=doc.id,
            owner_id=current_user.id,
            error=str(err),
        )
        log_action(
            db,
            "digikeeper.document.download_failed",
            current_user.id,
            "document",
            str(doc.id),
            details=f"Decryption integrity failure: {err}",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document decryption integrity check failed. Content may be corrupted.",
        )
    except Exception as exc:
        logger.error("Download failure", doc_id=doc.id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve and decrypt document.",
        )


@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Secure Document Deletion Endpoint with strict ownership validation.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    doc = digikeeper_repository.get_document_by_id(
        db=db, document_id=document_id, owner_user_id=current_user.id
    )
    if not doc:
        log_action(
            db,
            "digikeeper.access.unauthorized",
            current_user.id,
            "document",
            str(document_id),
            details="Unauthorized delete attempt on non-owned document",
            ip=client_ip,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    deleted_fname = doc.original_filename
    success = digikeeper_repository.delete_document(
        db=db, document_id=document_id, owner_user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document from database.",
        )

    log_action(
        db,
        "digikeeper.document.delete",
        current_user.id,
        "document",
        str(document_id),
        details=f"filename={deleted_fname}",
        ip=client_ip,
        user_agent=user_agent,
    )

    logger.info(
        "DigiKeeper document securely deleted",
        doc_id=document_id,
        owner_id=current_user.id,
        filename=deleted_fname,
    )

    return DocumentDeleteResponse(
        message="Document securely deleted from vault.",
        deleted_id=document_id,
    )
