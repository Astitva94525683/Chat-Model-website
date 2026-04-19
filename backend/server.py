from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone
import httpx
import json as json_lib


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="n8n Webhook Chat")
api_router = APIRouter(prefix="/api")


# -------------------- Models --------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Chat"
    webhook_url: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    webhook_url: Optional[str] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    webhook_url: Optional[str] = None


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    timestamp: str = Field(default_factory=now_iso)
    error: bool = False
    raw_response: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str
    message: str
    webhook_url: str


class ChatResponse(BaseModel):
    user_message: Message
    assistant_message: Message


# -------------------- Helpers --------------------

def extract_reply(response_text: str, content_type: str) -> str:
    """Best-effort parsing of the n8n webhook response."""
    text = (response_text or "").strip()
    if not text:
        return "(empty response from webhook)"

    # Try JSON parsing regardless of content-type (n8n often returns JSON)
    try:
        data = json_lib.loads(text)
    except Exception:
        return text  # Plain text

    # Look for common response keys
    if isinstance(data, dict):
        for key in ("output", "reply", "answer", "response", "text", "message", "content", "result"):
            if key in data and isinstance(data[key], str) and data[key].strip():
                return data[key]
        # Fall through — stringify dict
        return json_lib.dumps(data, indent=2)

    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            for key in ("output", "reply", "answer", "response", "text", "message", "content", "result"):
                if key in first and isinstance(first[key], str) and first[key].strip():
                    return first[key]
        return json_lib.dumps(data, indent=2)

    return str(data)


# -------------------- Session Endpoints --------------------

@api_router.get("/")
async def root():
    return {"status": "ok", "service": "n8n-webhook-chat"}


@api_router.post("/sessions", response_model=Session)
async def create_session(body: SessionCreate):
    session = Session(title=body.title or "New Chat", webhook_url=body.webhook_url)
    await db.sessions.insert_one(session.model_dump())
    return session


@api_router.get("/sessions", response_model=List[Session])
async def list_sessions():
    sessions = await db.sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return sessions


@api_router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@api_router.patch("/sessions/{session_id}", response_model=Session)
async def update_session(session_id: str, body: SessionUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    update["updated_at"] = now_iso()
    result = await db.sessions.find_one_and_update(
        {"id": session_id},
        {"$set": update},
        projection={"_id": 0},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    res = await db.sessions.delete_one({"id": session_id})
    await db.messages.delete_many({"session_id": session_id})
    return {"deleted": res.deleted_count}


@api_router.get("/sessions/{session_id}/messages", response_model=List[Message])
async def list_messages(session_id: str):
    msgs = await db.messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1).to_list(5000)
    return msgs


# -------------------- Chat --------------------

@api_router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    # Verify session exists
    session = await db.sessions.find_one({"id": body.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    webhook_url = (body.webhook_url or "").strip()
    if not webhook_url or not webhook_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A valid webhook URL (http/https) is required")

    user_msg = Message(session_id=body.session_id, role="user", content=body.message)
    await db.messages.insert_one(user_msg.model_dump())

    # Call the external n8n webhook
    reply_text: str
    is_error = False
    raw: Optional[str] = None

    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as http:
            payload = {
                "question": body.message,
                "message": body.message,
                "session_id": body.session_id,
            }
            r = await http.post(webhook_url, json=payload, headers={"Content-Type": "application/json"})
            raw = r.text
            if r.status_code >= 400:
                is_error = True
                reply_text = f"[Webhook error {r.status_code}] {r.text[:500] or r.reason_phrase}"
            else:
                reply_text = extract_reply(r.text, r.headers.get("content-type", ""))
    except httpx.ConnectError as e:
        is_error = True
        reply_text = (
            "[Connection error] Could not reach the webhook URL. "
            "If your n8n is running on localhost, expose it via ngrok and paste the public URL. "
            f"Details: {str(e)[:200]}"
        )
    except httpx.TimeoutException:
        is_error = True
        reply_text = "[Timeout] The webhook took too long to respond (>60s)."
    except Exception as e:
        is_error = True
        reply_text = f"[Unexpected error] {str(e)[:300]}"

    assistant_msg = Message(
        session_id=body.session_id,
        role="assistant",
        content=reply_text,
        error=is_error,
        raw_response=raw,
    )
    await db.messages.insert_one(assistant_msg.model_dump())

    # Update session: set title from first user message, touch updated_at
    session_update: dict = {"updated_at": now_iso()}
    if session.get("title") in (None, "", "New Chat"):
        title = body.message.strip()
        if len(title) > 48:
            title = title[:45] + "..."
        session_update["title"] = title
    if session.get("webhook_url") != webhook_url:
        session_update["webhook_url"] = webhook_url
    await db.sessions.update_one({"id": body.session_id}, {"$set": session_update})

    return ChatResponse(user_message=user_msg, assistant_message=assistant_msg)


# -------------------- Webhook reachability ping --------------------

class PingRequest(BaseModel):
    webhook_url: str


@api_router.post("/webhook/ping")
async def ping_webhook(body: PingRequest):
    url = body.webhook_url.strip()
    if not url.startswith(("http://", "https://")):
        return {"reachable": False, "status": None, "detail": "Invalid URL"}
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as http:
            # Use a lightweight POST with ping flag — n8n will reach the workflow even if webhook listener matches
            r = await http.post(url, json={"ping": True}, headers={"Content-Type": "application/json"})
            return {"reachable": True, "status": r.status_code, "detail": "ok"}
    except httpx.ConnectError as e:
        return {"reachable": False, "status": None, "detail": f"connect_error: {str(e)[:200]}"}
    except httpx.TimeoutException:
        return {"reachable": False, "status": None, "detail": "timeout"}
    except Exception as e:
        return {"reachable": False, "status": None, "detail": str(e)[:200]}


# -------------------- App wiring --------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
