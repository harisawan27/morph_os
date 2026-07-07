# Morph OS

> **The AI workspace that thinks before it builds.**

Morph OS is a generative operating system that turns natural language into fully interactive software — live, in your browser, in seconds. It's not a chatbot that shows you code. It's a workspace that *becomes* the tool you need.

> **Installable on any device.** Morph OS is a PWA — tap the **Install App** button in the sidebar to add it to your home screen or desktop. It launches like a native app with no browser chrome.

<br>

[![Morph OS — Live Demo](https://img.youtube.com/vi/rCgnH5MLSpk/maxresdefault.jpg)](https://youtu.be/rCgnH5MLSpk)

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
"fix it, arrows aren't working"   →  edits live artifact with keyboard fix
"who's top of La Liga right now?" →  Google-grounded live answer
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
┌──────────────────────────────────────────────────┐
│  BRAIN  (Gemini 3.5 Flash)                       │
│  Classifies intent in one pass                   │
│  chat / search / template / build / edit         │
│  Reads full conversation + active artifact code  │
└──────────────────┬───────────────────────────────┘
                   │
         ┌─────────┼──────────┬──────────┐
         ▼         ▼          ▼          ▼
    ┌─────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
    │  VAULT  │ │SEARCH│ │BUILDER │ │  CHAT   │
    │ 34 pre- │ │Google│ │ React  │ │ Direct  │
    │ built   │ │Ground│ │ gen    │ │ reply   │
    │templates│ │  ing │ │(Gemma) │ │(Gemini) │
    └─────────┘ └──────┘ └────────┘ └─────────┘
```

**The Brain** is the intelligence layer using **Gemini 3.5 Flash**. It reads the full conversation history plus the source code of any active artifact, understands intent, and routes accordingly — never spawning a UI when a sentence suffices, never answering with text when a live tool is needed. Complaint signals ("it's broken", "fix the arrows", "not working") on an active artifact are routed directly to Edit, never to chat.

**The Vault** holds 34 battle-tested templates. When the Brain matches one, it's hydrated and served in milliseconds — zero generation cost. Parametric requests ("calculator in green") are recognised as customised builds and routed to the Builder with a precise spec.

**The Builder** handles genuinely custom requests using **Gemma-4-31B-it**. It receives a structured spec from the Brain and generates a standalone React component. Its natural chain-of-thought output streams to the UI before the artifact renders.

**The Chat handler** uses **Gemini 3.1 Flash** for conversational replies, with full thought + text streaming in Think mode.

---

### Streaming SSE architecture

The backend speaks to the frontend via a single Server-Sent Events endpoint. Every response is broken into discrete typed events that let the UI update incrementally:

```
Event               When it fires
─────────────────   ──────────────────────────────────────────────
thinking_start      ~300ms after send — before the Brain runs.
                    Frontend creates the ThinkingBlock immediately.
reply               Brain finishes. Sends intent, pending state, model.
thinking_delta      Thought token chunk (streamed from Builder/Chat thread).
text_delta          Reply text chunk (streamed in both Swift and Think mode).
reply_text          Final complete reply text — marks pending=false.
artifact            Generated React code — mounts in the Canvas.
done                Stream complete.
```

**Thread-safe queue bridge** — the Python Gemini SDK's `generate_content_stream` is synchronous. It runs in a worker thread via `asyncio.to_thread`, pushing chunks into a `queue.Queue`. The async SSE generator drains the queue at 10 ms intervals, yielding events in real time. This gives true streaming without blocking the event loop.

```
Browser  ←──── SSE stream ─────  FastAPI async generator
                                        │
                               drains queue (10ms poll)
                                        │
                                  queue.Queue
                                        │
                              asyncio.to_thread
                                        │
                         Gemini SDK (sync, in thread)
                         generate_content_stream()
```

**Perceived latency breakdown:**

```
0 ms      →  User hits send
~300 ms   →  thinking_start fires → ThinkingBlock appears with funny lines
~300 ms   →  Swift reply fires → text starts streaming immediately
~2-5 s    →  thinking_delta chunks arrive → real model thoughts stream in
~2-8 s    →  artifact arrives → Canvas snaps to life
```

---

### Semantic cache

Every generation is embedded with `gemini-embedding-001` (768-dim) and stored in pgvector. Near-duplicate requests get cached artifacts served instantly, bypassing the LLM entirely.

Only **code artifacts** are eligible for cache hits. Plain chat replies are stored for session history but are never replayed — every conversational answer is generated fresh with full context.

---

## Model configuration

| Role | Model | Notes | RPD Pool |
|---|---|---|---|
| **Brain** | `gemini-3.5-flash` | Intent routing and image analysis | Pool 1 (~1,500) |
| **Chat** | `gemini-3.1-flash` | Conversational replies | Pool 2 (~1,500) |
| **Search** | `gemini-3.1-flash` | Web search with Google grounding | Pool 2 (shared) |
| **Builder (primary)** | `gemma-4-31b-it` | React generation + natural thought extraction | Pool 3 (~1,500) |
| **Builder (fallback)** | `gemma-4-26b-a4b-it` | Automatic fallback on quota/availability | Pool 4 (~1,500) |
| **Embeddings** | `gemini-embedding-001` | 768-dim semantic cache | Pool 5 (almost free) |

---

## Feature surface

### Swift mode and Think mode

Two generation modes selectable per-message from the OmniBar:

| | Swift ⚡ | Think 🧠 |
|---|---|---|
| **Builder model** | `gemma-4-31b-it` | `gemma-4-31b-it` |
| **Chat model** | `gemini-3.1-flash` | `gemini-3.1-flash` + thinking |
| **Text delivery** | Streams word-by-word | Streams word-by-word |
| **Thinking block** | — | Gemma natural reasoning → collapsible "Thought about this" |
| **Pending indicator** | Bouncing dots | Funny typewriter lines → real thoughts |
| **Build time** | Slower (large model) | Slower, extracts reasoning |

**Think mode UX detail:**
1. The moment the user sends a message, `thinking_start` fires (~300 ms). The ThinkingBlock appears instantly.
2. While the Brain classifies the request, the idle state cycles through humorous typewriter lines — "consulting the rubber duck...", "summoning the ghost of Dijkstra...", "staring at the code until it blinks..." — typed character by character at 38 ms/char with 1.6 s pauses between lines.
3. When the Builder model runs, its natural chain-of-thought/reasoning output is streamed directly into the ThinkingBlock.
4. When the reply is complete, the block collapses to "Thought about this ▾" — readable on demand, not in the way.

### Real text streaming

Both Swift and Think modes stream the reply text word-by-word as the model generates it. There is no "answer appears at once" behaviour. The chat scroll follows text only when the user is already near the bottom — if they've scrolled up to read, it stays put.

### Scroll-to-first-line

When a new response arrives, the chat scrolls to the **top** of the new message — not the bottom. This means the user always reads from the beginning of the reply, without having to manually scroll back up.

### Chat-first intelligence

The system defaults to conversation. Questions, math, explanations, summaries, follow-ups — answered directly. Artifacts are spawned only when the request genuinely calls for one.

### Google Search grounding

Requests for live data (trending topics, sports scores, news, prices, weather) are routed to `search_web()`, which calls Gemini with `GoogleSearch()` grounding enabled. In Think mode, the search result also goes through the ThinkingBlock flow.

### Keyboard input in Canvas games

All generated games use `window.addEventListener('keydown')` at the document level — not `canvas.addEventListener`. Canvas elements in sandboxed iframes cannot receive keyboard focus. This is enforced at the Builder prompt level, ensuring games like Snake, Tetris, and Chess work out of the box with arrow keys and WASD.

### Edit routing

The Brain maintains a strong signal for edit intent. When an artifact is active, complaint phrasing ("not working", "broken", "fix it", "arrows don't work", "it crashed") routes directly to the Builder's edit path — never to chat. The active artifact's source code is always sent to the Brain even when the Canvas panel is closed.

### Cancellation feedback

Stopping a generation mid-stream immediately shows **"You canceled this request."** in the chat. No silent failures, no hanging indicators.

### The Vault — 34 templates

Organised across five categories, instantly available:

| Category | Templates |
|---|---|
| **Games** | Snake, Memory, Tic Tac Toe, Typing Speed Test, Magic 8-Ball, Chess, Checkers, Coin Toss |
| **Productivity** | Todo List, Kanban Board, Habit Tracker, Pomodoro+, Timer, Calendar, Rich Notes, Diary |
| **Finance** | Budget Tracker, Bill Splitter, Calculator |
| **Creative** | Drawing Canvas, Pixel Art Editor, Gradient Generator, Color Palette, Matrix Rain |
| **Tools** | Weather, Music Player, Chart Builder, Flashcards, Quiz, Spin the Wheel, Password Generator, QR Code, Clock, Unit Converter |

Parametric templates (Weather, Music, Flashcards, Quiz) are populated with real data from the Brain — no placeholders.

### Canvas — resizable split view

**Desktop:** Fluid two-panel layout. Chat left, live artifact right. Draggable divider. Artifacts auto-open on arrival.

**Mobile:** Toggle between Chat and Canvas tabs with smooth transitions. Auto-switches to Canvas when an artifact arrives.

### My Library

A personal archive of everything the user has generated. Organised by category, searchable, with direct links back into each session. Every artifact can be reopened and continued.

### Multi-turn context

The last 12 messages — including role, text, and active artifact code — travel with every request to both the Brain and the Builder. Mid-conversation edits, follow-up refinements, and pronoun resolution all work correctly.

### Message actions

- **User messages**: Edit (truncates history to that point and re-sends) + Copy
- **AI text replies**: Copy button — always visible, no hover required
- **AI artifact replies**: "Open in Canvas" button

### Artifact fallback UI

When generated code has a runtime or syntax error, the Canvas shows a friendly fallback:
- Ghost icon + ambient glow
- Human-readable error message
- **Try Again** — strips the failed response and re-fires the prompt
- **Back to Chat** — returns to the conversation
- Collapsible raw error detail

### OmniBar

A single-line textarea that grows to 4 lines before scrolling. Supports:
- File attachments: images, PDFs, text, CSV, JSON
- Drag-and-drop onto the bar
- File preview chip with remove button
- **Attach** pill (always visible in both themes)
- **Model selector** dropdown (Swift / Think) with animated chevron
- Send button (arrow) / Stop button (square) depending on state

### Settings page

A tabbed settings page with left sidebar navigation (desktop) and a scrollable tab strip (mobile):

| Tab | Content |
|---|---|
| **Profile** | Morph persona: display name, role, city, about, response tone — persists to localStorage |
| **Appearance** | Theme toggle (Dark / Light) with visual swatches |
| **Account** | Google identity block (picture, name, email) + sign out |
| **Danger Zone** | Clear local cache with confirmation state |

Profile fields load synchronously on first render (no double-refresh flash). Auto-saves with 500 ms debounce; "Saved" badge confirms.

### Light & dark theme

Full dual-theme system via CSS custom properties (`--bg-card`, `--t1`–`--t5`, `--border`, `--border-md`, `--border-hi`, etc.). Every page and component respects both themes.

### PWA — installable on any device

| Asset | Details |
|---|---|
| `src/app/icon.tsx` | 32×32 favicon via Next.js ImageResponse |
| `src/app/apple-icon.tsx` | 180×180 Apple touch icon |
| `src/app/api/pwa-icon/route.tsx` | Edge route serving any-size PNG for manifest |
| `public/manifest.json` | 192×192 and 512×512 icons |
| `public/sw.js` | Network-first navigation, stale-while-revalidate static assets |

**Install App** in the sidebar triggers the native browser install prompt on Chrome/Edge/Android. On iOS Safari it shows inline instructions.

### Tutorial

An interactive 10-slide onboarding at `/tutorial`. Animated visuals, tip bullets, step-pill navigation, slide transitions. Covers: Welcome, Chat, Building, Canvas, Editing, Vault, Files, Library, Settings, Pro Tips. Surfaced via a dismissible banner for new users.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Artifact execution** | react-runner (live isolated sandbox) |
| **Resizable panels** | react-resizable-panels |
| **Markdown rendering** | react-markdown + remark-gfm |
| **Backend** | FastAPI, Python 3.11+, asyncio |
| **LLM provider** | Google Gemini (via `google-genai` SDK) |
| **Streaming** | Server-Sent Events + thread-safe `queue.Queue` bridge |
| **Embeddings** | gemini-embedding-001 (768-dim) |
| **Database** | PostgreSQL (Neon) + pgvector extension |
| **Auth** | NextAuth.js (Google OAuth) + python-jose JWT verification |
| **Resilience** | Tenacity (retry + exponential backoff on ServerError) |

---

## Project structure

```
morph_os/
├── frontend/
│   ├── components/
│   │   ├── ChatCanvas.tsx        # Chat UI, SSE handler, streaming renderer
│   │   ├── Sidebar.tsx           # Nav, session list, rename/delete, PWA install
│   │   ├── ArtifactRenderer.tsx  # Live React sandbox + error fallback UI
│   │   ├── OmniBar.tsx           # Input bar: attach, Swift/Think selector, send/stop
│   │   ├── MarkdownRenderer.tsx  # Styled markdown with code blocks
│   │   ├── ThemeProvider.tsx     # Dark/light CSS var theme context
│   │   ├── TutorialBanner.tsx    # Dismissible new-user onboarding banner
│   │   └── InstallPrompt.tsx     # PWA install button + iOS instructions
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Home / new chat
│       │   ├── session/[id]/     # Persistent session view
│       │   ├── settings/         # Tabbed settings page
│       │   ├── artifacts/        # The Vault (template catalog)
│       │   ├── library/          # My Library (generated artifact archive)
│       │   ├── tutorial/         # Interactive 10-slide onboarding
│       │   ├── api/pwa-icon/     # Edge route for manifest icons
│       │   └── globals.css       # CSS custom properties — full dual-theme system
│       ├── icon.tsx              # Auto favicon (32×32 via ImageResponse)
│       ├── apple-icon.tsx        # Apple touch icon (180×180)
│       └── vault/templates/      # 34 pre-built React component templates
│
└── backend/
    ├── llm_pipeline.py           # Brain, Builder, Editor, Chat, Search — full pipeline
    ├── vault_manager.py          # Template matching + hydration engine
    ├── main.py                   # FastAPI routes + SSE streaming generator
    ├── models.py                 # Artifact schema (pgvector embedding column)
    ├── database.py               # DB init, connection, migrations
    └── auth.py                   # JWT cookie validation (NextAuth ↔ FastAPI)
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
NEXTAUTH_SECRET=your_secret
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

Open [http://localhost:3000](http://localhost:3000).

### Deployment

#### Backend: HuggingFace Spaces (Docker Space)
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space) and select **Docker** (using blank template or python template).
2. Set the following secrets in the Space settings:
   - `GEMINI_API_KEY`: Your Google AI Studio API Key.
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `ALLOWED_ORIGINS`: Your Vercel frontend domain.
3. Configure your GitHub repository with Hugging Face as a trusted publisher or push directly to the HF git remote. The space will automatically build and deploy using the root `backend/Dockerfile` on port `7860`.

#### Frontend: Vercel
1. Link your frontend repository to [Vercel](https://vercel.com).
2. Configure the build settings to use **Next.js** preset.
3. Set the following environment variables:
   - `NEXT_PUBLIC_API_URL`: Your HuggingFace Space live URL (e.g. `https://username-space-name.hf.space`).
   - `NEXTAUTH_URL`: Your Vercel deployment URL.
   - `NEXTAUTH_SECRET`: A random secure string.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
4. Deploy. Vercel will trigger automatic rebuilds for every new commit.

---

## Roadmap

- [ ] **Artifact collaboration** — share a generated tool via link; recipients get their own live copy
- [ ] **Cloud state sync** — todo items, notes, kanban cards persist to the database across devices
- [ ] **Multi-artifact canvas** — pin multiple artifacts side by side in the workspace
- [ ] **Voice input** — speak to Morph OS via the OmniBar
- [ ] **Plugin system** — extend the Vault with community-contributed templates
- [ ] **Morph API** — embed the generation engine in third-party products

---

*"Don't generate code. Morph reality."*
