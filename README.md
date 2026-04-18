# Morph OS

> **The AI workspace that thinks before it builds.**

Morph OS is a generative operating system that turns natural language into fully interactive software — live, in your browser, in seconds. It's not a chatbot that shows you code. It's a workspace that *becomes* the tool you need.

> **Installable on any device.** Morph OS is a PWA — tap the **Install App** button in the sidebar to add it to your home screen or desktop. It launches like a native app with no browser chrome.

![Morph OS](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop)

---

## What makes it different

Most AI tools give you text. Morph OS gives you a running application.

Ask for a budget tracker — you get one, with real inputs, live calculations, and persistent state. Ask for the weather — a live widget loads. Ask who invented the internet — it just answers. The system knows the difference.

```
"build me a habit tracker"        →  launches in 2 seconds
"open calculator but in green"    →  green calculator, no extra steps
"what's 20% of 350?"              →  answers: "70"
"play some lofi music"            →  YouTube player opens
"who is Alan Turing?"             →  responds conversationally
"make it dark mode"               →  edits the live artifact
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
│ 34 pre-    │    │ AI generates    │
│ built      │    │ custom React    │
│ templates  │    │ component       │
│ (instant)  │    │ (bespoke)       │
└────────────┘    └─────────────────┘
```

**The Brain** is the intelligence layer. It reads the full conversation, understands intent, and routes accordingly — never spawning a UI when a sentence suffices, never answering with text when a live tool is what's needed.

**The Vault** holds 34 battle-tested templates (games, productivity tools, finance tools, creative tools). When the Brain matches a template, it's hydrated and served in milliseconds — no generation cost. Parametric requests like "open calculator in green" are recognized as customized builds and routed to the Builder with a precise spec.

**The Builder** takes over only for genuinely custom requests. It receives a structured spec from the Brain and generates a standalone React component. In **Think mode**, the Builder runs with `ThinkingConfig(thinking_budget=8000)` — Gemini 2.5 Flash reasons through the design before writing code, and the thinking text is streamed back to the UI as a collapsible block.

### Streaming response architecture

Responses stream in two phases, eliminating perceived wait time:

```
Phase 1 (~1-2s)   →  Reply text appears immediately
Phase 2 (~2-8s)   →  Artifact builds in background, snaps into canvas
Phase 2 (Think)   →  Thinking block streams → artifact arrives
```

The user reads the response while the artifact is still generating. The "Building canvas…" indicator gives live feedback. No staring at a blank screen.

### Semantic cache

Every generation is embedded with `gemini-embedding-001` and stored in pgvector. On repeat or near-duplicate requests, the cached artifact is served instantly without touching the LLM.

Critically, **only code artifacts are eligible for cache hits** — plain chat replies are stored for session history but are never replayed as cached responses. This ensures every conversational answer is generated fresh with full context, while deterministic UI tools (a calculator is always a calculator) benefit from instant replay.

---

## Feature surface

### Chat-first intelligence
The system defaults to conversation. It answers questions, writes content, explains concepts, does math, and handles follow-ups — exactly like a capable AI assistant. It only generates artifacts when the request genuinely calls for one.

### The Vault — 34 templates
Organized across five categories, instantly available:

| Category | Templates |
|---|---|
| **Games** | Snake, Memory, Tic Tac Toe, Typing Speed Test, Magic 8-Ball, Chess, Checkers, Coin Toss |
| **Productivity** | Todo List, Kanban Board, Habit Tracker, Pomodoro+, Timer, Calendar, Rich Notes, Diary |
| **Finance** | Budget Tracker, Bill Splitter, Calculator |
| **Creative** | Drawing Canvas, Pixel Art Editor, Gradient Generator, Color Palette, Matrix Rain |
| **Tools** | Weather, Music Player, Chart Builder, Flashcards, Quiz, Spin the Wheel, Password Generator, QR Code, Clock, Unit Converter |

Parametric templates like Weather, Music, Flashcards, and Quiz are populated with real data from the Brain — no placeholders, no dummy values.

### My Library
A personal archive of everything the user has generated. Organized by category, searchable, with direct links back to the originating session. Every artifact can be reopened and continued exactly where it was left off.

### Chat history & sessions
Every conversation is persisted. The sidebar shows recent sessions with inline rename and delete. Clicking a session restores the full chat history and the last active artifact in the canvas.

Multi-turn context is fully supported — the last 12 messages are included with every request to both the Brain and the Builder. Say half a thing in one message and finish it in the next; Morph knows what you're talking about.

### Message actions
- **User messages**: Edit (re-sends with history truncated to that point) and Copy
- **AI text responses**: Copy button
- **AI artifact responses**: "Open in Canvas" — opens the live artifact in the resizable panel

### Canvas — resizable split view
Desktop: a fluid two-panel layout. Chat on the left, live artifact on the right. The divider is draggable. Artifacts auto-open when generated.

Mobile: a toggle between Chat and Canvas tabs, with smooth transitions. The system automatically switches to Canvas when an artifact arrives.

