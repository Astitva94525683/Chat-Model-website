# HookChat — n8n Webhook Chat Tester

A minimal chat UI that forwards your messages to **any n8n webhook** and renders the response. Built to test n8n workflows end-to-end without writing a single line of code.

> **Concept:** Frontend → FastAPI proxy → your n8n webhook → LLM/logic → back to you. No LLM on our server.

---

## Features
- Terminal-styled dark chat UI (Outfit + JetBrains Mono, sharp edges, Volt Yellow accent)
- Paste your n8n webhook URL in the app (stored in `localStorage` + MongoDB)
- Live webhook reachability indicator (ONLINE / OFFLINE / PINGING)
- Persistent chat history in MongoDB with auto-titled sessions
- Copy message, delete session, sample-prompt quick-start
- Graceful error messages for localhost / timeout / connect failures
- Fully mobile-responsive

## Tech Stack
- **Backend:** FastAPI + Motor (MongoDB async) + httpx
- **Frontend:** React 19, Tailwind CSS, shadcn/ui, sonner, lucide-react
- **Storage:** MongoDB (`sessions`, `messages` collections)

## Architecture
```
[ Browser ]  ──►  [ FastAPI /api/chat ]  ──►  [ your n8n webhook ]  ──►  [ your LLM ]
      ▲                     │                                                    │
      └─────────────────────┴────────────── response ◄─────────────────────────────┘
```
- `POST /api/chat` — accepts `{ session_id, message, webhook_url }`, persists the user message, POSTs `{question, message, session_id}` to the webhook, parses the reply (plain text OR JSON keys `output/reply/answer/response/text/message/content/result`), persists the assistant message, returns both.
- `GET/POST/PATCH/DELETE /api/sessions(/{id})` — session CRUD
- `GET /api/sessions/{id}/messages` — history
- `POST /api/webhook/ping` — reachability probe

## Getting Started (Local Dev)

### Prerequisites
- Python 3.11+, Node 18+, Yarn, MongoDB running locally
- An n8n instance with a **Webhook → (logic/LLM) → Respond to Webhook** flow
- `ngrok` if your n8n is on `localhost` (the hosted backend cannot reach your machine otherwise)

### Backend
```bash
cd backend
pip install -r requirements.txt
# backend/.env
#   MONGO_URL="mongodb://localhost:27017"
#   DB_NAME="test_database"
#   CORS_ORIGINS="*"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install
# frontend/.env
#   REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

Open `http://localhost:3000`, paste your webhook URL in the dialog, and chat.

## Using it With Your n8n

1. Add a **Webhook** node (HTTP Method: `POST`, Respond: *Using 'Respond to Webhook' Node*).
2. Add your logic (AI Agent, HTTP Request, etc.). In the AI Agent, set **Prompt (User Message)** to the expression:
   ```
   {{ $json.body.question }}
   ```
3. End with a **Respond to Webhook** node. Response Body:
   ```
   {{ $json.output }}
   ```
4. If n8n runs on `localhost`, expose it:
   ```
   ngrok http 5678
   ```
   then paste `https://<your-ngrok>.ngrok-free.dev/webhook/<your-path>` into HookChat.

## Project Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI app (sessions, chat, ping)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js
│       ├── pages/ChatPage.jsx
│       ├── components/    # Sidebar, ChatHeader, MessageList, MessageInput, WebhookDialog, EmptyState, ChatMessage
│       └── lib/api.js
└── memory/
    └── PRD.md             # product requirements + backlog
```

## Environment Variables
| Var | Where | Purpose |
|---|---|---|
| `MONGO_URL` | backend/.env | Mongo connection string |
| `DB_NAME`   | backend/.env | Database name |
| `CORS_ORIGINS` | backend/.env | Comma-separated allowed origins |
| `REACT_APP_BACKEND_URL` | frontend/.env | Public URL the browser uses to hit `/api` |

## Roadmap
- Streaming responses (n8n streaming)
- Export session as Markdown
- Multiple saved webhook profiles (dev/staging/prod)
- Raw request/response inspector panel
- Shareable read-only chat links

## License
MIT — do whatever you want, just don't blame us.

## Credits
Built on Emergent. Design: dark "control-room" theme with Volt Yellow accent. Icons by lucide-react.
