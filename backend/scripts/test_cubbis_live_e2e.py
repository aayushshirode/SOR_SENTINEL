"""
SOR SENTINEL — Cubbis AI Cyber Assistant Live End-to-End Test Suite
Tests live FastAPI backend, Oracle Database 21c XE, and Google Gemini API integration.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from sqlalchemy import text
from app.db.database import SessionLocal
from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_separator(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def run_tests():
    passed = 0
    failed = 0
    total = 14

    print_separator("CUBBIS AI CYBER ASSISTANT — LIVE END-TO-END VERIFICATION")
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health check
    try:
        r = client.get("/health/")
        assert r.status_code == 200
        print("[PASS] Test 1: Health check OK (HTTP 200)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 1: Health check failed: {e}")
        failed += 1

    # 2. Authentication
    token = None
    user_id = None
    try:
        r = client.post(
            "/auth/login",
            json={"email": "admin@sor-sentinel.local", "password": "Admin@123456"},
        )
        assert r.status_code == 200, f"Login failed: {r.text}"
        token = r.json()["access_token"]
        user_id = r.json()["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] Test 2: Admin authenticated successfully (User ID: {user_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 2: Login failed: {e}")
        failed += 1
        return

    # 3. Unauthenticated rejection
    try:
        r = client.post("/cubbis/chat", json={"message": "Hello"})
        assert r.status_code == 401
        print("[PASS] Test 3: Unauthenticated request rejected with HTTP 401")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 3: Failed: {e}")
        failed += 1

    # 4. Input validation (empty message)
    try:
        r = client.post("/cubbis/chat", headers=headers, json={"message": "   "})
        assert r.status_code == 422
        print("[PASS] Test 4: Empty whitespace message rejected with HTTP 422")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 4: Failed: {e}")
        failed += 1

    # 5. Live English chat request with Gemini API
    conv_id = None
    try:
        prompt_en = "How do I recognize phishing messages and protect my bank account?"
        r = client.post(
            "/cubbis/chat",
            headers=headers,
            json={"message": prompt_en, "language": "en"},
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        conv_id = data["conversation_id"]
        msg_id = data["message_id"]
        content = data["content"]
        model = data.get("model_used")

        assert conv_id > 0, "Missing conversation_id"
        assert msg_id > 0, "Missing message_id"
        assert len(content) > 50, "Assistant response too short"
        assert model, "Missing model_used metadata"

        print(f"[PASS] Test 5: Live English Gemini prompt succeeded!")
        print(f"       Conversation ID: {conv_id}, Message ID: {msg_id}, Model: {model}")
        print(f"       Response Preview: {content[:120].strip()}...")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 5: English Gemini chat failed: {e}")
        failed += 1

    # 6. Live Hindi chat request (Continuing conversation)
    try:
        prompt_hi = "संदिग्ध संदेशों और फ़िशिंग से बचने के लिए मुझे क्या करना चाहिए?"
        r = client.post(
            "/cubbis/chat",
            headers=headers,
            json={"message": prompt_hi, "conversation_id": conv_id, "language": "hi"},
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert data["conversation_id"] == conv_id
        content_hi = data["content"]
        assert len(content_hi) > 50

        print(f"[PASS] Test 6: Live Hindi Gemini prompt in conversation {conv_id} succeeded!")
        safe_preview = content_hi[:120].strip().encode('ascii', 'replace').decode('ascii')
        print(f"       Hindi Preview: {safe_preview}...")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 6: Hindi Gemini chat failed: {e}")
        failed += 1

    # 7. Direct Oracle DB persistence verification
    try:
        db = SessionLocal()
        conv_row = db.execute(
            text("SELECT id, user_id, title, language FROM CUBBIS_CONVERSATIONS WHERE id = :id"),
            {"id": conv_id},
        ).fetchone()
        assert conv_row is not None, "Conversation not found in Oracle DB"
        assert conv_row.user_id == user_id

        msg_count = db.execute(
            text("SELECT count(*) FROM CUBBIS_MESSAGES WHERE conversation_id = :id"),
            {"id": conv_id},
        ).scalar()
        assert msg_count >= 4, f"Expected at least 4 messages in conversation, found {msg_count}"

        db.close()
        print(f"[PASS] Test 7: Oracle DB persistence verified. Conversation {conv_id} has {msg_count} messages in Oracle tables")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 7: Oracle DB verification failed: {e}")
        failed += 1

    # 8. List conversations
    try:
        r = client.get("/cubbis/conversations", headers=headers)
        assert r.status_code == 200
        list_data = r.json()
        assert list_data["total"] >= 1
        found = any(c["id"] == conv_id for c in list_data["items"])
        assert found, f"Conversation {conv_id} not found in user list"
        print(f"[PASS] Test 8: Conversations listed successfully (Found {list_data['total']} conversations)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 8: List conversations failed: {e}")
        failed += 1

    # 9. Get full conversation detail
    try:
        r = client.get(f"/cubbis/conversations/{conv_id}", headers=headers)
        assert r.status_code == 200
        detail = r.json()
        assert detail["id"] == conv_id
        assert len(detail["messages"]) >= 4
        # Verify both user and assistant roles exist
        roles = [m["role"] for m in detail["messages"]]
        assert "user" in roles
        assert "assistant" in roles
        print(f"[PASS] Test 9: Conversation detail restored ({len(detail['messages'])} message turns verified)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 9: Conversation detail failed: {e}")
        failed += 1

    # 10. Ownership isolation (Cross-user access denied)
    try:
        user2_token = create_access_token({"sub": "3", "role": "user"})
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # User 2 tries to read User 1's chat
        r_unauth_get = client.get(f"/cubbis/conversations/{conv_id}", headers=user2_headers)
        assert r_unauth_get.status_code == 404, f"Expected 404, got {r_unauth_get.status_code}"

        # User 2 tries to delete User 1's chat
        r_unauth_del = client.delete(f"/cubbis/conversations/{conv_id}", headers=user2_headers)
        assert r_unauth_del.status_code == 404, f"Expected 404, got {r_unauth_del.status_code}"
        print("[PASS] Test 10: Ownership isolation verified. Cross-user access rejected with HTTP 404")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 10: Ownership isolation failed: {e}")
        failed += 1

    # 11. Individual conversation deletion
    try:
        r = client.delete(f"/cubbis/conversations/{conv_id}", headers=headers)
        assert r.status_code == 200
        assert r.json()["deleted_id"] == conv_id

        # Verify gone in Oracle DB
        db = SessionLocal()
        check_conv = db.execute(
            text("SELECT id FROM CUBBIS_CONVERSATIONS WHERE id = :id"), {"id": conv_id}
        ).fetchone()
        assert check_conv is None, "Conversation still exists in DB!"

        check_msgs = db.execute(
            text("SELECT count(*) FROM CUBBIS_MESSAGES WHERE conversation_id = :id"), {"id": conv_id}
        ).scalar()
        assert check_msgs == 0, "Messages were not cascaded and deleted!"
        db.close()
        print(f"[PASS] Test 11: Conversation {conv_id} and all cascaded messages deleted from Oracle DB")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 11: Delete conversation failed: {e}")
        failed += 1

    # 12. Clear all history functionality
    try:
        # Create a fresh conversation
        r_create = client.post(
            "/cubbis/chat",
            headers=headers,
            json={"message": "Temporary prompt for history clearing test"},
        )
        assert r_create.status_code == 200

        # Clear history
        r_clear = client.delete("/cubbis/history", headers=headers)
        assert r_clear.status_code == 200

        # Confirm list is empty
        r_list = client.get("/cubbis/conversations", headers=headers)
        assert r_list.status_code == 200
        assert r_list.json()["total"] == 0
        print("[PASS] Test 12: Clear-history cleared all conversations for user")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 12: Clear history failed: {e}")
        failed += 1

    # 13. Audit logs in Oracle DB
    try:
        db = SessionLocal()
        logs = db.execute(
            text("SELECT action, resource_type FROM AUDIT_LOGS WHERE action LIKE 'cubbis%' ORDER BY id DESC")
        ).fetchall()
        actions = [l.action for l in logs]
        assert "cubbis.chat.message" in actions
        assert "cubbis.conversation.deleted" in actions
        assert "cubbis.history.cleared" in actions
        db.close()
        print(f"[PASS] Test 13: Audit trail verified in Oracle AUDIT_LOGS table ({len(logs)} Cubbis audit entries found)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 13: Audit logs check failed: {e}")
        failed += 1

    # 14. Existing module regression check
    try:
        r_digi = client.get("/digikeeper/documents", headers=headers)
        assert r_digi.status_code == 200
        r_dash = client.get("/dashboard/summary", headers=headers)
        assert r_dash.status_code == 200
        print("[PASS] Test 14: Existing DigiKeeper and Dashboard endpoints unaffected (0 regressions)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 14: Existing module regression failed: {e}")
        failed += 1

    # ──────────────────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────────────────
    print_separator("FINAL TEST RESULTS")
    print(f"Total Tests Executed: {total}")
    print(f"Tests Passed:         {passed}")
    print(f"Tests Failed:         {failed}")
    if failed == 0:
        print("\nALL 14 LIVE CUBBIS END-TO-END TESTS PASSED WITH 100% SUCCESS!")
    else:
        print(f"\n{failed} TEST(S) FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
