"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SEEN_KEY = "morph_tutorial_seen";

export default function TutorialBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname === "/" || pathname === "/new") {
      try {
        if (!localStorage.getItem(SEEN_KEY)) setShow(true);
      } catch {}
    }
  }, [pathname]);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1], delay: 1.2 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] right-4 sm:bottom-10 sm:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-md)",
            maxWidth: 260,
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--brand-purple-bg)", border: "1px solid var(--brand-purple-border)" }}>
            <BookOpen size={14} style={{ color: "var(--brand-purple)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-tight mb-0.5" style={{ color: "var(--t1)" }}>
              New to Morph OS?
            </p>
            <Link href="/tutorial" onClick={dismiss}>
              <span className="text-[11px] leading-none cursor-pointer transition-colors"
                style={{ color: "var(--t4)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}>
                Take a quick tour →
              </span>
            </Link>
          </div>
          <button onClick={dismiss}
            className="w-5 h-5 flex items-center justify-center rounded-full shrink-0 transition-colors"
            style={{ color: "var(--t5)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}>
            <X size={11} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
