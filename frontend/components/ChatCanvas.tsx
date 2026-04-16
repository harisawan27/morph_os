"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import OmniBar from "./OmniBar";
import ArtifactRenderer from "./ArtifactRenderer";
import { Ghost, Layers, ChevronRight, Sparkles, X, Copy, Check, Pencil, CornerDownLeft } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string | null;
  pending?: boolean; // true while artifact is still streaming in
};
type ActiveArtifact = { code: string; id: string } | null;

interface ChatCanvasProps {
  sessionId: string;
  initialMessages?: Message[];
  initialArtifact?: ActiveArtifact;
  isLoadingHistory?: boolean;
  autoPrompt?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ChatCanvas({
  sessionId,
  initialMessages = [],
  initialArtifact = null,
  isLoadingHistory = false,
  autoPrompt,
}: ChatCanvasProps) {
  const [messages,       setMessages]       = useState<Message[]>(initialMessages);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<ActiveArtifact>(initialArtifact);
  const [mobileView,     setMobileView]     = useState<"chat" | "artifact">("chat");
  const [isMobile,       setIsMobile]       = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const autoFiredRef = useRef(false);
  const historyLoadedRef = useRef(false);

  // ── Sync parent async history ───────────────────────────────────────────
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      historyLoadedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages.length]);

  useEffect(() => {
    if (initialArtifact) setActiveArtifact(initialArtifact);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialArtifact?.id]);

  // ── Responsive detection ────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Scroll to bottom: smooth for new messages, instant for history ──────
  useEffect(() => {
    if (messages.length === 0) return;
    const behavior: ScrollBehavior = historyLoadedRef.current ? "instant" : "smooth";
    historyLoadedRef.current = false;
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length]);

  useEffect(() => {
    if (!isGenerating) return;
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [isGenerating]);

  // ── Auto-switch to artifact on mobile ───────────────────────────────────
  useEffect(() => {
    if (activeArtifact && isMobile) setMobileView("artifact");
  }, [activeArtifact?.id, isMobile]);

  // ── Auto-fire prompt from sidebar artifact click ────────────────────────
  useEffect(() => {
    if (!autoPrompt || autoFiredRef.current) return;
    autoFiredRef.current = true;
    handleGenerate(autoPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt]);

  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      if (prompt) { autoFiredRef.current = false; handleGenerate(prompt); }
    };
    window.addEventListener("morph:auto-prompt", handler);
    return () => window.removeEventListener("morph:auto-prompt", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core generate (streaming SSE) ───────────────────────────────────────
  const handleGenerate = useCallback(async (prompt: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    let user_context: Record<string, string> | undefined;
    try {
      const raw = localStorage.getItem("morph_user_context");
      if (raw) user_context = JSON.parse(raw);
    } catch {}

    let botMsgId: string | null = null;

    try {
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          session_id: sessionId,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          user_context,
          current_artifact: activeArtifact?.code ?? null,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(part.slice(6).trim()); } catch { continue; }

          if (event.type === "reply") {
            // Phase 1 — reply text arrives: hide typing indicator, show message
            botMsgId = event.id as string;
            setIsGenerating(false);
            setMessages(prev => [...prev, {
              id:      event.id as string,
              role:    "assistant",
              text:    event.text as string,
              code:    null,
              pending: !!(event.pending),
            }]);
          }

          if (event.type === "artifact" && botMsgId) {
            // Phase 2 — artifact arrives: attach to existing message, open canvas
            const code = event.code as string;
            const id   = event.id as string;
            setMessages(prev => prev.map(m =>
              m.id === id ? { ...m, code, pending: false } : m
            ));
            setActiveArtifact({ code, id });
            if (isMobile) setMobileView("artifact");
            window.dispatchEvent(new CustomEvent("morph:session-update"));
          }

          if (event.type === "done") {
            if (botMsgId) {
              setMessages(prev => prev.map(m =>
                m.id === botMsgId ? { ...m, pending: false } : m
              ));
            }
            window.dispatchEvent(new CustomEvent("morph:session-update"));
          }

          if (event.type === "error") throw new Error(event.text as string);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id:   Date.now().toString(),
        role: "assistant",
        text: `Signal lost — ${e instanceof Error ? e.message : "Unknown error"}`,
      }]);
    } finally {
      setIsGenerating(false);
      if (botMsgId) {
        setMessages(prev => prev.map(m =>
          m.id === botMsgId ? { ...m, pending: false } : m
        ));
      }
    }
  }, [messages, sessionId, activeArtifact, isMobile]);

  const handleResubmit = useCallback((index: number, newText: string) => {
    setMessages(prev => prev.slice(0, index));
    handleGenerate(newText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGenerate]);

  const isEmpty = messages.length === 0 && !isLoadingHistory && !isGenerating;

  // ─────────────────────────────────────────────────────────────────────────
  // Chat panel — two layouts: empty (centered) vs active (messages + bottom bar)
  // ─────────────────────────────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-panel)" }}>

      {isEmpty ? (
        /* ── EMPTY STATE ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 relative overflow-hidden">

          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[260px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(147,51,234,0.06) 0%, transparent 70%)" }} />

          {/* Icon + Heading */}
          <div className="flex flex-col items-center gap-5 mb-8 select-none">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.18), rgba(37,99,235,0.14))", border: "1px solid rgba(147,51,234,0.18)" }}>
                <Ghost size={22} className="text-purple-400/80" />
              </div>
              <div className="absolute inset-0 rounded-2xl scale-150 -z-10 blur-xl"
                style={{ background: "radial-gradient(ellipse, rgba(147,51,234,0.12), transparent)" }} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--t1)" }}>
                What can I make for you?
              </h1>
              <p className="text-sm sm:text-[15px]" style={{ color: "var(--t4)" }}>
                Build apps, get answers, create tools — just describe it.
              </p>
            </div>
          </div>

          {/* OmniBar */}
          <div className="w-full max-w-2xl mb-4">
            <OmniBar onGenerate={handleGenerate} isLoading={isGenerating} autoFocus />
          </div>

          {/* Suggestion chips — horizontal scroll on mobile */}
          <div className="w-full max-w-2xl overflow-x-auto" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <div className="flex gap-2 pb-1 justify-start sm:justify-center" style={{ minWidth: "max-content", padding: "2px 2px 4px" }}>
              {HINTS.map(h => (
                <button
                  key={h.prompt}
                  onClick={() => handleGenerate(h.prompt)}
                  className="shrink-0 px-3.5 py-2 text-[12px] rounded-xl transition-all active:scale-95"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--t3)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-hover)"; el.style.color = "var(--t2)"; el.style.borderColor = "var(--border-md)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-card)"; el.style.color = "var(--t3)"; el.style.borderColor = "var(--border)"; }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Onboarding nudge — compact, below chips */}
          <div className="mt-6 w-full max-w-2xl">
            <OnboardingNudge />
          </div>
        </div>

      ) : (
        /* ── CHAT STATE: messages + bottom OmniBar ── */
        <>
          <div className="flex-1 overflow-y-auto morph-scrollbar overscroll-contain">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-1">

              {isLoadingHistory ? (
                <SkeletonMessages />
              ) : (
                messages.map((m, i) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    messageIndex={i}
                    isLast={i === messages.length - 1}
                    isMobile={isMobile}
                    onShowArtifact={() => {
                      if (m.code) {
                        setActiveArtifact({ code: m.code!, id: m.id });
                        if (isMobile) setMobileView("artifact");
                      }
                    }}
                    onResubmit={handleResubmit}
                  />
                ))
              )}

              {isGenerating && <TypingIndicator />}

              <div ref={bottomRef} className="h-1" />
            </div>
          </div>

          <div className="shrink-0 px-3 sm:px-4 pt-2 pb-safe" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="py-2">
              <OmniBar onGenerate={handleGenerate} isLoading={isGenerating} />
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Mobile layout
  // ─────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="h-screen-dvh w-full overflow-hidden flex flex-col" style={{ background: "var(--bg-panel)", color: "var(--t1)" }}>
        {/* Top bar */}
        {activeArtifact && (
          <div className="shrink-0 h-14 flex items-center justify-center px-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex rounded-full p-0.5 gap-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {(["chat", "artifact"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setMobileView(v)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1"
                  style={{
                    background: mobileView === v ? "var(--bg-active)" : "transparent",
                    color: mobileView === v ? "var(--t1)" : "var(--t3)",
                  }}
                >
                  {v === "artifact" && <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" />}
                  {v === "chat" ? "Chat" : "Canvas"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {(mobileView === "chat" || !activeArtifact) ? (
              <motion.div key="chat" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="absolute inset-0">
                {chatPanel}
              </motion.div>
            ) : (
              <motion.div key="artifact" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="absolute inset-0">
                <ArtifactRenderer code={activeArtifact.code} artifactId={activeArtifact.id} onBack={() => setMobileView("chat")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Desktop layout — resizable split panels
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen-dvh w-full overflow-hidden" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
      <Group orientation="horizontal" className="h-full">
        <Panel defaultSize={activeArtifact ? 38 : 100} minSize={24}>
          {chatPanel}
        </Panel>

        <AnimatePresence>
          {activeArtifact && (
            <>
              <Separator className="w-px cursor-col-resize transition-colors" style={{ background: "var(--border)" }} />
              <Panel defaultSize={62} minSize={35}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  <ArtifactRenderer code={activeArtifact.code} artifactId={activeArtifact.id} onClose={() => setActiveArtifact(null)} />
                </motion.div>
              </Panel>
            </>
          )}
        </AnimatePresence>
      </Group>
    </div>
  );
}

// ─── Hints ────────────────────────────────────────────────────────────────────
const HINTS = [
  { label: "Build a habit tracker",       prompt: "build me a habit tracker"        },
  { label: "Open Snake",                  prompt: "open snake"                      },
  { label: "Weather in Tokyo",            prompt: "weather in Tokyo"                },
  { label: "Pomodoro timer",              prompt: "open pomodoro timer"             },
  { label: "Explain quantum computing",   prompt: "explain quantum computing simply"},
  { label: "Kanban board",               prompt: "open kanban board"               },
  { label: "Play lofi music",             prompt: "play me some lofi music"         },
  { label: "Bill splitter",              prompt: "open bill splitter"              },
];

// ─── Message row ──────────────────────────────────────────────────────────────
function MessageRow({
  message: m,
  messageIndex,
  isLast,
  isMobile,
  onShowArtifact,
  onResubmit,
}: {
  message: Message;
  messageIndex: number;
  isLast: boolean;
  isMobile: boolean;
  onShowArtifact: () => void;
  onResubmit: (index: number, text: string) => void;
}) {
  const isUser  = m.role === "user";
  const isError = m.text.startsWith("Signal lost");

  const [copied,   setCopied]   = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editText, setEditText] = useState(m.text);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    setEditing(false);
    if (trimmed && trimmed !== m.text) onResubmit(messageIndex, trimmed);
    else setEditText(m.text);
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end py-1 gap-1">
        {editing ? (
          <div className="max-w-[82%] sm:max-w-[75%] w-full">
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditText(m.text); }
              }}
              rows={Math.max(2, editText.split("\n").length)}
              className="w-full text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-sm resize-none outline-none"
              style={{ background: "var(--msg-bg)", border: "1px solid var(--border-md)", color: "var(--t1)" }}
            />
            <div className="flex justify-end gap-1.5 mt-1.5">
              <button
                onClick={() => { setEditing(false); setEditText(m.text); }}
                className="px-2.5 py-1 text-[11px] rounded-lg transition-all"
                style={{ color: "var(--t4)", background: "var(--bg-card)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                className="px-2.5 py-1 text-[11px] rounded-lg flex items-center gap-1 transition-all"
                style={{ color: "var(--t1)", background: "rgba(147,51,234,0.15)", border: "1px solid rgba(147,51,234,0.25)" }}
              >
                <CornerDownLeft size={10} />
                Send
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="max-w-[82%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
              style={{ background: "var(--msg-bg)", border: "1px solid var(--msg-border)", color: "var(--t1)" }}
            >
              <p className="whitespace-pre-wrap wrap-break-word">{m.text}</p>
            </div>
            {/* action bar — always visible */}
            <div className="flex items-center gap-0.5 pr-1">
              <button
                onClick={() => { setEditing(true); setEditText(m.text); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
                style={{ color: "var(--t4)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
              >
                <Pencil size={10} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => copy(m.text)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
                style={{ color: "var(--t4)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-1">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-600/50 to-blue-600/50 shrink-0 mt-0.5 flex items-center justify-center"
        style={{ border: "1px solid var(--border)" }}>
        <Ghost size={12} className="text-purple-300/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
          style={{ color: isError ? "#f87171" : "var(--t2)" }}
        >
          {m.text}
        </p>

        {m.pending && !m.code ? (
          /* Artifact still generating — show pulsing placeholder */
          <div
            className="mt-2.5 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px]"
            style={{
              background: "rgba(147,51,234,0.05)",
              border: "1px solid rgba(147,51,234,0.12)",
              color: "rgba(192,132,252,0.5)",
            }}
          >
            <span className="flex gap-0.75 items-center">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: "rgba(192,132,252,0.5)", animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
            <span>Building canvas…</span>
          </div>
        ) : m.code ? (
          <button
            onClick={onShowArtifact}
            className="mt-2.5 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all active:scale-[0.97]"
            style={{
              background: "rgba(147,51,234,0.07)",
              border: "1px solid rgba(147,51,234,0.18)",
              color: "rgba(192,132,252,0.75)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(147,51,234,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(192,132,252,1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(147,51,234,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(192,132,252,0.75)"; }}
          >
            <Layers size={11} />
            <span>Open in Canvas</span>
            <ChevronRight size={10} className="ml-0.5 opacity-50" />
          </button>
        ) : !isError && (
          <button
            onClick={() => copy(m.text)}
            className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
            style={{ color: "var(--t4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 pt-1">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-600/40 to-blue-600/40 shrink-0 mt-0.5 flex items-center justify-center"
        style={{ border: "1px solid var(--border)" }}>
        <Ghost size={12} className="text-purple-300/50" />
      </div>
      <div className="flex gap-1 pt-2.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--t4)", animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonMessages() {
  return (
    <div className="space-y-5 py-4">
      {[58, 75, 45, 68].map((w, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "items-start gap-3"}`}>
          {i % 2 !== 0 && <div className="w-7 h-7 rounded-full animate-pulse shrink-0" style={{ background: "var(--bg-card)" }} />}
          <div className="h-9 rounded-2xl animate-pulse" style={{ width: `${w}%`, background: "var(--bg-card)" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Onboarding nudge ─────────────────────────────────────────────────────────
function OnboardingNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const ctx = localStorage.getItem("morph_user_context");
      const dismissed = localStorage.getItem("morph_onboarding_dismissed");
      if (!ctx && !dismissed) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem("morph_onboarding_dismissed", "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="w-full max-w-sm mx-auto"
      >
        <div
          className="relative flex items-start gap-3 px-4 py-3.5 rounded-2xl"
          style={{
            background: "linear-gradient(to right, rgba(147,51,234,0.07), rgba(37,99,235,0.07))",
            border: "1px solid rgba(147,51,234,0.15)",
          }}
        >
          <div className="p-1.5 rounded-xl shrink-0 mt-0.5" style={{ background: "rgba(147,51,234,0.15)" }}>
            <Sparkles size={13} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-none mb-1" style={{ color: "var(--t1)" }}>Personalize Morph OS</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--t3)" }}>
              Tell us your name, role & city for smarter, tailored responses.
            </p>
            <Link href="/settings" onClick={dismiss}>
              <span className="inline-block mt-2 text-[11px] text-purple-400/70 hover:text-purple-400 transition-colors">
                Set up profile →
              </span>
            </Link>
          </div>
          <button onClick={dismiss} className="shrink-0 p-1 transition-colors" style={{ color: "var(--t4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}>
            <X size={12} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
