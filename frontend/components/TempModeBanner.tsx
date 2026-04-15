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
        className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#111] border border-yellow-500/20 rounded-2xl shadow-2xl shadow-black/40 max-w-[92vw] sm:max-w-md"
        style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <CloudOff size={15} className="text-yellow-500/70 shrink-0" />

        <p className="text-xs text-white/50 leading-snug">
          <span className="text-yellow-400/80 font-medium">Temporary mode</span>
          {" "}— nothing is saved. Your morphs vanish when you close the tab.
        </p>

        <button
          onClick={() => signIn("google")}
          className="shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-wider bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all whitespace-nowrap"
        >
          Sign in
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-white/20 hover:text-white/50 transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
