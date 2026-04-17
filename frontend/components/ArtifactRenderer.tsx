"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Runner } from "react-runner";
import * as lucideReact from "lucide-react";
import * as framerMotion from "framer-motion";
import { X, Sparkles, ChevronLeft, Activity, Cloud } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const BASE_SCOPE = {
  React,
  ...React,
  ...lucideReact,
  ...framerMotion,
  motion: framerMotion.motion,
  AnimatePresence: framerMotion.AnimatePresence,
  MORPH_API_URL: API,
};

interface ArtifactRendererProps {
  code: string;
  artifactId?: string | null;
  onClose?: () => void;   // desktop — collapses the panel
  onBack?:  () => void;   // mobile  — goes back to chat view
}

export default function ArtifactRenderer({
  code: initialCode,
  artifactId,
  onClose,
  onBack,
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

      {/* ── Toolbar ── always dark, independent of app theme ───────────── */}
      <div className={`morph-static-dark flex items-center justify-between border-b border-white/[0.05] bg-black/90 backdrop-blur-2xl shrink-0 ${isMobile ? "px-3 py-3" : "px-5 py-3.5"}`}>

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
        <div className="w-full h-full overflow-auto">
          <Runner
            code={sanitizedCode}
            scope={scope}
            onRendered={(err) => setError(err ? err.toString() : null)}
          />
        </div>

        {/* Error HUD */}
        {error && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-red-950/90 border border-red-500/25 backdrop-blur-2xl p-4 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3 text-red-400">
              <div className="p-1.5 bg-red-500/15 rounded-xl shrink-0">
                <Activity size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Runtime Error</p>
                <p className="text-xs font-mono opacity-70 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar — desktop only, always dark ─────────────────────── */}
      {!isMobile && (
        <div className="morph-static-dark px-5 py-2 border-t border-white/[0.04] bg-black/90 text-[7px] text-white/15 uppercase tracking-[0.3em] flex justify-between shrink-0">
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