### Edit mode
With an artifact active, the user can ask to modify it in plain English. "Make it dark mode", "add a reset button", "change the font to mono" — the Builder receives the current source and an edit instruction, and returns the modified component in place.

### Light & Dark theme
A full dual-theme system controlled by a toggle in the sidebar. Both themes are built on CSS custom properties (`--bg-card`, `--t1`–`--t5`, `--border`, etc.), ensuring every page — Chat, Vault, Library, Tutorial, Settings — renders correctly in both modes.

### Tutorial
An interactive 10-slide onboarding experience at `/tutorial`, accessible from the sidebar and surfaced via a dismissible banner for new users. Each slide has an animated visual, detailed body text, and 3 tip bullets. Navigation includes step pills showing completion state, directional slide transitions, and a direct-access click on any step.

Slides cover: Welcome, Chatting with Morph, Building Apps, The Canvas, Editing Artifacts, The Vault, Files & Attachments, My Library, Settings, and Pro Tips.

### OmniBar
The input bar is a minimal single-line textarea that grows up to 4 lines before scrolling. It supports file attachments (images, PDFs, text, CSV, JSON) with drag-and-drop, a file preview chip, and a stop button during generation. The bar renders at the correct single-line height immediately on page load — no layout shift on first keystroke.

The bottom row has two visible controls: an **Attach** pill button (paperclip + label, clearly visible in both themes) and a **model selector** dropdown to the left of the send button.

### Swift and Think modes
Two generation modes selectable per-message from the OmniBar:

| Mode | Icon | Behaviour |
|---|---|---|
| **Swift** | ⚡ | Standard generation — fast, no thinking overhead |
| **Think** | 🧠 | Gemini 2.5 Flash with `thinking_budget: 8000` — reasons before building |

In Think mode the full reasoning chain appears **before** the answer — exactly as it does in Gemini and Claude's thinking UIs. The thinking block is always first, the answer follows after thinking completes.

- **For artifact builds**: Builder runs with `thinking_budget=8000`. Thinking streams → artifact renders.
- **For chat replies**: A second model call runs with thinking enabled. Thought process appears first, then the final answer replaces the initial placeholder.

The thinking text appears as a collapsible **"Thought about this"** block — collapsed by default, expandable to read the full reasoning. A pulsing brain animation shows while thinking is in progress; the standard "Building canvas…" dots are suppressed in Think mode since the ThinkingBlock handles all pending state.

### Artifact fallback UI
When the Builder generates code with a syntax or runtime error, the canvas replaces the blank screen with a friendly fallback:
- Floating ghost icon with ambient glow
- Human-readable message ("Artifact didn't quite click")
- **Try Again** button — strips the failed response from history and re-fires the last prompt
- **Back to Chat** button
- Collapsible "Show error detail" for the raw error (hidden by default)

Works in both light and dark themes, fully responsive.

### PWA — installable on any device
Morph OS is a fully installable Progressive Web App. On Chrome/Edge/Android an **Install App** button appears in the sidebar footer and triggers the native browser install prompt. On iOS Safari, tapping the same button shows inline instructions ("Tap Share → Add to Home Screen"). Once installed the app runs in standalone mode — no browser chrome, no address bar, indistinguishable from a native app.

The PWA stack:
- `src/app/icon.tsx` — 32×32 PNG favicon auto-generated by Next.js `ImageResponse`
- `src/app/apple-icon.tsx` — 180×180 Apple touch icon
- `src/app/api/pwa-icon/route.tsx` — edge route serving any-size PNG icons for the manifest
- `public/manifest.json` — references 192×192 and 512×512 PNG icons (Chrome installability requirement)
- `public/sw.js` — service worker: network-first navigation, stale-while-revalidate static assets

### Google Search grounding
The Brain routes requests that need live data (trending, news, prices, scores) to `search_web()`, which calls Gemini with `GoogleSearch()` grounding enabled. Real-time answers without leaving the chat.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
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
│   │   ├── ArtifactRenderer.tsx  # Isolated React sandbox + fallback error UI
│   │   ├── OmniBar.tsx           # Input bar: attach pill, Swift/Think selector
│   │   ├── TutorialBanner.tsx    # Dismissible new-user onboarding banner
│   │   ├── TempModeBanner.tsx    # Temporary session mode indicator
│   │   └── InstallPrompt.tsx     # PWA install button + iOS instructions
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Home / new chat
│       │   ├── session/[id]/     # Persistent session view
│       │   ├── artifacts/        # The Vault (template catalog)
│       │   ├── library/          # My Library (user's generated artifacts)
│       │   ├── tutorial/         # Interactive 10-slide onboarding
│       │   └── globals.css       # CSS vars, light/dark theme system
│       ├── icon.tsx              # Auto favicon (32×32 PNG via ImageResponse)
│       ├── apple-icon.tsx        # Apple touch icon (180×180 PNG)
│       ├── api/pwa-icon/         # Edge route — manifest PNG icons (any size)
│       └── vault/templates/      # 34 pre-built React templates
│
└── backend/
    ├── llm_pipeline.py           # Brain, Builder, Editor, local fast-path
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
