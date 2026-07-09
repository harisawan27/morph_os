"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Runner } from "react-runner";
import * as lucideReact from "lucide-react";
import * as framerMotion from "framer-motion";
import { X, Sparkles, ChevronLeft, Cloud, RefreshCw, Ghost, MessageSquare } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

import { useCloudStorage } from "../src/hooks/useCloudStorage";

const BASE_SCOPE = {
  React,
  ...React,
  ...lucideReact,
  ...framerMotion,
  motion: framerMotion.motion,
  AnimatePresence: framerMotion.AnimatePresence,
  MORPH_API_URL: API,
  useCloudStorage,
};

interface ArtifactRendererProps {
  code: string;
  artifactId?: string | null;
  onClose?:      () => void;   // desktop — collapses the panel
  onBack?:       () => void;   // mobile  — goes back to chat view
  onRegenerate?: () => void;   // re-fires the last prompt
}

export default function ArtifactRenderer({
  code: initialCode,
  artifactId,
  onClose,
  onBack,
  onRegenerate,
}: ArtifactRendererProps) {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [error,       setError]       = useState<string | null>(null);
  const [synced,      setSynced]      = useState(false);

  useEffect(() => {
    setCurrentCode(initialCode);
    setError(null);
    setSynced(false);
  }, [initialCode]);

  // Strip ES6 import statements — all dependencies are already in scope.
  // react-runner has no module system, so imports cause a SyntaxError.
  const sanitizedCode = useMemo(() => {
    return currentCode
      // [^;]* matches newlines too (char class), so this handles both single-line
      // and multi-line imports that end with a semicolon.
      .replace(/^import\b[^;]*;/gm, '')
      // Catch single-line imports that have no trailing semicolon.
      .replace(/^import\b[^\n]*$/gm, '')
      .trim();
  }, [currentCode]);

  const scope = useMemo(() => {
    if (!artifactId) return BASE_SCOPE;

    const morphSaveState = async (state: unknown) => {
      try {
        await fetch(`${API}/api/artifacts/${artifactId}/state`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
        setSynced(true);
        setTimeout(() => setSynced(false), 2000);
      } catch {}
    };

    const morphLoadState = async () => {
      try {
        const res = await fetch(`${API}/api/artifacts/${artifactId}/state`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          return data.state ?? null;
        }
      } catch {}
      return null;
    };

    return { ...BASE_SCOPE, morphSaveState, morphLoadState };
  }, [artifactId]);

  const isMobile = !!onBack; // mobile when onBack is provided

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between border-b shrink-0 backdrop-blur-2xl ${isMobile ? "px-3 py-3" : "px-5 py-3.5"}`}
        style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
      >

        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/40 hover:text-white transition-colors pr-1 active:scale-95"
            >
              <ChevronLeft size={18} />
              <span className="text-[11px] font-medium">Chat</span>
            </button>
          )}

          {/* Icon + title */}
          <div className={`p-1.5 bg-blue-500/10 rounded-xl border border-blue-500/15 ${isMobile ? "" : ""}`}>
            <Sparkles size={isMobile ? 14 : 16} className="text-blue-400" />
          </div>
          <div className="leading-none">
            <p className={`font-medium tracking-tight text-white/85 ${isMobile ? "text-[12px]" : "text-sm"}`}>
              {isMobile ? "Canvas" : "Generative Product"}
            </p>
            {!isMobile && (
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/25 mt-0.5">Sandbox Active</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud sync indicator — desktop only */}
          {artifactId && !isMobile && (
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] uppercase tracking-widest font-bold transition-colors duration-500 ${
              synced ? "border-green-500/20 text-green-500/50" : "border-white/[0.05] text-white/18"
            }`}>
              <Cloud size={8} />
              {synced ? "Synced" : "Ready"}
            </div>
          )}

          {/* Desktop close */}
          {onClose && !isMobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/5 text-white/20 hover:text-white/70 transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Artifact content — theme-responsive ────────────────────────── */}
      <div className="flex-1 overflow-hidden relative" style={{ background: "var(--bg-page)" }}>

        {/* Hidden runner always evaluates the code so onRendered fires */}
        <div className={`w-full h-full overflow-auto ${error ? "hidden" : ""}`}>
          <Runner
            code={sanitizedCode}
            scope={scope}
            onRendered={(err) => setError(err ? err.toString() : null)}
          />
        </div>

        {/* Friendly fallback — replaces the canvas on error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8"
            style={{ background: "var(--bg-page)" }}>

            {/* Animated ghost icon */}
            <div className="relative mb-6">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30 pointer-events-none"
                style={{ background: "rgba(239,68,68,0.5)", transform: "scale(2)" }}
              />
              <div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))",
                  border: "1px solid rgba(239,68,68,0.25)",
                  animation: "artifact-float 3s ease-in-out infinite",
                }}
              >
                <Ghost size={28} style={{ color: "rgba(248,113,113,0.8)" }} />
              </div>
            </div>

            {/* Message */}
            <h3 className="text-base sm:text-lg font-semibold text-center mb-2 leading-snug"
              style={{ color: "var(--t1)" }}>
              Artifact didn&apos;t quite click
            </h3>
            <p className="text-[12px] sm:text-[13px] text-center leading-relaxed mb-6 max-w-xs"
              style={{ color: "var(--t3)" }}>
              The generated code hit a snag during render. Try asking again — Morph will take another shot.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 active:scale-95"
                  style={{
                    background: "rgba(139,92,246,0.15)",
                    border: "1px solid rgba(139,92,246,0.28)",
                    color: "#c4b5fd",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.22)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.15)"; }}
                >
                  <RefreshCw size={13} />
                  Try Again
                </button>
              )}
              {(onBack || onClose) && (
                <button
                  onClick={onBack ?? onClose}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 active:scale-95"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--t3)",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-md)"; el.style.color = "var(--t1)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--t3)"; }}
                >
                  <MessageSquare size={13} />
                  Back to Chat
                </button>
              )}
            </div>

            {/* Collapsible technical detail for devs */}
            <details className="mt-6 w-full max-w-sm">
              <summary
                className="text-[10px] uppercase tracking-widest cursor-pointer select-none text-center"
                style={{ color: "var(--t5)" }}
              >
                Show error detail
              </summary>
              <div
                className="mt-2 px-3 py-2.5 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--t4)",
                  wordBreak: "break-all",
                }}
              >
                {error}
              </div>
            </details>
          </div>
        )}
      </div>

      <style>{`
        @keyframes artifact-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>

      {/* ── Status bar — desktop only ──────────────────────────────────── */}
      {!isMobile && (
        <div
          className="px-5 py-2 border-t text-[7px] uppercase tracking-[0.3em] flex justify-between shrink-0"
          style={{ background: "var(--bg-panel)", borderColor: "var(--border)", color: "var(--t4)" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-blue-500/60 animate-pulse" />
            MORPH OS · ZERO LAG ENGINE
          </div>
          <span>EST 0.0s</span>
        </div>
      )}
    </div>
  );
}
