# HookChat — n8n Webhook Chat Tester

## Problem Statement (original)
> Build a chat webpage similar to chatting with an LLM, but backed by an n8n
> webhook workflow. Frontend asks questions, backend forwards them to an n8n
> webhook (configurable), and the n8n response is shown on screen. Meant
> primarily to test how n8n webhooks work.

## User Choices
- Webhook URL is **editable from the UI** (saved in `localStorage`)
- FastAPI backend acts as a **proxy** (not browser-direct)
- Response format: **plain text or JSON** (keys: output/reply/answer/response/text/message/content/result)
- Chat history **persisted in MongoDB**
- UI aesthetic: **"surprise me"** — delivered as a dark terminal/control-room theme with Outfit + JetBrains Mono, Volt Yellow (#EAB308) accent, sharp edges

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). Endpoints under `/api`:
  - `GET /api/` — health
  - `POST/GET/PATCH/DELETE /api/sessions(/{id})` — session CRUD
  - `GET /api/sessions/{id}/messages` — message list
  - `POST /api/chat` — proxy a user message to the n8n webhook and store both sides
  - `POST /api/webhook/ping` — reachability check
- **Frontend**: React 19 + Tailwind + shadcn. Single chat page (`/`), sidebar with sessions, header with live webhook status, configurable webhook dialog.
- **Storage**: Mongo collections `sessions` and `messages` (string ids via uuid4; ISO timestamps).

## What's Implemented (v1.0 — Feb 2026)
- Session CRUD with auto-title from first user message
- Proxy `/api/chat` calls the user's webhook via httpx (60s timeout), flexible response parsing, graceful connect/timeout errors (surfaced as assistant error messages)
- Webhook reachability ping (UI shows ONLINE/OFFLINE/PINGING/NO HOOK)
- Chat UI: terminal aesthetic, copy-message, delete-session, sample prompts, blinking cursor, log-style AI messages
- Webhook dialog with localhost warning + n8n setup quick guide + docs link
- Mobile responsive with sidebar overlay
- All interactive elements carry `data-testid`
- 18/18 backend tests passing

## Personas
- **Automation tinkerers** learning how n8n webhook workflows behave
- **Devs building n8n chat/agent flows** who want a fast UI to iterate on

## Backlog
**P1 (nice to have)**
- Streaming response support (if n8n workflow streams)
- Export chat session as markdown / copy whole session
- Multiple saved webhook profiles (dev/staging/prod)

**P2**
- Shareable chat links (public read-only)
- Webhook request/response inspector (raw JSON view)
- API-key auth on the FastAPI proxy itself

## Next Action Items
- Install ngrok locally (`ngrok http 5678`) and paste the public URL into the app's webhook dialog to start chatting with your local n8n workflow.
