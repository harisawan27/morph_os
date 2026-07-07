"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, X } from "lucide-react";
import { useState } from "react";

export default function TempModeBanner() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(false);

  // Don't show while loading or if signed in or dismissed
  if (status === "loading" || session || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ delay: 1, duration: 0.3 }}
        className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 py-3 rounded-2xl shadow-xl w-[92vw] sm:w-auto sm:max-w-xl bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] sm:bottom-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--brand-amber-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <CloudOff size={15} style={{ color: "var(--brand-amber-muted)" }} className="shrink-0" />
          <p className="text-xs leading-snug text-left" style={{ color: "var(--t2)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-amber-muted)" }}>Temporary mode</span>
            {" "}— nothing is saved. Your morphs vanish when you close the tab.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start">
          <button
            onClick={() => signIn("google")}
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-xl transition-all whitespace-nowrap font-medium cursor-pointer"
            style={{
              background: "var(--bg-active)",
              border: "1px solid var(--border-md)",
              color: "var(--t1)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
          >
            Sign in
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 transition-colors cursor-pointer shrink-0"
            style={{ color: "var(--t4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
