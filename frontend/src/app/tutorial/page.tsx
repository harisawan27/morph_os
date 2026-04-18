"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ghost, ChevronLeft, ChevronRight, Check,
  ArrowUp, FileText, Paperclip, Sun, Moon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SEEN_KEY = "morph_tutorial_seen";

// ─── Visual Components ────────────────────────────────────────────────────────

function VisualWelcome() {
  const caps = [
    { label: "Chat & Ask",   bg: "rgba(139,92,246,0.18)", b: "rgba(139,92,246,0.32)", c: "#c4b5fd" },
    { label: "Build Apps",   bg: "rgba(59,130,246,0.15)",  b: "rgba(59,130,246,0.28)", c: "#60a5fa" },
    { label: "Play Games",   bg: "rgba(16,185,129,0.14)",  b: "rgba(16,185,129,0.26)", c: "#34d399" },
    { label: "Get Answers",  bg: "rgba(245,158,11,0.13)",  b: "rgba(245,158,11,0.26)", c: "#fbbf24" },
    { label: "Create Tools", bg: "rgba(236,72,153,0.12)",  b: "rgba(236,72,153,0.24)", c: "#f472b6" },
  ];
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-full">
      <motion.div className="relative"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <div className="absolute inset-0 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: "rgba(139,92,246,0.7)", transform: "scale(2.2)" }} />
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.4),rgba(79,70,229,0.28))", border: "1px solid rgba(139,92,246,0.5)" }}>
          <Ghost size={34} style={{ color: "#c4b5fd" }} />
        </div>
      </motion.div>
      <div className="flex flex-wrap gap-2 justify-center">
        {caps.map((c, i) => (
          <motion.span key={c.label}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.09 }}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.c }}>
            {c.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function VisualChat() {
  const exchanges = [
    { q: "Who invented the internet?",          a: "Vint Cerf and Bob Kahn developed TCP/IP in 1974 — the foundation of the modern internet." },
    { q: "What's 18% of 240?",                  a: "That's 43.2" },
    { q: "Write a haiku about debugging code",   a: "Error on line nine / The semicolon hides well / Coffee, then it works" },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % exchanges.length), 2800);
    return () => clearInterval(t);
  }, [exchanges.length]);

  return (
    <div className="flex flex-col gap-3 h-full justify-center px-1">
      <AnimatePresence mode="wait">
        <motion.div key={active}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-2">
          <div className="flex justify-end">
            <div className="max-w-[80%] px-3.5 py-2 rounded-2xl rounded-tr-sm text-[11px] leading-relaxed"
              style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.28)", color: "var(--t2)" }}>
              {exchanges[active].q}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tl-sm text-[11px] leading-relaxed"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}>
              {exchanges[active].a}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center gap-1.5">
        {exchanges.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300"
            style={{ width: i === active ? 16 : 5, height: 5, background: i === active ? "#a78bfa" : "var(--border-md)" }} />
        ))}
      </div>
    </div>
  );
}

