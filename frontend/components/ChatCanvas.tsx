"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import ArtifactRenderer from "./ArtifactRenderer";
import { Ghost, Layers, ChevronRight, Sparkles, X, Copy, Check, Pencil, CornerDownLeft, FileText, Image, Brain, ChevronDown } from "lucide-react";
import Link from "next/link";
import MarkdownRenderer from "./MarkdownRenderer";
import OmniBar, { type ModelId } from "./OmniBar";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string | null;
  pending?: boolean;
  attachment?: { name: string; isImage: boolean } | null;
  thinking?: string | null;
  model?: ModelId;
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
  const [model,          setModel]          = useState<ModelId>("swift");
  const bottomRef        = useRef<HTMLDivElement>(null);
  const autoFiredRef     = useRef(false);
  const historyLoadedRef = useRef(false);
  const abortRef         = useRef<AbortController | null>(null);

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
    const check = () => setIsMobile(window.innerWidth < 1024);
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

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ── Core generate (streaming SSE) ───────────────────────────────────────
  const handleGenerate = useCallback(async (prompt: string, file?: File | null) => {
    const controller = new AbortController();
    abortRef.current = controller;

    const attachment = file ? { name: file.name, isImage: file.type.startsWith("image/") } : null;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: prompt, attachment };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    let user_context: Record<string, string> | undefined;
    try {
      const raw = localStorage.getItem("morph_user_context");
      if (raw) user_context = JSON.parse(raw);
    } catch {}

    let botMsgId: string | null = null;

    try {
      let res: Response;

      if (file) {
        const form = new FormData();
        form.append("prompt", prompt);
        if (sessionId) form.append("session_id", sessionId);
        form.append("history", JSON.stringify(messages.map(m => ({ role: m.role, text: m.text }))));
        form.append("user_context", JSON.stringify(user_context ?? {}));
        if (activeArtifact?.code) form.append("current_artifact", activeArtifact.code);
        form.append("file", file);
        form.append("model", model);
        res = await fetch(`${API}/api/generate-with-file`, {
          method: "POST",
          credentials: "include",
          body: form,
          signal: controller.signal,
        });
      } else {
        res = await fetch(`${API}/api/generate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            session_id: sessionId,
            history: messages.map(m => ({ role: m.role, text: m.text })),
            user_context,
            current_artifact: activeArtifact?.code ?? null,
            model,
          }),
          signal: controller.signal,
        });
      }

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
            botMsgId = event.id as string;
            setIsGenerating(false);
            setMessages(prev => [...prev, {
              id:      event.id as string,
              role:    "assistant",
              text:    event.text as string,
              code:    null,
              pending: !!(event.pending),
              model:   (event.model as ModelId) ?? "swift",
            }]);
          }

          if (event.type === "thinking" && botMsgId) {
            setMessages(prev => prev.map(m =>
              m.id === botMsgId ? { ...m, thinking: event.text as string } : m
            ));
          }

          if (event.type === "reply_text" && botMsgId) {
            setMessages(prev => prev.map(m =>
              m.id === botMsgId ? { ...m, text: event.text as string, pending: false } : m
            ));
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
      if (e instanceof Error && e.name === "AbortError") {
        // User cancelled — clear pending state on partial reply, no error message
        if (botMsgId) {
          setMessages(prev => prev.map(m =>
            m.id === botMsgId ? { ...m, pending: false } : m
          ));
        }
      } else {
        setMessages(prev => [...prev, {
          id:   Date.now().toString(),
          role: "assistant",
          text: `Signal lost — ${e instanceof Error ? e.message : "Unknown error"}`,
        }]);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
      if (botMsgId) {
        setMessages(prev => prev.map(m =>
          m.id === botMsgId ? { ...m, pending: false } : m
        ));
      }
    }
  }, [messages, sessionId, activeArtifact, isMobile, model]);

  const handleResubmit = useCallback((index: number, newText: string) => {
    setMessages(prev => prev.slice(0, index));
    handleGenerate(newText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGenerate]);

  const handleRegenerate = useCallback(() => {
    const lastUserIdx = messages.map(m => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const prompt = messages[lastUserIdx].text;
    setMessages(prev => prev.slice(0, lastUserIdx));
    handleGenerate(prompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, handleGenerate]);

  const isEmpty = messages.length === 0 && !isLoadingHistory && !isGenerating;

  // ─────────────────────────────────────────────────────────────────────────
  // Chat panel — two layouts: empty (centered) vs active (messages + bottom bar)
  // ─────────────────────────────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-panel)" }}>

      {isEmpty ? (
        /* ── EMPTY STATE ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 relative overflow-hidden">

          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-75 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(147,51,234,0.07) 0%, transparent 70%)" }} />

          {/* Greeting */}
          <div className="mb-7 select-none text-center">
            <p className="text-base font-normal mb-1" style={{
              background: "linear-gradient(90deg, rgba(192,132,252,0.9), rgba(129,140,248,0.9))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Welcome to Morph OS
            </p>
            <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-tight" style={{ color: "var(--t1)" }}>
              What can I build for you?
            </h1>
          </div>

          {/* OmniBar */}
          <div className="w-full max-w-lg mb-5">
            <OmniBar onGenerate={handleGenerate} onStop={handleStop} isLoading={isGenerating} autoFocus model={model} onModelChange={setModel} />
          </div>

          {/* Suggestion chips — scrollable on mobile, wrapping on desktop */}
          <div className="w-full max-w-lg flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center sm:overflow-visible pb-0.5 sm:pb-0" style={{ scrollbarWidth: "none" }}>
            {HINTS.map(h => (
              <button
                key={h.prompt}
                onClick={() => handleGenerate(h.prompt)}
                className="shrink-0 px-4 py-2 text-[13px] rounded-full transition-all duration-150 active:scale-95"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--t3)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-hover)"; el.style.color = "var(--t1)"; el.style.borderColor = "var(--border-md)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-card)"; el.style.color = "var(--t3)"; el.style.borderColor = "var(--border)"; }}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Onboarding nudge */}
          <div className="mt-6 w-full max-w-170">
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

          <div className="shrink-0 px-3 sm:px-4 py-3 pb-safe" style={{ borderTop: "1px solid var(--border)" }}>
            <OmniBar onGenerate={handleGenerate} onStop={handleStop} isLoading={isGenerating} model={model} onModelChange={setModel} />
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
                <ArtifactRenderer code={activeArtifact.code} artifactId={activeArtifact.id} onBack={() => setMobileView("chat")} onRegenerate={handleRegenerate} />
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
                  <ArtifactRenderer code={activeArtifact.code} artifactId={activeArtifact.id} onClose={() => setActiveArtifact(null)} onRegenerate={handleRegenerate} />
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
  { label: "Open Snake Game",              prompt: "open snake game"                 },
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
  const [hovered,  setHovered]  = useState(false);

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
      <div
        className="flex flex-col items-end py-1 gap-1"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
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
              {m.attachment && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                  style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.15)", color: "var(--t3)" }}>
                  {m.attachment.isImage ? <Image size={10} /> : <FileText size={10} />}
                  <span className="truncate" style={{ maxWidth: "180px" }}>{m.attachment.name}</span>
                </div>
              )}
              <p className="whitespace-pre-wrap wrap-break-word">{m.text}</p>
            </div>
            {/* action bar — fades in on hover */}
            <div
              className="flex items-center gap-0.5 pr-1 transition-opacity duration-150"
              style={{ opacity: hovered || copied ? 1 : 0 }}
            >
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
    <div
      className="flex items-start gap-3 py-1 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-600/50 to-blue-600/50 shrink-0 mt-0.5 flex items-center justify-center"
        style={{ border: "1px solid var(--border)" }}>
        <Ghost size={12} className="text-purple-300/70" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Thinking block — shows before answer when think mode is used */}
        {(m.thinking || (m.pending && m.model === "think")) && (
          <ThinkingBlock thinking={m.thinking} isPending={!!(m.pending && !m.thinking)} />
        )}

        {isError ? (
          <p className="text-sm leading-relaxed" style={{ color: "#f87171" }}>{m.text}</p>
        ) : m.text ? (
          <MarkdownRenderer content={m.text} />
        ) : null}

        {/* Bouncing dots — only for swift-mode artifact builds; think mode uses ThinkingBlock */}
        {m.pending && !m.code && m.model !== "think" ? (
          <div
            className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
            style={{
              background: "rgba(147,51,234,0.05)",
              border: "1px solid rgba(147,51,234,0.10)",
              color: "rgba(192,132,252,0.45)",
            }}
          >
            <span className="flex gap-1 items-center shrink-0">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: "rgba(192,132,252,0.45)", animationDelay: `${i * 0.15}s` }} />
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
              border: "1px solid rgba(147,51,234,0.16)",
              color: "rgba(192,132,252,0.7)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(147,51,234,0.13)"; (e.currentTarget as HTMLElement).style.color = "rgba(192,132,252,1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(147,51,234,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(192,132,252,0.7)"; }}
          >
            <Layers size={11} />
            <span>Open in Canvas</span>
            <ChevronRight size={10} className="ml-0.5 opacity-50" />
          </button>
        ) : !isError && (
          <button
            onClick={() => copy(m.text)}
            className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all duration-150"
            style={{ color: "var(--t4)", opacity: hovered || copied ? 1 : 0 }}
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

// ─── Thinking block ───────────────────────────────────────────────────────────
function ThinkingBlock({ thinking, isPending }: { thinking?: string | null; isPending?: boolean }) {
  const [open, setOpen] = useState(false);

  if (isPending && !thinking) {
    return (
      <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
        style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.14)" }}>
        <Brain size={12} className="shrink-0 animate-pulse" style={{ color: "rgba(196,181,253,0.6)" }} />
        <span style={{ color: "rgba(196,181,253,0.6)" }}>Thinking…</span>
        <span className="flex gap-0.5 items-center ml-0.5">
          {[0,1,2].map(i => (
            <span key={i} className="w-0.5 h-2 rounded-full animate-pulse"
              style={{ background: "rgba(196,181,253,0.4)", animationDelay: `${i * 0.2}s`, animationDuration: "1s" }} />
          ))}
        </span>
      </div>
    );
  }

  if (!thinking) return null;

  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] w-full transition-all duration-150"
        style={{
          background: open ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)",
          border: "1px solid rgba(139,92,246,0.14)",
          color: "rgba(196,181,253,0.7)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = open ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)"; }}
      >
        <Brain size={11} className="shrink-0" style={{ color: "rgba(196,181,253,0.7)" }} />
        <span className="flex-1 text-left">Thought about this</span>
        <ChevronDown
          size={10}
          style={{ transition: "transform 200ms", transform: open ? "rotate(180deg)" : "none", opacity: 0.6 }}
        />
      </button>
      {open && (
        <div
          className="mt-1 px-3 py-3 rounded-xl text-[11px] leading-relaxed morph-scrollbar overflow-y-auto"
          style={{
            background: "rgba(139,92,246,0.04)",
            border: "1px solid rgba(139,92,246,0.10)",
            color: "var(--t4)",
            maxHeight: "220px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {thinking}
        </div>
      )}
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
