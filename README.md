# 🌌 Morph OS: Stealth Edition

> **The World's First High-Fidelity Generative Operating System.**

Morph OS is a minimalist, agentic workspace designed to transform human intent into functional software artifacts instantly. It bypasses the traditional "bottleneck" of AI-generated code by utilizing a dual-engine architecture: a high-reasoning **Brain** and a lightning-fast **Vault**.

![Morph OS Banner](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop)

---

## ✨ Design Philosophy: "Stealth & Product"

Morph OS follows a **Product-First** principle. Unlike traditional AI assistants that output code blocks, Morph OS morphs its own interface into the tool you requested. 

- **Omni-Bar Interface**: A singular, liquid entry point that handles chat, search, and application building.
- **Stealth Mode**: Source code is generated and archived in the background (Postgres), while the user interacts only with the "Product"—a clean, high-performance interactive artifact.
- **The Canvas**: A fluid, resizable multi-pane environment where reality adapts to your task.

---

## 🚀 Key Features

### 🌪️ The Vault Engine (Zero-Token Routing)
Morph OS utilizes a local intent-routing engine to provide **zero-latency** access to common tools. Commands like "Play song", "Weather in NYC", or "Snake game" bypass AI token consumption entirely.
- **Instant Media**: Powered by a search-on-load YouTube engine.
- **Atmosphere Data**: Real-time hydration of weather metrics.
- **Persistence**: "The Ledger" keeps your tasks synced in a glassmorphism To-Do suite.

### 🧠 Dual-Model Brain
Orchestrated by Gemini 2.5 Flash and Gemini 1.5 Pro, the system intelligently routes complex requests to a **Senior Builder** agent when the Vault doesn't have a template ready. It features:
- **Automatic Fallback**: Resilience against API "High Interference" spikes.
- **Semantic Cache**: Near-zero latency for repeating requests via vector indexing.

### 🎨 Premium Aesthetics
Standardized on a **Dark-Mode Glassmorphism** aesthetic, every artifact feels like a native part of a futuristic OS. 
- **Tailwind-Fluid**: Responsive, high-fidelity components.
- **Framer Motion**: Signature liquid transitions and micro-animations.

---

## 🛠️ Technical Architecture

### **The Stack**
- **Frontend**: Next.js 16 (Turbopack), React-Resizable-Panels, Framer Motion, Lucide-React.
- **Execution**: `React-Runner` isolated sandbox for dynamic artifact mounting.
- **Backend**: FastAPI (Python 3.11+), GenAI (Gemini Orchestration), Tenacity (Resilience).
- **Persistence**: Neon Postgres & pgvector semantic storage.

### **Directory Structure**
```bash
├── frontend/             # Next.js 16 Workspace
│   ├── src/app/          # Canvas & Session routing
│   ├── components/       # ArtifactRenderer, OmniBar, Sidebar
│   └── src/vault/        # [NEW] IDE-Clean Template Library
├── backend/              # Python Agentic Brain
│   ├── llm_pipeline.py   # Intent routing & Builder Logic
│   ├── vault_manager.py  # Zero-token template hydrator
│   └── main.py           # REST API & DB Orchestration
```

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js 20+
- Python 3.11+
- [Gemini API Key](https://aistudio.google.com/)

### 2. Environment Setup
Create a `.env` in the `backend/` directory:
```env
GEMINI_API_KEY=your_key_here
NEON_DATABASE_URL=your_postgres_url
```

### 3. Launching Morph OS
**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔮 The Roadmap
- [ ] **Morph-State Persistence**: Save manual changes to artifacts back to the Brain's long-term memory.
- [ ] **Multi-Agent Canvas**: Allow multiple generated artifacts to talk to each other in the resizable workspace.
- [ ] **Native Plugins**: Extend the Vault with File Explorer and Terminal templates.

---

*“Don't generate code. Morph reality.”* 
Built with ❤️ by the Morph OS Team.
