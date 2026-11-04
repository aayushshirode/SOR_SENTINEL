"""
SOR SENTINEL — DigiKeeper Vault Tests
Unit and integration tests for document encryption, upload, listing, download,
decryption, integrity checks, ownership isolation, and deletion.
"""
import io
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.digikeeper import DigiKeeperDocument
from app.services.encryption_service import (
    encrypt_document,
    decrypt_document,
    CryptographicIntegrityError,
)


def _auth_header(user_id: int = 1, role: str = "user") -> dict:
    token = create_access_token({"sub": str(user_id), "role": role})
    return {"Authorization": f"Bearer {token}"}


# ── Cryptography Unit Tests ───────────────────────────────────────────────────

def test_encryption_and_decryption_byte_fidelity():
    """Verify AES-256-GCM decrypts uploaded content byte-for-byte."""
    sample_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (Test Identity Document) >>\nendobj\ntrailer\n<<>>\n%%EOF"
    owner_id = 42
    fname = "aadhaar_card.pdf"

    encrypted_blob, iv_b64, sha256_hash, version = encrypt_document(
        plaintext=sample_pdf,
        owner_user_id=owner_id,
        original_filename=fname,
    )

    assert encrypted_blob != sample_pdf
    assert len(encrypted_blob) > len(sample_pdf)
    assert version == "AES-256-GCM-v1"
    assert len(iv_b64) > 0

    decrypted = decrypt_document(
        encrypted_bytes=encrypted_blob,
        iv_base64=iv_b64,
        owner_user_id=owner_id,
        original_filename=fname,
        expected_sha256=sha256_hash,
    )
    assert decrypted == sample_pdf


