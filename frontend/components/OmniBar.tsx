"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowUp, Square, Paperclip, X, FileText } from "lucide-react";

interface OmniBarProps {
  onGenerate: (prompt: string, file?: File | null) => void;
  onStop?: () => void;
  isLoading: boolean;
  autoFocus?: boolean;
}

export default function OmniBar({ onGenerate, onStop, isLoading, autoFocus }: OmniBarProps) {
  const [prompt,     setPrompt]     = useState("");
  const [file,       setFile]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [focused,    setFocused]    = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => { resize(); }, [prompt, resize]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [prompt, file, isLoading, onGenerate, clearFile]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const canSubmit = (!!(prompt.trim() || file)) && !isLoading;

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const borderColor = isDragging
    ? "var(--border-hi)"
    : focused
    ? "var(--border-md)"
    : "var(--border)";

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className="w-full max-w-2xl mx-auto">

      {/* File preview chip — sits above the bar */}
      {file && (
        <div className="mb-2 px-1">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px]"
            style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.15)" }}
          >
            {previewUrl
              ? <img src={previewUrl} alt="" className="w-5 h-5 rounded-lg object-cover shrink-0" />
              : <FileText size={12} style={{ color: "rgba(192,132,252,0.7)" }} className="shrink-0" />}
            <span className="truncate" style={{ color: "var(--t2)", maxWidth: "200px" }}>{file.name}</span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            >
              <X size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Single-row bar */}
      <div
        className="flex items-center gap-1.5 rounded-2xl px-2 py-1.5 transition-all duration-150"
        style={{
          background: "var(--bg-input)",
          border: `1px solid ${borderColor}`,
          boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.08)" : "none",
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Paperclip */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 transition-all duration-150 disabled:opacity-30"
          style={{ color: "var(--t4)" }}
          title="Attach file"
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-hover)"; el.style.color = "var(--t2)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--t4)"; }}
        >
          <Paperclip size={15} />
        </button>

        {/* Textarea — expands vertically */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={onKey}
          disabled={isLoading}
          placeholder={file ? "Ask about this file…" : "Ask anything, build a tool, or open an app…"}
          className="flex-1 bg-transparent text-[15px] resize-none outline-none disabled:opacity-40"
          style={{
            color: "var(--t1)",
            caretColor: "var(--t1)",
            lineHeight: "1.5",
            minHeight: "22px",
            maxHeight: "200px",
            paddingTop: "3px",
          }}
        />

        {/* Stop / Send */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90"
            style={{ background: "var(--t1)", color: "var(--bg-page)" }}
            title="Stop"
          >
            <Square size={11} fill="currentColor" strokeWidth={0} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90"
            style={canSubmit
              ? { background: "var(--t1)", color: "var(--bg-page)" }
              : { background: "var(--bg-card)", color: "var(--t5)", cursor: "default" }}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt,.md,.csv,.json"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <style>{`textarea::placeholder { color: var(--placeholder); }`}</style>

      <p className="hidden sm:block text-center text-[10px] tracking-wide mt-2 select-none" style={{ color: "var(--t5)" }}>
        {isLoading
          ? "Click ■ to stop · Shift+Enter for new line"
          : "Enter ↵ to send · Shift+Enter for new line · Drop files to attach"}
      </p>
    </form>
  );
}
