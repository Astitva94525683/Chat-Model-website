"""Backend tests for n8n Webhook Chat proxy service."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback to /app/frontend/.env if not in env
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

ECHO_URL = "https://postman-echo.com/post"
HTTPBIN_URL = "https://httpbin.org/anything"
UNREACHABLE_URL = "http://nonexistent-host-xyz-abcdef.invalid/hook"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_sessions():
    return []


# ---------- Health ----------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Session CRUD ----------
class TestSessions:
    def test_create_session(self, client, created_sessions):
        r = client.post(f"{API}/sessions", json={"title": "TEST_ChatSession", "webhook_url": ECHO_URL})
        assert r.status_code == 200
        data = r.json()
        assert "id" in data and "title" in data and "created_at" in data and "updated_at" in data
        assert data["title"] == "TEST_ChatSession"
        assert data["webhook_url"] == ECHO_URL
        assert "_id" not in data
        created_sessions.append(data["id"])

    def test_create_session_defaults(self, client, created_sessions):
        r = client.post(f"{API}/sessions", json={})
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "New Chat"
        assert d["webhook_url"] is None
        created_sessions.append(d["id"])

    def test_list_sessions_sorted(self, client, created_sessions):
        r = client.get(f"{API}/sessions")
        assert r.status_code == 200
        sessions = r.json()
        assert isinstance(sessions, list)
        # No _id leak
        for s in sessions:
            assert "_id" not in s
        # Check our created sessions exist
        ids = [s["id"] for s in sessions]
        for sid in created_sessions:
            assert sid in ids
        # sort check
        updated_list = [s["updated_at"] for s in sessions]
        assert updated_list == sorted(updated_list, reverse=True)

    def test_get_session_ok(self, client, created_sessions):
        sid = created_sessions[0]
        r = client.get(f"{API}/sessions/{sid}")
        assert r.status_code == 200
        assert r.json()["id"] == sid
        assert "_id" not in r.json()

    def test_get_session_404(self, client):
        r = client.get(f"{API}/sessions/does-not-exist-123")
        assert r.status_code == 404

    def test_patch_session(self, client, created_sessions):
        sid = created_sessions[0]
        original = client.get(f"{API}/sessions/{sid}").json()
        time.sleep(0.05)
        r = client.patch(f"{API}/sessions/{sid}", json={"title": "TEST_Updated", "webhook_url": HTTPBIN_URL})
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Updated"
        assert d["webhook_url"] == HTTPBIN_URL
        assert d["updated_at"] >= original["updated_at"]
        assert "_id" not in d

    def test_patch_session_404(self, client):
        r = client.patch(f"{API}/sessions/unknown-xyz", json={"title": "x"})
        assert r.status_code == 404


# ---------- Chat flow ----------
class TestChat:
    @pytest.fixture(scope="class")
    def chat_session(self, client):
        r = client.post(f"{API}/sessions", json={"title": "New Chat"})
        assert r.status_code == 200
        return r.json()

    def test_chat_404_unknown_session(self, client):
        r = client.post(f"{API}/chat", json={
            "session_id": "unknown-session-abc",
            "message": "hello",
            "webhook_url": ECHO_URL,
        })
        assert r.status_code == 404

    def test_chat_invalid_webhook_url(self, client, chat_session):
        r = client.post(f"{API}/chat", json={
            "session_id": chat_session["id"],
            "message": "hi",
            "webhook_url": "ftp://bad",
        })
        assert r.status_code == 400

    def test_chat_missing_webhook_url(self, client, chat_session):
        r = client.post(f"{API}/chat", json={
            "session_id": chat_session["id"],
            "message": "hi",
            "webhook_url": "",
        })
        assert r.status_code == 400

    def test_chat_success_with_echo(self, client, chat_session):
        sid = chat_session["id"]
        user_text = "Hello from TEST_ sets the title"
        r = client.post(f"{API}/chat", json={
            "session_id": sid,
            "message": user_text,
            "webhook_url": ECHO_URL,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user_message" in data and "assistant_message" in data
        um = data["user_message"]
        am = data["assistant_message"]
        assert um["role"] == "user"
        assert um["content"] == user_text
        assert um["session_id"] == sid
        assert am["role"] == "assistant"
        assert am["session_id"] == sid
        assert am["error"] is False
        assert isinstance(am["content"], str) and len(am["content"]) > 0
        assert "_id" not in um and "_id" not in am

        # Session title should be updated from first user message; updated_at bumped
        s = client.get(f"{API}/sessions/{sid}").json()
        expected_title = user_text[:45] + "..." if len(user_text) > 48 else user_text
        assert s["title"] == expected_title
        assert s["webhook_url"] == ECHO_URL

    def test_messages_listed_in_order(self, client, chat_session):
        sid = chat_session["id"]
        r = client.get(f"{API}/sessions/{sid}/messages")
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        for m in msgs:
            assert "_id" not in m
        ts = [m["timestamp"] for m in msgs]
        assert ts == sorted(ts)
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"

    def test_chat_connection_error(self, client, chat_session):
        sid = chat_session["id"]
        r = client.post(f"{API}/chat", json={
            "session_id": sid,
            "message": "trigger error",
            "webhook_url": UNREACHABLE_URL,
        })
        assert r.status_code == 200
        data = r.json()
        am = data["assistant_message"]
        assert am["error"] is True
        assert isinstance(am["content"], str) and len(am["content"]) > 0


# ---------- Webhook ping ----------
class TestPing:
    def test_ping_reachable(self, client):
        r = client.post(f"{API}/webhook/ping", json={"webhook_url": ECHO_URL})
        assert r.status_code == 200
        d = r.json()
        assert d["reachable"] is True
        assert isinstance(d["status"], int)

    def test_ping_invalid_url(self, client):
        r = client.post(f"{API}/webhook/ping", json={"webhook_url": "not-a-url"})
        assert r.status_code == 200
        d = r.json()
        assert d["reachable"] is False
        assert d["detail"] == "Invalid URL"

    def test_ping_unreachable(self, client):
        r = client.post(f"{API}/webhook/ping", json={"webhook_url": UNREACHABLE_URL})
        assert r.status_code == 200
        d = r.json()
        assert d["reachable"] is False


# ---------- Delete cleanup ----------
class TestDelete:
    def test_delete_sessions_and_messages(self, client, created_sessions):
        for sid in created_sessions:
            r = client.delete(f"{API}/sessions/{sid}")
            assert r.status_code == 200
            # Confirm gone
            r2 = client.get(f"{API}/sessions/{sid}")
            assert r2.status_code == 404
            # Messages for this session should be empty
            r3 = client.get(f"{API}/sessions/{sid}/messages")
            assert r3.status_code == 200
            assert r3.json() == []