function VisualBuild() {
  const fullPrompt = "Build me a pomodoro timer";
  const [phase, setPhase] = useState<"type" | "build" | "done">("type");
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "type" && typed < fullPrompt.length) {
      t = setTimeout(() => setTyped(p => p + 1), 55);
    } else if (phase === "type" && typed === fullPrompt.length) {
      t = setTimeout(() => setPhase("build"), 500);
    } else if (phase === "build") {
      t = setTimeout(() => setPhase("done"), 1600);
    } else if (phase === "done") {
      t = setTimeout(() => { setPhase("type"); setTyped(0); }, 2800);
    }
    return () => clearTimeout(t);
  }, [phase, typed, fullPrompt.length]);

  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="px-3 py-2.5 rounded-2xl flex items-center gap-2"
        style={{ background: "var(--bg-card)", border: `1px solid ${phase === "type" && typed === fullPrompt.length ? "var(--border-md)" : "var(--border)"}` }}>
        <span className="text-[11px] flex-1 min-w-0" style={{ color: "var(--t2)" }}>
          {phase === "type"
            ? <>{fullPrompt.slice(0, typed)}<span className="inline-block w-0.5 h-3 ml-0.5 align-middle" style={{ background: "var(--t2)", animation: "pulse 1s infinite" }} /></>
            : fullPrompt}
        </span>
        <div className="w-6 h-6 rounded-xl shrink-0 flex items-center justify-center transition-all"
          style={phase === "type" && typed === fullPrompt.length
            ? { background: "var(--t1)", color: "var(--bg-page)" }
            : { background: "var(--bg-input)", color: "var(--t4)" }}>
          <ArrowUp size={11} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "build" && (
          <motion.div key="building"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-3 py-2.5 rounded-2xl flex items-center gap-2.5"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <motion.div className="w-4 h-4 rounded-full border-2 shrink-0"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#a78bfa" }} />
            <span className="text-[11px]" style={{ color: "#c4b5fd" }}>Building canvas…</span>
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-2">
            <div className="px-3 py-2 rounded-2xl text-[11px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}>
              Done! Your Pomodoro timer is ready →
            </div>
            <div className="h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.14),rgba(79,70,229,0.09))", border: "1px solid rgba(139,92,246,0.22)" }}>
              <div className="text-center">
                <div className="text-[24px] font-mono font-bold" style={{ color: "#c4b5fd" }}>25:00</div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(196,181,253,0.45)" }}>Focus Mode</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VisualCanvas() {
  return (
    <div className="flex gap-2 h-full">
      {/* Chat panel */}
      <div className="flex-[3] flex flex-col gap-2 rounded-2xl p-2.5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex-1 flex flex-col justify-end gap-1.5">
          {[
            { t: "Build a countdown timer", u: true },
            { t: "Here it is, fully interactive →", u: false },
          ].map((m, i) => (
            <div key={i} className={`text-[9px] px-2.5 py-1.5 rounded-xl max-w-[88%] ${m.u ? "self-end" : "self-start"}`}
              style={m.u
                ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.28)", color: "var(--t2)" }
                : { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t3)" }}>
              {m.t}
            </div>
          ))}
        </div>
        <div className="h-6 rounded-xl" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }} />
      </div>

      {/* Divider */}
      <div className="w-px self-stretch my-1 rounded-full" style={{ background: "var(--border)" }} />

      {/* Canvas panel */}
      <div className="flex-[4] rounded-2xl flex flex-col items-center justify-center gap-2.5 relative overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid rgba(59,130,246,0.28)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.12), transparent 65%)" }} />
        <motion.div
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 text-[28px] font-mono font-bold" style={{ color: "#60a5fa" }}>
          00:42
        </motion.div>
        <div className="relative z-10 flex gap-1.5">
          {["Start", "Reset"].map((btn, i) => (
            <div key={btn} className="px-2.5 py-1 rounded-lg text-[9px]"
              style={i === 0
                ? { background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }
                : { background: "var(--bg-input)", color: "var(--t4)", border: "1px solid var(--border)" }}>
              {btn}
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 right-3 text-[8px] uppercase tracking-widest"
          style={{ color: "rgba(96,165,250,0.4)" }}>Canvas</div>
      </div>
    </div>
  );
}

function VisualEdit() {
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setEdited(true),  1000);
    const t2 = setTimeout(() => setEdited(false), 3200);
    const t3 = setTimeout(() => setEdited(true),  4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="flex justify-end">
        <div className="px-3.5 py-2 rounded-2xl rounded-tr-sm text-[11px] leading-relaxed"
          style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.28)", color: "var(--t2)" }}>
          Make it dark mode and add a reset button
        </div>
      </div>
      <motion.div
        animate={{
          background: edited ? "rgba(16,185,129,0.07)" : "rgba(59,130,246,0.07)",
          borderColor: edited ? "rgba(16,185,129,0.22)" : "rgba(59,130,246,0.22)",
        }}
        className="rounded-2xl p-3 flex items-center justify-between"
        style={{ border: "1px solid" }}>
        <div>
          <div className="text-[8px] uppercase tracking-widest mb-2"
            style={{ color: edited ? "rgba(52,211,153,0.7)" : "rgba(96,165,250,0.7)" }}>
            {edited ? "✓ Updated" : "Before"}
          </div>
          <motion.div animate={{ color: edited ? "#34d399" : "#60a5fa" }}
            className="text-[24px] font-mono font-bold">
            25:00
          </motion.div>
        </div>
        <AnimatePresence mode="wait">
          {edited ? (
            <motion.div key="after" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5">
              <div className="px-2.5 py-1 rounded-lg text-[9px] text-center"
                style={{ background: "rgba(16,185,129,0.18)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                Start
              </div>
              <div className="px-2.5 py-1 rounded-lg text-[9px] text-center"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.22)" }}>
                Reset
              </div>
            </motion.div>
          ) : (
            <motion.div key="before" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-2.5 py-1 rounded-lg text-[9px]"
              style={{ background: "rgba(59,130,246,0.18)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.28)" }}>
              Start
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="text-[10px] text-center" style={{ color: "var(--t4)" }}>
        Live edit — no full rebuild needed
      </div>
    </div>
  );
}

function VisualVault() {
  const apps = [
    { icon: "♟", label: "Chess",    bg: "rgba(139,92,246,0.16)", b: "rgba(139,92,246,0.28)", c: "#a78bfa" },
    { icon: "🌤", label: "Weather", bg: "rgba(59,130,246,0.13)",  b: "rgba(59,130,246,0.25)", c: "#60a5fa" },
    { icon: "⏱", label: "Pomodoro",bg: "rgba(16,185,129,0.13)",  b: "rgba(16,185,129,0.24)", c: "#34d399" },
    { icon: "✅", label: "Habits",  bg: "rgba(245,158,11,0.12)",  b: "rgba(245,158,11,0.24)", c: "#fbbf24" },
    { icon: "🐍", label: "Snake",   bg: "rgba(52,211,153,0.12)",  b: "rgba(52,211,153,0.24)", c: "#6ee7b7" },
    { icon: "📝", label: "Notes",   bg: "rgba(236,72,153,0.11)",  b: "rgba(236,72,153,0.22)", c: "#f472b6" },
    { icon: "📊", label: "Charts",  bg: "rgba(251,191,36,0.11)",  b: "rgba(251,191,36,0.22)", c: "#fcd34d" },
    { icon: "🎨", label: "Draw",    bg: "rgba(239,68,68,0.11)",   b: "rgba(239,68,68,0.22)",  c: "#f87171" },
    { icon: "+",  label: "26 more", bg: "var(--bg-input)",        b: "var(--border)",          c: "var(--t4)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 content-center h-full p-1">
      {apps.map((a, i) => (
        <motion.div key={a.label}
          initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl"
          style={{ background: a.bg, border: `1px solid ${a.b}` }}>
          <span className="text-base leading-none">{a.icon}</span>
          <span className="text-[8px] font-medium" style={{ color: a.c }}>{a.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualFiles() {
  const files = [
    { name: "photo.jpg",   type: "Image",      c: "#fbbf24", bg: "rgba(245,158,11,0.11)",  b: "rgba(245,158,11,0.24)" },
    { name: "report.pdf",  type: "Document",   c: "#f87171", bg: "rgba(239,68,68,0.11)",   b: "rgba(239,68,68,0.22)" },
    { name: "dataset.csv", type: "Spreadsheet",c: "#34d399", bg: "rgba(16,185,129,0.11)",  b: "rgba(16,185,129,0.22)" },
  ];
  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="px-3 py-3 rounded-2xl border-dashed border-2 flex items-center gap-3"
        style={{ borderColor: "var(--border-md)" }}>
        <Paperclip size={14} style={{ color: "var(--t4)" }} />
        <div>
          <div className="text-[11px]" style={{ color: "var(--t3)" }}>Attach files to your message</div>
          <div className="text-[9px] mt-0.5" style={{ color: "var(--t5)" }}>Images · PDFs · Text · CSV</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {files.map((f, i) => (
          <motion.div key={f.name}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.14 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: f.bg, border: `1px solid ${f.b}` }}>
            <FileText size={12} style={{ color: f.c }} />
            <span className="text-[11px] flex-1 truncate" style={{ color: f.c }}>{f.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.06)", color: f.c }}>{f.type}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VisualLibrary() {
  const items = [
    { title: "Pomodoro timer",    tag: "Tools",    time: "2h ago",    dot: "#34d399" },
    { title: "Chess opponent",    tag: "Games",    time: "Yesterday", dot: "#a78bfa" },
    { title: "Budget tracker",    tag: "Finance",  time: "3 days",    dot: "#fbbf24" },
    { title: "Pixel art editor",  tag: "Creative", time: "Last week", dot: "#f472b6" },
  ];
  return (
    <div className="flex flex-col gap-2 justify-center h-full px-1">
      {items.map((item, i) => (
        <motion.div key={item.title}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
          <span className="text-[11px] flex-1 truncate" style={{ color: "var(--t2)" }}>{item.title}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t4)" }}>
            {item.tag}
          </span>
          <span className="text-[9px] shrink-0" style={{ color: "var(--t5)" }}>{item.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualSettings() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setDark(p => !p), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="px-3.5 py-3 rounded-2xl flex flex-col gap-2.5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "var(--t4)" }}>Profile</div>
        {[{ label: "Name", val: "Haris" }, { label: "Role", val: "Designer" }, { label: "Tone", val: "Casual" }].map(f => (
          <div key={f.label} className="flex items-center gap-3">
            <span className="text-[10px] w-10 shrink-0" style={{ color: "var(--t4)" }}>{f.label}</span>
            <div className="flex-1 h-6 rounded-lg px-2.5 flex items-center text-[10px]"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t2)" }}>
              {f.val}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl flex items-center justify-between"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {dark
              ? <motion.span key="moon" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}><Moon size={13} style={{ color: "#a78bfa" }} /></motion.span>
              : <motion.span key="sun"  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}><Sun  size={13} style={{ color: "#fbbf24" }} /></motion.span>
            }
          </AnimatePresence>
          <span className="text-[11px]" style={{ color: "var(--t2)" }}>{dark ? "Dark" : "Light"} mode</span>
        </div>
        <motion.div
          animate={{ background: dark ? "rgba(139,92,246,0.22)" : "rgba(245,158,11,0.18)" }}
          transition={{ duration: 0.3 }}
          className="w-10 h-5 rounded-full relative flex items-center"
          style={{ border: `1px solid ${dark ? "rgba(139,92,246,0.4)" : "rgba(245,158,11,0.38)"}` }}>
          <motion.div
            animate={{ x: dark ? 2 : 22 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-3.5 h-3.5 rounded-full absolute"
            style={{ background: dark ? "#a78bfa" : "#fbbf24" }} />
        </motion.div>
      </div>
    </div>
  );
}

function VisualTips() {
  return (
    <div className="flex flex-col gap-2.5 justify-center h-full px-1">
      <div className="px-4 py-3 rounded-2xl"
        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.2)" }}>
            <span className="text-[9px] font-bold" style={{ color: "#f87171" }}>✕</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(248,113,113,0.7)" }}>Too vague</span>
        </div>
        <p className="text-[12px]" style={{ color: "var(--t3)" }}>"make a habit app"</p>
      </div>
      <div className="px-4 py-3 rounded-2xl"
        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)" }}>
        <div className="flex items-center gap-2 mb-2">
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

// ─── Slide data ───────────────────────────────────────────────────────────────

type Slide = {
  id: string; tag: string; dot: string; title: string;
  headline: string; body: string; tips: string[];
  Visual: React.ComponentType;
};

const SLIDES: Slide[] = [
  {
    id: "welcome", tag: "Welcome", dot: "#a78bfa", title: "Intro",
    headline: "Meet Morph OS",
    body: "Morph OS is an AI workspace that lives in your browser. It turns plain language into real, running apps — instantly. Not code snippets. Actual tools you can use right now.",
    tips: ["No special commands or syntax needed", "Works on any device — desktop, tablet, phone", "Every session is saved and synced when you sign in"],
    Visual: VisualWelcome,
  },
  {
    id: "chat", tag: "Step 1", dot: "#60a5fa", title: "Chatting",
    headline: "Chat Like You Think",
    body: "Just type. Ask a question, request a calculation, get something written, or have a conversation. Morph OS understands plain language and gives the right answer — text when words suffice, an app when a tool is what you need.",
    tips: ["Questions and facts answered instantly", "Math, conversions, writing all handled in chat", "Context carries through the whole conversation"],
    Visual: VisualChat,
  },
  {
    id: "build", tag: "Step 2", dot: "#34d399", title: "Building",
    headline: "Describe. Watch It Build.",
    body: "Ask for any app or tool — Morph OS builds it live in under 10 seconds. It appears in the Canvas panel, fully interactive, the moment it's done. You can keep chatting while it builds.",
    tips: ["34+ pre-built apps open in under 1 second", "Custom apps generate in 5-10 seconds", "Built apps are fully functional — click, type, play"],
    Visual: VisualBuild,
  },
  {
    id: "canvas", tag: "Step 3", dot: "#818cf8", title: "The Canvas",
    headline: "Your Live Workspace",
    body: "The Canvas is where all apps live. Chat sits on the left, your app runs live on the right. Drag the divider to resize both panels. On mobile and tablet, switch between Chat and Canvas tabs.",
    tips: ["Drag the divider to give more space to either panel", "Apps stay open while you keep chatting", `Tap "Open in Canvas" on any message to show it`],
    Visual: VisualCanvas,
  },
  {
    id: "edit", tag: "Step 4", dot: "#f472b6", title: "Editing",
    headline: "Change It. Instantly.",
    body: "With any app open in the Canvas, just describe what you want changed. Morph OS edits the live artifact directly — no full rebuild, no waiting. Add features, fix bugs, or restyle it in plain English.",
    tips: ['"Make it dark mode"', '"Add a reset button to the timer"', '"Change the color theme to green"'],
    Visual: VisualEdit,
  },
  {
    id: "vault", tag: "Step 5", dot: "#fbbf24", title: "The Vault",
    headline: "34+ Apps, One Click",
    body: "The Vault is your library of pre-built apps — games, productivity tools, finance, creative tools, and more. Type the name in chat or browse the Vault page from the sidebar. Everything opens instantly.",
    tips: ["Games: Chess, Checkers, Snake, Memory, Tic-Tac-Toe", "Tools: Weather, Pomodoro, Kanban, Habits, Calendar", "Creative: Drawing, Pixel Art, Gradient, Color Palette"],
    Visual: VisualVault,
  },
  {
    id: "files", tag: "Step 6", dot: "#fb923c", title: "Files",
    headline: "Bring Your Files",
    body: "Attach images, PDFs, text files, or CSVs to any message using the paperclip icon or drag-and-drop. Morph OS reads the content and uses it — summarize, analyze, or build something from it.",
    tips: ["Images: describe, analyze, extract colors, or make pixel art", "PDFs & text: summarize, extract data, or add to notes/diary", "Drag-and-drop directly onto the chat bar"],
    Visual: VisualFiles,
  },
  {
    id: "library", tag: "Step 7", dot: "#38bdf8", title: "My Library",
    headline: "Everything is Saved",
    body: "Every conversation and app you create is automatically saved to My Library. Sign in with Google and it syncs across all your devices. Search, filter by category, and reopen any session right where you left off.",
    tips: ["Sign in with Google to sync across devices", "Filter by Games, Tools, Creative, Finance, and more", "Reopen any artifact to continue the exact conversation"],
    Visual: VisualLibrary,
  },
  {
    id: "settings", tag: "Step 8", dot: "#4ade80", title: "Settings",
    headline: "Make It Yours",
    body: "Open Settings from the sidebar to personalize Morph OS. Set your name, role, and preferred tone — the AI adapts its responses to match. Switch between dark and light mode anytime.",
    tips: ["Light and dark theme — toggle anytime", "Set your name and role for personalized responses", "Choose tone: casual, professional, or technical"],
    Visual: VisualSettings,
  },
  {
    id: "tips", tag: "Pro Tip", dot: "#f87171", title: "Pro Tips",
    headline: "The More You Give",
    body: "The secret to great results: be specific. Describe the features you want, mention the style, list the requirements. Morph OS delivers exactly what you describe — so describe it well.",
    tips: ['"Open calculator in green color"', '"Build a habit tracker with streaks, heatmap, and sound"', '"Explain async/await like I\'m a beginner"'],
    Visual: VisualTips,
  },
];

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    else { localStorage.setItem(SEEN_KEY, "1"); router.push("/"); }
  }, [idx, total, go, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  useEffect(() => { localStorage.setItem(SEEN_KEY, "1"); }, []);

  const isLast = idx === total - 1;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--bg-page)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors"
            style={{ color: "var(--t4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}>
            <ChevronLeft size={14} /><span>Back</span>
          </div>
        </Link>
        <span className="text-[11px] font-medium tracking-wide" style={{ color: "var(--t3)" }}>Tutorial</span>
        <span className="text-[11px]" style={{ color: "var(--t5)" }}>{idx + 1} / {total}</span>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-12">

        {/* Step pills — scrollable on mobile, wraps on sm+ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 sm:flex-wrap" style={{ scrollbarWidth: "none" }}>
          {SLIDES.map((s, i) => (
            <button key={s.id}
              onClick={() => go(i, i > idx ? 1 : -1)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200"
              style={i === idx
                ? { background: `${s.dot}22`, color: s.dot, border: `1px solid ${s.dot}55`, fontWeight: 600 }
                : i < idx
                ? { background: "var(--bg-card)", color: "var(--t4)", border: "1px solid var(--border)", opacity: 0.7 }
                : { background: "var(--bg-card)", color: "var(--t4)", border: "1px solid var(--border)" }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: i < idx ? `${s.dot}30` : i === idx ? `${s.dot}33` : "var(--bg-input)",
                  color: i <= idx ? s.dot : "var(--t5)",
                }}>
                {i < idx ? "✓" : i + 1}
              </span>
              <span className="hidden sm:block whitespace-nowrap">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Visual card */}
        <div className="rounded-3xl overflow-hidden mb-6"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            height: "clamp(200px, 44vw, 280px)",
          }}>
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
            className="mb-8 space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: slide.dot }}>
              {slide.tag}
            </p>
            <h1 className="text-[26px] sm:text-3xl font-light tracking-tight leading-tight" style={{ color: "var(--t1)" }}>
              {slide.headline}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--t3)" }}>
              {slide.body}
            </p>
            <ul className="space-y-2 pt-1">
              {slide.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--t3)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                    style={{ background: `${slide.dot}22` }}>
                    <Check size={8} style={{ color: slide.dot }} />
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button key={s.id}
                onClick={() => go(i, i > idx ? 1 : -1)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === idx ? 22 : 6,
                  height: 6,
                  background: i === idx ? slide.dot : i < idx ? `${slide.dot}55` : "var(--border-md)",
                }}
              />
            ))}
          </div>

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
              {isLast ? <><Check size={14} /> Get Started</> : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>

        {/* Skip on first slide */}
        {idx === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
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
