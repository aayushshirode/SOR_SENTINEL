"""
SOR SENTINEL — DigiKeeper Live End-to-End Verification Suite
Executes 15 rigorous live tests against the running FastAPI backend and Oracle Database 21c XE using httpx.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import io
import hashlib
import httpx
from sqlalchemy import text
from app.db.database import SessionLocal

BASE_URL = "http://127.0.0.1:8010/api/v1"

def print_separator(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def run_tests():
    passed = 0
    failed = 0
    total = 15

    print_separator("SOR SENTINEL — DIGIKEEPER LIVE END-TO-END TEST SUITE")
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: Health Check
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r = client.get("/health/")
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") in ("ok", "healthy"), f"Unexpected status: {data}"
        print("[PASS] Test 1: Health check endpoint is healthy (HTTP 200)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 1: Health check failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: Valid Authentication
    # ──────────────────────────────────────────────────────────────────────────
    token = None
    user_id = None
    try:
        r = client.post(
            "/auth/login",
            json={"email": "admin@sor-sentinel.local", "password": "Admin@123456"},
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        auth_data = r.json()
        token = auth_data["access_token"]
        user_id = auth_data["user"]["id"]
        assert token, "Token missing"
        print(f"[PASS] Test 2: Admin user login successful (User ID: {user_id}, Token: {token[:20]}...)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 2: Login failed: {e}")
        failed += 1
        return

    headers = {"Authorization": f"Bearer {token}"}

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: Invalid Authentication Rejection
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r = client.post(
            "/auth/login",
            json={"email": "admin@sor-sentinel.local", "password": "WrongPassword!999"},
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("[PASS] Test 3: Invalid credentials rejected with HTTP 401 Unauthorized")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 3: Failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: Profile Verification with Bearer Token
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r = client.get("/users/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@sor-sentinel.local"
        print(f"[PASS] Test 4: Authenticated user profile retrieved ({r.json()['full_name']})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 4: Failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 5: Upload Document 1 (Aadhaar PDF)
    # ──────────────────────────────────────────────────────────────────────────
    doc1_id = None
    doc1_original_bytes = (
        b"%PDF-1.4\n%Live E2E Verification\n"
        b"CONFIDENTIAL GOVERNMENT OF INDIA AADHAAR CARD\n"
        b"Holder: Sentinel Admin | UID: 9999-8888-7777-6666\n%%EOF"
    )
    doc1_sha256 = hashlib.sha256(doc1_original_bytes).hexdigest()

    try:
        files = {"file": ("e2e_aadhaar.pdf", doc1_original_bytes, "application/pdf")}
        data = {"category": "Aadhaar", "title": "Live E2E Aadhaar Card"}
        r = client.post("/digikeeper/documents/upload", headers=headers, files=files, data=data)
        assert r.status_code == 201, f"Status {r.status_code}: {r.text}"
        res = r.json()["document"]
        doc1_id = res["id"]
        assert res["category"] == "Aadhaar"
        assert res["sha256_hash"] == doc1_sha256
        assert res["encryption_version"] == "AES-256-GCM-v1"
        print(f"[PASS] Test 5: Uploaded & encrypted Aadhaar PDF (Doc ID: {doc1_id}, Size: {res['file_size']}B, Hash: {doc1_sha256[:16]}...)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 5: Aadhaar upload failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 6: Direct Oracle DB Verification of Ciphertext BLOB
    # ──────────────────────────────────────────────────────────────────────────
    try:
        db = SessionLocal()
        row = db.execute(
            text("SELECT id, owner_user_id, original_filename, category, encryption_version, iv, dbms_lob.getlength(encrypted_blob) as blob_len FROM DIGIKEEPER_DOCUMENTS WHERE id = :id"),
            {"id": doc1_id}
        ).fetchone()
        assert row is not None, "Record not found in Oracle DB"
        assert row.blob_len > 0, "Oracle BLOB length is 0"
        assert row.encryption_version == "AES-256-GCM-v1"
        assert row.iv is not None and len(row.iv) > 0

        # Verify plaintext string is NOT in the database row raw blob
        blob_raw = db.execute(text("SELECT encrypted_blob FROM DIGIKEEPER_DOCUMENTS WHERE id = :id"), {"id": doc1_id}).scalar()
        raw_bytes = bytes(blob_raw)
        assert b"CONFIDENTIAL GOVERNMENT OF INDIA" not in raw_bytes, "PLAINTEXT LEAKED INTO ORACLE BLOB!"
        print(f"[PASS] Test 6: Oracle DB verification successful. BLOB Length: {row.blob_len}B, IV present, 0 plaintext leakage")
        db.close()
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 6: Oracle DB check failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 7: Upload Document 2 (Marksheet PNG)
    # ──────────────────────────────────────────────────────────────────────────
    doc2_id = None
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    try:
        files = {"file": ("degree_transcript.png", png_bytes, "image/png")}
        data = {"category": "Marksheets", "title": "B.Tech Final Marksheet"}
        r = client.post("/digikeeper/documents/upload", headers=headers, files=files, data=data)
        assert r.status_code == 201
        doc2_id = r.json()["document"]["id"]
        print(f"[PASS] Test 7: Uploaded & encrypted Marksheet PNG (Doc ID: {doc2_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 7: Marksheet upload failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 8: Upload Document 3 (PAN Card JPEG)
    # ──────────────────────────────────────────────────────────────────────────
    doc3_id = None
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
    try:
        files = {"file": ("pan_card.jpg", jpeg_bytes, "image/jpeg")}
        data = {"category": "PAN", "title": "Income Tax PAN Card"}
        r = client.post("/digikeeper/documents/upload", headers=headers, files=files, data=data)
        assert r.status_code == 201
        doc3_id = r.json()["document"]["id"]
        print(f"[PASS] Test 8: Uploaded & encrypted PAN Card JPEG (Doc ID: {doc3_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 8: PAN upload failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 9: List Documents, Categories & Search
    # ──────────────────────────────────────────────────────────────────────────
    try:
        # All
        r = client.get("/digikeeper/documents", headers=headers)
        assert r.status_code == 200
        list_data = r.json()
        assert list_data["total"] >= 3
        cats = list_data["categories"]
        assert cats.get("Aadhaar", 0) >= 1
        assert cats.get("Marksheets", 0) >= 1
        assert cats.get("PAN", 0) >= 1

        # Search filter
        r_search = client.get("/digikeeper/documents?search=transcript", headers=headers)
        search_items = r_search.json()["items"]
        assert any(item["id"] == doc2_id for item in search_items)

        # Category filter
        r_cat = client.get("/digikeeper/documents?category=Aadhaar", headers=headers)
        cat_items = r_cat.json()["items"]
        assert all(item["category"] == "Aadhaar" for item in cat_items)
        print(f"[PASS] Test 9: Document listing, search, and category counts verified ({list_data['total']} documents)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 9: Document listing failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 10: Secure Decrypted Download & Byte-for-Byte Fidelity Check
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r = client.get(f"/digikeeper/documents/{doc1_id}/download", headers=headers)
        assert r.status_code == 200
        assert r.headers.get("Cache-Control") == "no-store, no-cache, must-revalidate, max-age=0"
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        downloaded_bytes = r.content
        assert downloaded_bytes == doc1_original_bytes, "Downloaded bytes do NOT match original!"
        assert hashlib.sha256(downloaded_bytes).hexdigest() == doc1_sha256
        print(f"[PASS] Test 10: Secure download byte-for-byte fidelity confirmed (Decrypted length: {len(downloaded_bytes)}B matches original exactly)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 10: Download fidelity failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 11: Security & Ownership Isolation (Cross-User Access Blocked)
    # ──────────────────────────────────────────────────────────────────────────
    try:
        from app.core.security import create_access_token
        # Use existing valid user id 3 (aayush@gmail.com)
        user2_token = create_access_token({"sub": "3", "role": "user"})
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to download doc1 (owned by user 2)
        r_unauth_dl = client.get(f"/digikeeper/documents/{doc1_id}/download", headers=user2_headers)
        assert r_unauth_dl.status_code == 404, f"Expected 404, got {r_unauth_dl.status_code}"

        # Try to delete doc1 (owned by user 2)
        r_unauth_del = client.delete(f"/digikeeper/documents/{doc1_id}", headers=user2_headers)
        assert r_unauth_del.status_code == 404, f"Expected 404, got {r_unauth_del.status_code}"
        print("[PASS] Test 11: Ownership isolation enforced. Cross-user download & delete safely returned HTTP 404")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 11: Ownership isolation failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 12: Disallowed Extensions and Spoofed Magic Bytes
    # ──────────────────────────────────────────────────────────────────────────
    try:
        # Disallowed .sh extension
        r_sh = client.post(
            "/digikeeper/documents/upload",
            headers=headers,
            files={"file": ("hack.sh", b"rm -rf /", "application/x-sh")},
            data={"category": "Other"},
        )
        assert r_sh.status_code == 400

        # Fake PDF magic bytes
        r_fake = client.post(
            "/digikeeper/documents/upload",
            headers=headers,
            files={"file": ("fake.pdf", b"Plain text masquerading as PDF", "application/pdf")},
            data={"category": "Aadhaar"},
        )
        assert r_fake.status_code == 400
        print("[PASS] Test 12: Disallowed extensions (.sh) and spoofed magic bytes safely rejected with HTTP 400")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 12: Input validation failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 13: Delete Document & Verify Oracle Purge
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r = client.delete(f"/digikeeper/documents/{doc3_id}", headers=headers)
        assert r.status_code == 200
        assert r.json()["deleted_id"] == doc3_id

        # Verify gone in Oracle DB
        db = SessionLocal()
        row = db.execute(text("SELECT id FROM DIGIKEEPER_DOCUMENTS WHERE id = :id"), {"id": doc3_id}).fetchone()
        assert row is None, "Document still exists in Oracle DB!"
        db.close()
        print(f"[PASS] Test 13: Document {doc3_id} deleted and permanently purged from Oracle Database")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 13: Delete failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 14: Audit Trail Log Verification in Oracle DB
    # ──────────────────────────────────────────────────────────────────────────
    try:
        db = SessionLocal()
        logs = db.execute(
            text("SELECT action, resource_type, details FROM AUDIT_LOGS WHERE action LIKE 'digikeeper%' ORDER BY id DESC")
        ).fetchall()
        actions = [l.action for l in logs]
        assert "digikeeper.document.upload" in actions, f"upload action missing from {actions}"
        assert "digikeeper.document.download" in actions, f"download action missing from {actions}"
        assert "digikeeper.document.delete" in actions, f"delete action missing from {actions}"
        assert "digikeeper.access.unauthorized" in actions, f"unauthorized action missing from {actions}"
        db.close()
        print(f"[PASS] Test 14: Audit trail verified in Oracle AUDIT_LOGS table ({len(logs)} DigiKeeper security entries found)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 14: Audit log check failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Test 15: Existing System Regression (Dashboard & Health)
    # ──────────────────────────────────────────────────────────────────────────
    try:
        r_sum = client.get("/dashboard/summary", headers=headers)
        assert r_sum.status_code == 200
        r_act = client.get("/dashboard/activity", headers=headers)
        assert r_act.status_code == 200
        print("[PASS] Test 15: Existing SOR SENTINEL dashboard endpoints verified (0 regressions)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 15: Dashboard regression failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────────────────
    print_separator("FINAL TEST RESULTS")
    print(f"Total Tests Executed: {total}")
    print(f"Tests Passed:         {passed}")
    print(f"Tests Failed:         {failed}")
    if failed == 0:
        print("\nALL 15 LIVE END-TO-END TESTS PASSED WITH 100% SUCCESS!")
    else:
        print(f"\n{failed} TEST(S) FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