def test_encryption_detects_tampering():
    """Modifying ciphertext or auth tag raises CryptographicIntegrityError."""
    sample_data = b"%PDF-1.4 sample content"
    enc, iv, h, _ = encrypt_document(sample_data, 1, "test.pdf")

    tampered = bytearray(enc)
    tampered[len(tampered) // 2] ^= 0x55

    with pytest.raises(CryptographicIntegrityError):
        decrypt_document(bytes(tampered), iv, 1, "test.pdf", expected_sha256=h)


def test_encryption_detects_cross_user_rebind():
    """Ciphertext encrypted for user 1 cannot be decrypted by user 2 due to AAD binding."""
    sample_data = b"%PDF-1.4 user 1 content"
    enc, iv, h, _ = encrypt_document(sample_data, 1, "doc.pdf")

    with pytest.raises(CryptographicIntegrityError):
        decrypt_document(enc, iv, 2, "doc.pdf", expected_sha256=h)


# ── Endpoint Security & Validation Tests ──────────────────────────────────────

def test_upload_unauthenticated_rejected(client: TestClient):
    """Uploading without authentication returns 401."""
    pdf_file = io.BytesIO(b"%PDF-1.4 test unauth")
    response = client.post(
        "/api/v1/digikeeper/documents/upload",
        files={"file": ("test.pdf", pdf_file, "application/pdf")},
        data={"category": "Aadhaar"},
    )
    assert response.status_code == 401


def test_list_unauthenticated_rejected(client: TestClient):
    """Listing documents without authentication returns 401."""
    response = client.get("/api/v1/digikeeper/documents")
    assert response.status_code == 401


def test_download_unauthenticated_rejected(client: TestClient):
    """Downloading without authentication returns 401."""
    response = client.get("/api/v1/digikeeper/documents/1/download")
    assert response.status_code == 401


def test_delete_unauthenticated_rejected(client: TestClient):
    """Deleting without authentication returns 401."""
    response = client.delete("/api/v1/digikeeper/documents/1")
    assert response.status_code == 401


def test_upload_disallowed_extension(client: TestClient):
    """Files with disallowed extensions (.exe, .sh) are rejected with 400."""
    script_file = io.BytesIO(b"echo hello")
    response = client.post(
        "/api/v1/digikeeper/documents/upload",
        headers=_auth_header(1),
        files={"file": ("malicious.sh", script_file, "application/x-sh")},
        data={"category": "Other"},
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json().get("detail", "")


def test_upload_magic_bytes_check_fails(client: TestClient):
    """File named .pdf but containing plain text fails magic byte check with 400."""
    fake_pdf = io.BytesIO(b"This is not a real PDF document.")
    response = client.post(
        "/api/v1/digikeeper/documents/upload",
        headers=_auth_header(1),
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
        data={"category": "Aadhaar"},
    )
    assert response.status_code == 400
    assert "digital signatures" in response.json().get("detail", "")


# ── Repository & Workflow Integration with Mock DB ───────────────────────────

def test_upload_success_workflow(client: TestClient, mock_db: MagicMock):
    """Successful upload validates, encrypts, and inserts into database."""
    pdf_bytes = b"%PDF-1.4\nIdentity verification payload\n%%EOF"
    pdf_file = io.BytesIO(pdf_bytes)

    # Mock repository create_document
    fake_doc = DigiKeeperDocument(
        id=101,
        owner_user_id=1,
        original_filename="aadhaar_card.pdf",
        category="Aadhaar",
        title="My Aadhaar Card",
        mime_type="application/pdf",
        file_size=len(pdf_bytes),
        sha256_hash="dummy_hash_64_chars_test_only_000000000000000000000000000000000000",
        encryption_version="AES-256-GCM-v1",
        iv="dummy_iv_16chars",
        encrypted_blob=b"encrypted_data_blob",
    )

    with patch("app.repositories.digikeeper_repository.create_document", return_value=fake_doc):
        response = client.post(
            "/api/v1/digikeeper/documents/upload",
            headers=_auth_header(1),
            files={"file": ("aadhaar_card.pdf", pdf_file, "application/pdf")},
            data={"category": "Aadhaar", "title": "My Aadhaar Card"},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Document uploaded and encrypted in vault successfully."
    assert data["document"]["id"] == 101
    assert data["document"]["category"] == "Aadhaar"
    assert data["document"]["original_filename"] == "aadhaar_card.pdf"


def test_ownership_isolation_download_not_found(client: TestClient, mock_db: MagicMock):
    """Attempting to download a document owned by another user returns 404."""
    # Repository get_document_by_id returns None when user_id does not match
    with patch("app.repositories.digikeeper_repository.get_document_by_id", return_value=None):
        response = client.get(
            "/api/v1/digikeeper/documents/999/download",
            headers=_auth_header(user_id=2),
        )

    assert response.status_code == 404
    assert "Document not found" in response.json().get("detail", "")


def test_ownership_isolation_delete_not_found(client: TestClient, mock_db: MagicMock):
    """Attempting to delete another user's document returns 404."""
    with patch("app.repositories.digikeeper_repository.get_document_by_id", return_value=None):
        response = client.delete(
            "/api/v1/digikeeper/documents/999",
            headers=_auth_header(user_id=2),
        )

    assert response.status_code == 404


def test_download_success_decryption_flow(client: TestClient, mock_db: MagicMock):
    """Downloading decrypts and returns PDF with security headers."""
    original_pdf = b"%PDF-1.4\nAuthentic Certificate Content\n%%EOF"
    enc_blob, iv_b64, sha256_hash, ver = encrypt_document(original_pdf, 1, "certificate.pdf")

    fake_doc = DigiKeeperDocument(
        id=202,
        owner_user_id=1,
        original_filename="certificate.pdf",
        category="Certificates",
        mime_type="application/pdf",
        file_size=len(original_pdf),
        sha256_hash=sha256_hash,
        encryption_version=ver,
        iv=iv_b64,
        encrypted_blob=enc_blob,
    )

    with patch("app.repositories.digikeeper_repository.get_document_by_id", return_value=fake_doc):
        response = client.get(
            "/api/v1/digikeeper/documents/202/download",
            headers=_auth_header(user_id=1),
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=\"certificate.pdf\"" in response.headers["content-disposition"]
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.content == original_pdf
