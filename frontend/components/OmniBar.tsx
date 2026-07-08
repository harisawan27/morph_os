"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { ArrowUp, Square, Paperclip, X, FileText, Zap, Brain, ChevronDown, Check } from "lucide-react";

export type ModelId = "swift" | "think";

interface OmniBarProps {
  onGenerate: (prompt: string, file?: File | null) => void;
  onStop?: () => void;
  isLoading: boolean;
  autoFocus?: boolean;
  model: ModelId;
  onModelChange: (m: ModelId) => void;
}

const MODELS: { id: ModelId; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: "swift", icon: <Zap size={13} />,   label: "Swift", desc: "Fast responses"           },
  { id: "think", icon: <Brain size={13} />, label: "Think", desc: "Reasons before answering" },
];

export default function OmniBar({
  onGenerate, onStop, isLoading, autoFocus, model, onModelChange,
}: OmniBarProps) {
  const [prompt,     setPrompt]     = useState("");
  const [file,       setFile]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [focused,    setFocused]    = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modelOpen,  setModelOpen]  = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelBtnRef  = useRef<HTMLDivElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Set height to 0 first — forces scrollHeight to reflect real content,
    // not the browser-imposed rows=1 floor that "auto" respects.
    el.style.overflowY = "hidden";
    el.style.height = "0";
    const MAX_H = 4 * 24 + 14; // 4 lines × 24px + padding (10+4)
    const h = Math.min(el.scrollHeight, MAX_H);
    el.style.height = h + "px";
    el.style.overflowY = h >= MAX_H ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => { resize(); }, [prompt, resize]);
  useEffect(() => { if (autoFocus) textareaRef.current?.focus(); }, [autoFocus]);

  useEffect(() => {
    if (!modelOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node))
        setModelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelOpen]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    } else {
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const submit = useCallback(() => {
    const val = prompt.trim();
    if ((!val && !file) || isLoading) return;
    onGenerate(val || "Analyze this file", file);
    setPrompt("");
    clearFile();
  }, [prompt, file, isLoading, onGenerate, clearFile]);


  const canSubmit   = (!!(prompt.trim() || file)) && !isLoading;
  const borderColor = isDragging ? "var(--border-hi)" : focused ? "var(--border-md)" : "var(--border)";
  const activeModel = MODELS.find(m => m.id === model)!;

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className="w-full max-w-2xl mx-auto">

      {/* File preview chip — sits above the bar */}
      {file && (
        <div className="mb-2 px-1">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px]"
            style={{ background: "var(--brand-purple-bg)", border: "1px solid var(--brand-purple-border)" }}
          >
            {previewUrl
              ? <img src={previewUrl} alt="" className="w-5 h-5 rounded-lg object-cover shrink-0" />
              : <FileText size={12} style={{ color: "var(--brand-purple)" }} className="shrink-0" />}
            <span className="truncate" style={{ color: "var(--t2)", maxWidth: "200px" }}>{file.name}</span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            >
              <X size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: "var(--bg-input)",
          border: `1px solid ${borderColor}`,
          boxShadow: focused ? "0 0 0 3px var(--brand-purple-bg)" : "none",
          transition: "border-color 150ms, box-shadow 150ms",
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false);
          const f = e.dataTransfer.files[0]; if (f) handleFile(f);
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={isLoading}
          placeholder={file ? "Ask about this file..." : "Ask Morph anything..."}
          className="w-full bg-transparent text-[15px] resize-none outline-none disabled:opacity-40"
          style={{
            color: "var(--t1)", caretColor: "var(--t1)",
            lineHeight: "1.5rem", padding: "10px 16px 4px",
            margin: 0, display: "block", height: "38px",
          }}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-3 gap-2">

          {/* Attach pill — clearly visible */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all duration-150 disabled:opacity-30 shrink-0"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)" }}
            title="Attach file - images, PDFs, text, CSV, JSON"
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-md)"; el.style.color = "var(--t1)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--t3)"; }}
          >
            <Paperclip size={13} />
            <span className="hidden sm:inline">Attach</span>
          </button>

          {/* Right: model selector + send/stop */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Model selector */}
            <div className="relative" ref={modelBtnRef}>
              <button
                type="button"
                onClick={() => setModelOpen(v => !v)}
                disabled={isLoading}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-xl text-[11px] font-medium transition-all duration-150 disabled:opacity-40"
                style={{
                  background: model === "think" ? "var(--brand-purple-bg)" : "var(--bg-card)",
                  border:     model === "think" ? "1px solid var(--brand-purple-border)" : "1px solid var(--border)",
                  color:      model === "think" ? "var(--brand-purple)" : "var(--t3)",
                }}
                onMouseEnter={e => {
                  if (model !== "think") {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border-md)"; el.style.color = "var(--t1)";
                  }
                }}
                onMouseLeave={e => {
                  if (model !== "think") {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)"; el.style.color = "var(--t3)";
                  }
                }}
              >
                <span className="flex">{activeModel.icon}</span>
                <span className="hidden sm:inline">{activeModel.label}</span>
                <ChevronDown
                  size={10}
                  style={{
                    opacity: 0.6,
                    transition: "transform 150ms",
                    transform: modelOpen ? "rotate(180deg)" : "none",
                  }}
                />
              </button>

              {modelOpen && (
                <div
                  className="absolute bottom-full mb-2 right-0 w-48 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-md)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}
                >
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { onModelChange(m.id); setModelOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
                      style={{
                        background: model === m.id ? "var(--bg-hover)" : "transparent",
                        color: "var(--t2)",
                      }}
                      onMouseEnter={e => {
                        if (model !== m.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                      }}
                      onMouseLeave={e => {
                        if (model !== m.id) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span className="shrink-0" style={{ color: m.id === "think" ? "var(--brand-purple)" : "var(--t3)" }}>
                        {m.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium leading-none mb-0.5">{m.label}</p>
                        <p className="text-[10px]" style={{ color: "var(--t4)" }}>{m.desc}</p>
                      </div>
                      {model === m.id && <Check size={11} style={{ color: "var(--brand-purple)" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send / Stop */}
            {isLoading ? (
              <button
                type="button" onClick={onStop}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}
                title="Stop generating"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--brand-red-bg)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-red-border)"; (e.currentTarget as HTMLElement).style.color = "var(--brand-red)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              >
                <Square size={10} fill="currentColor" strokeWidth={0} />
              </button>
            ) : (
              <button
                type="submit" disabled={!canSubmit}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
                style={canSubmit
                  ? { background: "var(--t1)", color: "var(--bg-page)" }
                  : { background: "var(--bg-card)", color: "var(--t5)", cursor: "default" }}
              >
                <ArrowUp size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt,.md,.csv,.json"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <style>{"textarea::placeholder { color: var(--placeholder); }"}</style>

      <p className="hidden sm:block text-center text-[10px] mt-2 select-none" style={{ color: "var(--t5)" }}>
        {isLoading ? "stop to cancel  |  Shift+Enter new line" : "Enter to send  |  Shift+Enter new line"}
      </p>
    </form>
  );
}
