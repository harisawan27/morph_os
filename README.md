# Morph OS — Stealth Edition

> **The AI workspace that thinks before it builds.**

Morph OS is a generative operating system that turns natural language into fully interactive software — live, in your browser, in seconds. It's not a chatbot that shows you code. It's a workspace that *becomes* the tool you need.

![Morph OS](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop)

---

## What makes it different

Most AI tools give you text. Morph OS gives you a running application.

Ask for a budget tracker — you get one, with real inputs, live calculations, and persistent state. Ask for the weather — a live widget loads. Ask who invented the internet — it just answers. The system knows the difference.

```
"build me a habit tracker"   →  launches in 2 seconds
"what's 20% of 350?"         →  answers: "70"
"play some lofi music"       →  YouTube player opens
"who is Alan Turing?"        →  responds conversationally
"make it dark mode"          →  edits the live artifact
```

No mismatched artifacts. No unnecessary UIs. The right response for every input.

---

## Architecture

### Brain → Vault → Builder pipeline

Every request flows through a three-stage decision system:

```
User input
    │
    ▼
┌─────────────────────────────────────────┐
│  BRAIN  (Gemini 2.5 Flash)              │
│  Classifies intent in one pass          │
│  chat / template / build / edit         │
└───────────────┬─────────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌────────────┐    ┌─────────────────┐
│   VAULT    │    │    BUILDER      │
│ 31 pre-    │    │ AI generates    │
│ built      │    │ custom React    │
│ templates  │    │ component       │
│ (instant)  │    │ (bespoke)       │
└────────────┘    └─────────────────┘
```

**The Brain** is the intelligence layer. It reads the full conversation, understands intent, and routes accordingly — never spawning a UI when a sentence suffices, never answering with text when a live tool is what's needed.

**The Vault** holds 31 battle-tested templates (games, productivity tools, finance tools, creative tools). When the Brain matches a template, it's hydrated and served in milliseconds — no generation cost.

**The Builder** takes over only for genuinely custom requests. It receives a structured spec from the Brain and generates a standalone React component with a consistent dark glassmorphism aesthetic.

### Streaming response architecture

Responses stream in two phases, eliminating perceived wait time:

```
Phase 1 (~1-2s)   →  Reply text appears immediately
Phase 2 (~2-8s)   →  Artifact builds in background, snaps into canvas
```

The user reads the response while the artifact is still generating. The "Building canvas…" indicator gives live feedback. No staring at a blank screen.

### Semantic cache

Every generation is embedded with `gemini-embedding-001` and stored in pgvector. On repeat or near-duplicate requests, the cached artifact is served instantly without touching the LLM.

---

## Feature surface

### Chat-first intelligence
The system defaults to conversation. It answers questions, writes content, explains concepts, does math, and handles follow-ups — exactly like a capable AI assistant. It only generates artifacts when the request genuinely calls for one.

### The Vault — 31 templates
Organized across six categories, instantly available:

| Category | Templates |
|---|---|
| **Games** | Snake, Memory, Tic Tac Toe, Typing Speed Test, Magic 8 Ball |
| **Productivity** | Todo List, Kanban Board, Habit Tracker, Pomodoro+, Timer, Calendar, Rich Notes |
| **Finance** | Budget Tracker, Bill Splitter, Calculator |
| **Creative** | Drawing Canvas, Pixel Art Editor, Gradient Generator, Color Palette, Matrix Rain |
| **Tools** | Weather, Music Player, Chart Builder, Flashcards, Quiz, Spin the Wheel, Password Generator, QR Code, Clock, Unit Converter |
| **Data** | Chart (bar/line/pie), Flashcards (AI-populated), Quiz (AI-generated) |

Parametric templates like Weather, Music, Flashcards, and Quiz are populated with real data from the Brain — no placeholders, no dummy values.

### My Library
A personal archive of everything the user has generated. Organized by category, searchable, with direct links back to the originating session. Every artifact can be reopened and continued exactly where it was left off.

### Chat history & sessions
Every conversation is persisted. The sidebar shows recent sessions with inline rename and delete. Clicking a session restores the full chat history and the last active artifact in the canvas.

### Message actions
- **User messages**: Edit (re-sends with history truncated to that point) and Copy
- **AI text responses**: Copy button
- **AI artifact responses**: "Open in Canvas" — opens the live artifact in the resizable panel

### Canvas — resizable split view
Desktop: a fluid two-panel layout. Chat on the left, live artifact on the right. The divider is draggable. Artifacts auto-open when generated.

Mobile: a toggle between Chat and Canvas tabs, with smooth transitions. The system automatically switches to Canvas when an artifact arrives.

### Edit mode
With an artifact active, the user can ask to modify it in plain English. "Make it dark mode", "add a reset button", "change the font to mono" — the Builder receives the current source and an edit instruction, and returns the modified component in place.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React, TypeScript, Tailwind CSS |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Artifact execution** | react-runner (isolated sandbox) |
| **Resizable panels** | react-resizable-panels |
| **Backend** | FastAPI, Python 3.11+ |
| **LLM** | Gemini 2.5 Flash (primary), Gemini 2.0 Flash (fallback) |
| **Embeddings** | gemini-embedding-001 (768-dim) |
| **Database** | PostgreSQL (Neon) + pgvector |
| **Auth** | NextAuth.js (Google OAuth) |
| **Resilience** | Tenacity (retry with exponential backoff) |

---

## Project structure

```
morph_os/
├── frontend/
│   ├── components/
│   │   ├── ChatCanvas.tsx        # Chat interface, streaming SSE handler
│   │   ├── Sidebar.tsx           # Nav, session list, rename/delete
│   │   ├── ArtifactRenderer.tsx  # Isolated React execution sandbox
│   │   └── OmniBar.tsx           # Input bar
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Home / new chat
│       │   ├── session/[id]/     # Persistent session view
│       │   ├── artifacts/        # The Vault (template catalog)
│       │   └── library/          # My Library (user's generated artifacts)
│       └── vault/templates/      # 31 pre-built React templates
│
└── backend/
    ├── llm_pipeline.py           # Brain, Builder, Editor, execute_plan
    ├── vault_manager.py          # Template hydration engine
    ├── main.py                   # FastAPI routes, streaming SSE endpoint
    ├── models.py                 # Artifact schema (pgvector)
    ├── database.py               # DB init, migrations
    └── auth.py                   # JWT session validation
```

---

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL with pgvector extension (or [Neon](https://neon.tech))
- [Gemini API key](https://aistudio.google.com/)
- Google OAuth credentials (for NextAuth)

### Environment

`backend/.env`:
```env
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=postgresql://user:pass@host/dbname
ALLOWED_ORIGINS=http://localhost:3000
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Run locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker-compose up --build
```

---

## Roadmap

- [ ] **Artifact collaboration** — share a generated tool via link, recipients get their own live copy
- [ ] **State persistence across devices** — todo items, notes, kanban cards sync to the cloud
- [ ] **Multi-artifact canvas** — pin multiple artifacts side by side in the workspace
- [ ] **Voice input** — speak to Morph OS via the OmniBar
- [ ] **Plugin system** — extend the Vault with community-contributed templates
- [ ] **Morph API** — let developers embed the generation engine in their own products

---

*"Don't generate code. Morph reality."*