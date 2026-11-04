"""
SOR SENTINEL — DigiKeeper Encryption Service
Authenticated AES-256-GCM Document Vault Cryptography
"""
import base64
import hashlib
import os
from typing import Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

ENCRYPTION_VERSION = "AES-256-GCM-v1"


class CryptographicIntegrityError(Exception):
    """Raised when AES-GCM tag verification or SHA-256 integrity check fails."""
    pass


def _get_master_key() -> bytes:
    """
    Resolve 32-byte (256-bit) encryption key from environment configuration.
    Never hardcoded. Falls back safely to SHA-256 derivation over SECRET_KEY if unset.
    """
    raw_key = (settings.DIGIKEEPER_SECRET_KEY or "").strip()
    if raw_key:
        # Check if valid 64-char hex string (32 bytes)
        if len(raw_key) == 64:
            try:
                return bytes.fromhex(raw_key)
            except ValueError:
                pass
        # Derive fixed 32 bytes from raw key string
        return hashlib.sha256(raw_key.encode("utf-8")).digest()

    # Fallback to derivation from core SECRET_KEY with domain separation salt
    derived = hashlib.sha256(
        (settings.SECRET_KEY + ":digikeeper:document:vault:key:salt").encode("utf-8")
    ).digest()
    return derived


def _build_aad(owner_user_id: int, original_filename: str) -> bytes:
    """
    Generate Authenticated Additional Data (AAD) binding ciphertext cryptographically
    to the specific owner and filename. Prevents ciphertext re-binding attacks.
    """
    return f"user_id:{owner_user_id};filename:{original_filename}".encode("utf-8")


def encrypt_document(
    plaintext: bytes,
    owner_user_id: int,
    original_filename: str,
) -> tuple[bytes, str, str, str]:
    """
    Encrypt document using authenticated AES-256-GCM.
    Returns:
        (encrypted_bytes, iv_base64, sha256_hash, encryption_version)
    """
    if not plaintext:
        raise ValueError("Cannot encrypt empty document data.")

    # Calculate SHA-256 integrity hash of original plaintext
    sha256_hash = hashlib.sha256(plaintext).hexdigest()

    # Generate 12-byte cryptographically secure random nonce
    nonce = os.urandom(12)
    iv_b64 = base64.b64encode(nonce).decode("ascii")

    # Cryptographically bind owner and filename as AAD
    aad = _build_aad(owner_user_id, original_filename)

    key = _get_master_key()
    aesgcm = AESGCM(key)

    # Encrypt (ciphertext + 16-byte authentication tag appended)
    encrypted_bytes = aesgcm.encrypt(nonce, plaintext, aad)

    logger.debug(
        "Document encrypted successfully",
        owner_id=owner_user_id,
        filename=original_filename,
        size_bytes=len(plaintext),
        encrypted_bytes=len(encrypted_bytes),
    )

    return encrypted_bytes, iv_b64, sha256_hash, ENCRYPTION_VERSION


def decrypt_document(
    encrypted_bytes: bytes,
    iv_base64: str,
    owner_user_id: int,
    original_filename: str,
    expected_sha256: Optional[str] = None,
) -> bytes:
    """
    Decrypt document using authenticated AES-256-GCM and verify cryptographic integrity.
    Validates GCM authentication tag and SHA-256 hash.
    Raises CryptographicIntegrityError if tag or hash verification fails.
    """
    if not encrypted_bytes or not iv_base64:
        raise CryptographicIntegrityError("Missing ciphertext or IV for decryption.")

    try:
        nonce = base64.b64decode(iv_base64)
    except Exception as exc:
        raise CryptographicIntegrityError(f"Invalid IV encoding: {exc}")

    if len(nonce) != 12:
        raise CryptographicIntegrityError("Invalid nonce length for AES-256-GCM (expected 12 bytes).")

    aad = _build_aad(owner_user_id, original_filename)
    key = _get_master_key()
    aesgcm = AESGCM(key)

    try:
        plaintext = aesgcm.decrypt(nonce, encrypted_bytes, aad)
    except InvalidTag:
        logger.error(
            "AES-GCM authentication tag verification failed — ciphertext tampered or incorrect key",
            owner_id=owner_user_id,
            filename=original_filename,
        )
        raise CryptographicIntegrityError(
            "Cryptographic integrity verification failed. The document ciphertext is corrupted or has been modified."
        )
    except Exception as exc:
        logger.error("Decryption failure", error=str(exc))
        raise CryptographicIntegrityError(f"Decryption failed: {exc}")

    # Verify SHA-256 hash if expected hash provided
    if expected_sha256:
        actual_hash = hashlib.sha256(plaintext).hexdigest()
        if actual_hash != expected_sha256:
            logger.error(
                "Plaintext SHA-256 hash mismatch after decryption",
                expected=expected_sha256,
                actual=actual_hash,
            )
            raise CryptographicIntegrityError(
                "Document integrity validation failed: decrypted plaintext does not match original SHA-256 signature."
            )

    return plaintext
