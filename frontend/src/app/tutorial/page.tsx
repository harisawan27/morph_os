"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ghost, Sparkles, MessageSquare, Bot,
  ChevronLeft, ChevronRight, Check, Cloud, Clock,
  Hash, Plus, Trophy, Pencil,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SEEN_KEY = "morph_tutorial_seen";

// ── Slide Visuals ─────────────────────────────────────────────────────────────

function VisualWelcome() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-full">
      <motion.div className="relative"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <div className="absolute inset-0 rounded-full blur-3xl opacity-50"
          style={{ background: "rgba(139,92,246,0.6)", transform: "scale(1.8)" }} />
        <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.38),rgba(79,70,229,0.28))", border: "1px solid rgba(139,92,246,0.45)" }}>
          <Ghost size={38} style={{ color: "#c4b5fd" }} />
        </div>
      </motion.div>
      <div className="flex gap-2 flex-wrap justify-center">
        {["Chat", "Build", "Play", "Create", "Explore"].map((word, i) => (
          <motion.span key={word}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="px-3 py-1 rounded-full text-[11px] font-medium"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)" }}>
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function VisualChat() {
  const msgs = [
    { r: "u", t: "Build me a pomodoro timer" },
    { r: "a", t: "Done — 25 min focus, 5 min break, with sound alerts. Fully interactive." },
    { r: "u", t: "Make the break 10 minutes" },
  ];
  return (
    <div className="flex flex-col justify-end gap-2 h-full px-2 pb-3">
      {msgs.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.18 }}
          className={`flex ${m.r === "u" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[82%] px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed"
            style={m.r === "u"
              ? { background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.28)", color: "var(--t2)" }
              : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}>
            {m.t}
          </div>
        </motion.div>
      ))}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="flex justify-start">
        <div className="flex items-center gap-1 px-3 py-2 rounded-2xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--t4)" }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function VisualCanvas() {
  return (
    <div className="flex gap-2.5 h-full p-1">
      <div className="flex-1 rounded-2xl flex flex-col justify-end gap-2 p-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex-1 flex flex-col justify-end space-y-1.5">
          {[75, 100, 55].map((w, i) => (
            <div key={i} className="h-2 rounded-full" style={{ background: "var(--bg-input)", width: `${w}%` }} />
          ))}
        </div>
        <div className="h-8 rounded-xl flex items-center px-2.5 gap-2"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }} />
          <div className="w-5 h-5 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.28)" }}>
            <Sparkles size={9} style={{ color: "#a78bfa" }} />
          </div>
        </div>
      </div>
      <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid rgba(59,130,246,0.28)" }}>
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 35%,rgba(59,130,246,0.18),transparent 65%)" }} />
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
          className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.3)" }}>
          <Sparkles size={18} style={{ color: "#60a5fa" }} />
        </motion.div>
        <div className="relative z-10 space-y-1.5 w-full px-4">
          <div className="h-1.5 rounded-full" style={{ background: "rgba(59,130,246,0.18)" }} />
          <div className="h-1.5 rounded-full mx-4" style={{ background: "rgba(59,130,246,0.11)" }} />
        </div>
        <div className="absolute bottom-2 right-3 text-[8px] uppercase tracking-widest"
          style={{ color: "rgba(96,165,250,0.45)" }}>Canvas</div>
      </div>
    </div>
  );
}

function VisualVault() {
  const apps = [
    { icon: <Trophy size={14} />, label: "Chess",     bg: "rgba(139,92,246,0.18)", b: "rgba(139,92,246,0.3)",  c: "#a78bfa" },
    { icon: <Cloud   size={14} />, label: "Weather",  bg: "rgba(59,130,246,0.15)",  b: "rgba(59,130,246,0.28)", c: "#60a5fa" },
    { icon: <Clock   size={14} />, label: "Pomodoro", bg: "rgba(16,185,129,0.15)",  b: "rgba(16,185,129,0.26)", c: "#34d399" },
    { icon: <Check   size={14} />, label: "Habits",   bg: "rgba(245,158,11,0.14)",  b: "rgba(245,158,11,0.25)", c: "#fbbf24" },
    { icon: <Pencil  size={14} />, label: "Notes",    bg: "rgba(236,72,153,0.12)",  b: "rgba(236,72,153,0.22)", c: "#f472b6" },
    { icon: <Plus    size={14} />, label: "+29 more", bg: "var(--bg-input)",         b: "var(--border)",         c: "var(--t4)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 content-center h-full p-1">
      {apps.map((a, i) => (
        <motion.div key={a.label}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.07 }}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl"
          style={{ background: a.bg, border: `1px solid ${a.b}` }}>
          <span style={{ color: a.c }}>{a.icon}</span>
          <span className="text-[9px] font-medium" style={{ color: a.c }}>{a.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualLibrary() {
  const items = [
    { title: "Build me a pomodoro timer", time: "2h ago" },
    { title: "Chess strategy for beginners", time: "Yesterday" },
    { title: "Custom weather dashboard", time: "3 days ago" },
  ];
  return (
    <div className="flex flex-col gap-2.5 justify-center h-full px-1">
      {items.map((item, i) => (
        <motion.div key={item.title}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.14 }}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.22)" }}>
            <MessageSquare size={11} style={{ color: "#a78bfa" }} />
          </div>
          <span className="text-[11px] flex-1 truncate" style={{ color: "var(--t2)" }}>{item.title}</span>
          <span className="text-[9px] shrink-0" style={{ color: "var(--t5)" }}>{item.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualTips() {
  return (
    <div className="flex flex-col gap-3 justify-center h-full px-1">
      <div className="px-4 py-3 rounded-2xl"
        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.2)" }}>
            <span className="text-[9px] font-bold" style={{ color: "#f87171" }}>✕</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(248,113,113,0.6)" }}>Too vague</span>
        </div>
        <p className="text-[12px]" style={{ color: "var(--t3)" }}>"make a habit app"</p>
      </div>
      <div className="px-4 py-3 rounded-2xl"
        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.2)" }}>
            <Check size={9} style={{ color: "#34d399" }} />
          </div>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(52,211,153,0.7)" }}>Specific</span>
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--t2)" }}>
          "Build a habit tracker with daily streaks, a weekly heatmap, and a completion sound"
        </p>
      </div>
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: "welcome", tag: "Welcome", dot: "#a78bfa",
    headline: "Meet Morph OS",
    body: "Morph OS is an AI-powered operating system that lives in your browser. Ask it anything — it builds real apps, tools, and answers live, right in front of you.",
    Visual: VisualWelcome,
  },
  {
    id: "chat", tag: "Step 1", dot: "#60a5fa",
    headline: "Just Start Talking",
    body: "Type anything in the chat bar at the bottom. Ask a question, describe what you need, or request a tool. Morph OS understands plain language — no commands needed.",
    Visual: VisualChat,
  },
  {
    id: "canvas", tag: "Step 2", dot: "#34d399",
    headline: "Watch It Build Live",
    body: "When Morph OS creates an app or tool for you, it appears in the Canvas panel on the right. It's fully interactive — click it, type in it, play it.",
    Visual: VisualCanvas,
  },
  {
    id: "vault", tag: "Step 3", dot: "#fbbf24",
    headline: "Explore The Vault",
    body: "The Vault holds 34+ pre-built apps ready to open instantly — Chess, Checkers, Snake, Weather, Pomodoro, Habits, Notes, Diary, and many more.",
    Visual: VisualVault,
  },
  {
    id: "library", tag: "Step 4", dot: "#f472b6",
    headline: "Everything is Saved",
    body: "Every conversation lives in My Library. Sign in with Google and it syncs across all your devices — pick up any session, anytime.",
    Visual: VisualLibrary,
  },
  {
    id: "tips", tag: "Pro Tip", dot: "#f87171",
    headline: "Be Specific, Get Magic",
    body: "The more detail you give, the better the result. \"Build a habit tracker with daily streaks, a weekly heatmap, and a completion sound\" beats \"make a habit app\" every time.",
    Visual: VisualTips,
  },
];

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 44 : -44, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? -44 : 44, opacity: 0 }),
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TutorialPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const total = SLIDES.length;
  const slide = SLIDES[idx];
  const { Visual } = slide;

  const go = useCallback((nextIdx: number, d: number) => {
    setDir(d);
    setIdx(nextIdx);
  }, []);

  const prev = useCallback(() => { if (idx > 0) go(idx - 1, -1); }, [idx, go]);
  const next = useCallback(() => {
    if (idx < total - 1) go(idx + 1, 1);
    else {
      localStorage.setItem(SEEN_KEY, "1");
      router.push("/");
    }
  }, [idx, total, go, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Mark as seen when page is visited
  useEffect(() => {
    localStorage.setItem(SEEN_KEY, "1");
  }, []);

  const isLast = idx === total - 1;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-16 md:pt-12 pb-12">

        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <div className="flex items-center gap-1 text-xs transition-colors cursor-pointer"
              style={{ color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}>
              <ChevronLeft size={14} />
              <span>Back</span>
            </div>
          </Link>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t5)" }}>
            {idx + 1} / {total}
          </span>
        </div>

        {/* Visual card */}
        <div className="rounded-3xl overflow-hidden mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", height: "clamp(160px, 28vw, 220px)" }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={slide.id} custom={dir} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              className="w-full h-full p-4">
              <Visual />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={`text-${slide.id}`} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className="mb-8 space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: slide.dot }}>
              {slide.tag}
            </p>
            <h1 className="text-2xl font-light tracking-tight" style={{ color: "var(--t1)" }}>
              {slide.headline}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--t3)" }}>
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button key={s.id}
                onClick={() => go(i, i > idx ? 1 : -1)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx ? slide.dot : "var(--border-md)",
                }}
              />
            ))}
          </div>

          {/* Prev + Next/Done */}
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={prev}
                className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t1)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t3)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; }}>
                <ChevronLeft size={16} />
              </button>
            )}
            <button onClick={next}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.97]"
              style={isLast
                ? { background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)", color: "#c4b5fd" }
                : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
              onMouseLeave={e => {
                if (isLast) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.18)";
                  (e.currentTarget as HTMLElement).style.color = "#c4b5fd";
                } else {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                  (e.currentTarget as HTMLElement).style.color = "var(--t2)";
                }
              }}>
              {isLast
                ? <><Check size={14} /> Get Started</>
                : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>

        </div>

        {/* Skip link on first slide */}
        {idx === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-center mt-6">
            <Link href="/">
              <span className="text-[11px] cursor-pointer transition-colors"
                style={{ color: "var(--t5)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}>
                Skip tutorial
              </span>
            </Link>
          </motion.div>
        )}

      </div>
    </div>
  );
}
