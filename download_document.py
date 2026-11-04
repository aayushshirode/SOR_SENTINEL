
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from app.services.encryption_service import decrypt_document
from app.core.config import Settings

load_dotenv(".env")
settings = Settings()

engine = create_engine(
    f"oracle+oracledb://{settings.ORACLE_USER}:{settings.ORACLE_PASSWORD}"
    f"@{settings.ORACLE_DSN}"
)

doc_id = 10

with engine.connect() as conn:
    row = conn.execute(text("""
        SELECT OWNER_USER_ID, ORIGINAL_FILENAME, SHA256_HASH,
               IV, ENCRYPTED_BLOB
        FROM DIGIKEEPER_DOCUMENTS
        WHERE ID = :id
    """), {"id": doc_id}).fetchone()

    if not row:
        raise SystemExit("Document ID 10 not found.")

    owner_id, filename, sha256_hash, iv, blob = row

    pdf_bytes = decrypt_document(
        encrypted_bytes=bytes(blob),
        iv_base64=iv,
        owner_user_id=owner_id,
        original_filename=filename,
        expected_sha256=sha256_hash,
    )

    output = Path(filename).name
    Path(output).write_bytes(pdf_bytes)

    print(f"Downloaded: {Path(output).resolve()}")
