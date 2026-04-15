"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface OmniBarProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  autoFocus?: boolean;
}

export default function OmniBar({ onGenerate, isLoading, autoFocus }: OmniBarProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, []);

  useEffect(() => { resize(); }, [prompt, resize]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const submit = useCallback(() => {
    const val = prompt.trim();
    if (!val || isLoading) return;
    onGenerate(val);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [prompt, isLoading, onGenerate]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSubmit = !!prompt.trim() && !isLoading;

  return (
    <form
      onSubmit={e => { e.preventDefault(); submit(); }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className="flex items-end gap-2.5 px-4 py-3 rounded-2xl transition-all duration-150"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          outline: "none",
        }}
        onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; }}
        onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={onKey}
          disabled={isLoading}
          placeholder="Ask anything or describe what to build…"
          className="flex-1 bg-transparent text-[15px] leading-relaxed resize-none outline-none disabled:opacity-40 min-h-[24px]"
          style={{
            color: "var(--t1)",
            caretColor: "var(--t1)",
            maxHeight: "180px",
          }}
          onFocus={e => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--border-hi)"; }}
          onBlur={e => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--border)"; }}
        />
        {/* Placeholder workaround for CSS vars */}
        <style>{`textarea::placeholder { color: var(--placeholder); }`}</style>

        <button
          type="submit"
          disabled={!canSubmit}
          className="shrink-0 mb-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
          style={canSubmit
            ? { background: "var(--t1)", color: "var(--bg-page)" }
            : { background: "var(--bg-card)", color: "var(--t5)", cursor: "default" }
          }
        >
          {isLoading
            ? <Loader2 size={13} className="animate-spin" style={{ color: "var(--t4)" }} />
            : <ArrowUp size={14} strokeWidth={2.5} />}
        </button>
      </div>

      <p className="hidden sm:block text-center text-[10px] tracking-wide mt-1.5 select-none" style={{ color: "var(--t5)" }}>
        Enter ↵ to send · Shift+Enter for new line
      </p>
    </form>
  );
}
