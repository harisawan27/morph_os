"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Library, Search, Ghost, Trash2, ExternalLink,
  CheckSquare, Timer, CalendarDays, Kanban, ClipboardList,
  FileText, DollarSign, Users, Calculator,
  Gamepad2, Brain, Grid3X3, Keyboard, Wand2,
  Pencil, Cpu, Palette, NotebookPen,
  Cloud, Music2, BarChart2, BookOpen, Sparkles,
  Lock, QrCode, Clock, ArrowLeftRight, Layers,
  LucideIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────
type RawArtifact = {
  id: string;
  prompt: string;
  reply: string | null;
  session_id: string | null;
  ui_spec: string | null;
  created_at: string | null;
};

type ParsedArtifact = RawArtifact & {
  templateId: string | null;
  displayName: string;
  subtitle: string | null;
  category: string;
  icon: LucideIcon;
  accent: string;
};

// ─── Template metadata ────────────────────────────────────────────────────────
type Meta = { name: string; category: string; icon: LucideIcon; accent: string };

const TEMPLATE_META: Record<string, Meta> = {
  todo:       { name: "Todo List",        category: "Tasks",    icon: CheckSquare,    accent: "from-teal-500/25 to-cyan-500/10"          },
  kanban:     { name: "Kanban Board",     category: "Tasks",    icon: Kanban,         accent: "from-purple-500/25 to-violet-500/10"      },
  habit:      { name: "Habit Tracker",    category: "Tasks",    icon: ClipboardList,  accent: "from-lime-500/25 to-green-500/10"         },
  pomodoro:   { name: "Pomodoro",         category: "Tasks",    icon: Timer,          accent: "from-red-500/20 to-purple-500/10"         },
  timer:      { name: "Timer",            category: "Tasks",    icon: Timer,          accent: "from-orange-500/20 to-amber-500/10"       },
  calendar:   { name: "Calendar",         category: "Tasks",    icon: CalendarDays,   accent: "from-blue-500/25 to-sky-500/10"           },
  notes:      { name: "Notes",            category: "Files",    icon: FileText,       accent: "from-yellow-500/20 to-amber-500/10"       },
  diary:      { name: "Daily Diary",      category: "Files",    icon: NotebookPen,    accent: "from-violet-500/20 to-indigo-500/10"      },
  budget:     { name: "Budget Tracker",   category: "Finance",  icon: DollarSign,     accent: "from-emerald-500/25 to-green-500/10"      },
  billsplit:  { name: "Bill Splitter",    category: "Finance",  icon: Users,          accent: "from-teal-500/25 to-emerald-500/10"       },
  calculator: { name: "Calculator",       category: "Finance",  icon: Calculator,     accent: "from-slate-500/20 to-blue-500/10"         },
  snake:      { name: "Snake",            category: "Games",    icon: Gamepad2,       accent: "from-green-500/25 to-emerald-500/10"      },
  memory:     { name: "Memory Game",      category: "Games",    icon: Brain,          accent: "from-violet-500/25 to-purple-500/10"      },
  tictactoe:  { name: "Tic Tac Toe",      category: "Games",    icon: Grid3X3,        accent: "from-blue-500/25 to-indigo-500/10"        },
  typing:     { name: "Typing Test",      category: "Games",    icon: Keyboard,       accent: "from-cyan-500/25 to-teal-500/10"          },
  chess:      { name: "Chess",            category: "Games",    icon: Gamepad2,       accent: "from-slate-500/20 to-indigo-500/10"       },
  checkers:   { name: "Checkers",         category: "Games",    icon: Gamepad2,       accent: "from-red-500/20 to-blue-500/10"           },
  toss:       { name: "Coin Toss",        category: "Games",    icon: Sparkles,       accent: "from-purple-500/20 to-indigo-500/10"      },
  magicball:  { name: "Magic 8 Ball",     category: "Games",    icon: Wand2,          accent: "from-purple-500/25 to-indigo-500/10"      },
  draw:       { name: "Drawing Canvas",   category: "Creative", icon: Pencil,         accent: "from-pink-500/25 to-rose-500/10"          },
  pixel:      { name: "Pixel Art",        category: "Creative", icon: Cpu,            accent: "from-rose-500/20 to-orange-500/10"        },
  gradient:   { name: "Gradient",         category: "Creative", icon: Palette,        accent: "from-purple-500/25 via-pink-500/15 to-orange-500/10" },
  color:      { name: "Color Palette",    category: "Creative", icon: Palette,        accent: "from-fuchsia-500/25 to-purple-500/10"     },
  matrix:     { name: "Matrix Rain",      category: "Creative", icon: Cpu,            accent: "from-green-500/25 to-emerald-500/10"      },
  weather:    { name: "Weather",          category: "Tools",    icon: Cloud,          accent: "from-sky-500/25 to-blue-500/10"           },
  youtube:    { name: "Music Player",     category: "Tools",    icon: Music2,         accent: "from-red-500/20 to-pink-500/10"           },
  chart:      { name: "Chart",            category: "Tools",    icon: BarChart2,      accent: "from-blue-500/25 to-indigo-500/10"        },
  flashcard:  { name: "Flashcards",       category: "Tools",    icon: BookOpen,       accent: "from-amber-500/20 to-yellow-500/10"       },
  quiz:       { name: "Quiz",             category: "Tools",    icon: BookOpen,       accent: "from-blue-500/20 to-indigo-500/10"        },
  spinwheel:  { name: "Spin the Wheel",   category: "Tools",    icon: Sparkles,       accent: "from-yellow-500/20 to-orange-500/10"      },
  password:   { name: "Password Gen",     category: "Tools",    icon: Lock,           accent: "from-red-500/20 to-rose-500/10"           },
  qrcode:     { name: "QR Code",          category: "Tools",    icon: QrCode,         accent: "from-neutral-500/20 to-slate-500/10"      },
  clock:      { name: "Clock",            category: "Tools",    icon: Clock,          accent: "from-slate-500/20 to-gray-500/10"         },
  converter:  { name: "Converter",        category: "Tools",    icon: ArrowLeftRight, accent: "from-blue-500/20 to-cyan-500/10"          },
};

const CUSTOM_META: Meta = {
  name: "Custom Build", category: "Custom", icon: Layers, accent: "from-purple-600/20 to-blue-600/10",
};

const CATEGORIES = ["All", "Files", "Tasks", "Finance", "Games", "Creative", "Tools", "Custom"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseArtifact(a: RawArtifact): ParsedArtifact {
  let templateId: string | null = null;
  let subtitle: string | null   = null;

  try {
    if (a.ui_spec) {
      const spec = JSON.parse(a.ui_spec);
      templateId = spec.template_id ?? null;
      // Pull a subtitle from parametric data
      if (templateId === "notes"     && spec.data?.title)  subtitle = spec.data.title;
      if (templateId === "weather"   && spec.data?.city)   subtitle = spec.data.city;
      if (templateId === "youtube"   && spec.data?.title)  subtitle = spec.data.title;
      if (templateId === "flashcard" && spec.data?.topic)  subtitle = spec.data.topic;
      if (templateId === "quiz"      && spec.data?.topic)  subtitle = spec.data.topic;
      if (templateId === "chart"     && spec.data?.title)  subtitle = spec.data.title;
    }
  } catch {}

  const meta        = templateId ? (TEMPLATE_META[templateId] ?? CUSTOM_META) : CUSTOM_META;
  const displayName = meta.name;

  return { ...a, templateId, displayName, subtitle, ...meta };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Artifact card ────────────────────────────────────────────────────────────
function ArtifactCard({
  item,
  index,
  onDelete,
}: {
  item: ParsedArtifact;
  index: number;
  onDelete: (id: string) => void;
}) {
  const router  = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const open = () => {
    if (item.session_id) {
      router.push(`/session/${item.session_id}`);
    } else {
      router.push(`/?launch=${encodeURIComponent(item.prompt)}`);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/api/artifacts/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      onDelete(item.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025, ease: "easeOut" }}
      className="flex flex-col rounded-3xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      {/* Icon area */}
      <div
        className={`morph-static-dark relative h-28 bg-[#0c0f17] bg-gradient-to-br ${item.accent} flex items-center justify-center overflow-hidden`}
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="p-4 bg-white/[0.06] rounded-2xl border border-white/[0.08]">
          <Icon size={26} className="text-white/60" />
        </div>
        {/* Time badge */}
        <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest backdrop-blur-sm px-2 py-0.5 rounded-full"
          style={{ color: "var(--t3)", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {timeAgo(item.created_at)}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none truncate" style={{ color: "var(--t1)" }}>
              {item.displayName}
            </p>
            {item.subtitle && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--t3)" }}>{item.subtitle}</p>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
            style={{ color: "var(--t4)", background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            {item.category}
          </span>
        </div>

        <p className="text-[11px] leading-relaxed flex-1 line-clamp-2" style={{ color: "var(--t4)" }}>
          {item.prompt}
        </p>

        {/* Actions */}
        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5 mt-1"
            >
              <p className="text-[10px] text-center" style={{ color: "var(--t3)" }}>Delete this artifact?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 text-[11px] rounded-xl transition-all"
                  style={{ background: "var(--bg-input)", color: "var(--t3)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-1.5 text-[11px] rounded-xl font-medium transition-all"
                  style={{ background: "var(--brand-red-bg)", color: "var(--brand-red)", border: "1px solid var(--brand-red-border)" }}
                >
                  {deleting
                    ? <span className="w-2.5 h-2.5 rounded-full border border-red-400/30 border-t-red-400 animate-spin block mx-auto" />
                    : "Delete"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1.5 mt-1">
              <button
                onClick={open}
                className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs transition-all active:scale-[0.98]"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t2)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              >
                <ExternalLink size={11} />
                Open
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-9 flex items-center justify-center rounded-xl transition-all active:scale-[0.98]"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t5)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--brand-red-bg)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-red-border)"; (e.currentTarget as HTMLElement).style.color = "var(--brand-red)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-3xl overflow-hidden animate-pulse"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="h-28" style={{ background: "var(--bg-hover)" }} />
      <div className="p-4 space-y-2.5">
        <div className="h-3 rounded-full w-2/3" style={{ background: "var(--bg-hover)" }} />
        <div className="h-2.5 rounded-full w-full" style={{ background: "var(--bg-input)" }} />
        <div className="h-2.5 rounded-full w-4/5" style={{ background: "var(--bg-input)" }} />
        <div className="h-8 rounded-xl mt-2" style={{ background: "var(--bg-input)" }} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const [artifacts, setArtifacts] = useState<ParsedArtifact[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [category,  setCategory]  = useState("All");

  useEffect(() => {
    fetch(`${API}/api/artifacts`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { artifacts: [] })
      .then(data => {
        setArtifacts((data.artifacts ?? []).map(parseArtifact));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return artifacts.filter(a => {
      const matchCat    = category === "All" || a.category === category;
      const matchSearch = !q
        || a.displayName.toLowerCase().includes(q)
        || a.prompt.toLowerCase().includes(q)
        || (a.subtitle?.toLowerCase().includes(q) ?? false);
      return matchCat && matchSearch;
    });
  }, [artifacts, search, category]);

  const handleDelete = (id: string) => {
    setArtifacts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 md:pt-10 pb-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <Library size={18} className="text-white/30" />
            <h1 className="text-xl font-light tracking-tight" style={{ color: "var(--t1)" }}>My Library</h1>
            {!loading && (
              <span className="text-[10px] uppercase tracking-widest text-white/20 bg-white/5 border border-white/[0.08] px-2 py-0.5 rounded-full">
                {artifacts.length} {artifacts.length === 1 ? "artifact" : "artifacts"}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--t4)" }}>Everything you&apos;ve generated — open any artifact to continue where you left off.</p>
        </motion.div>

        {/* Search + category filter */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex flex-col gap-3 mb-6">
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--t4)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your library…"
              className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card)",
                border:     "1px solid var(--border)",
                color:      "var(--t2)",
              }}
            />
          </div>

          {/* Category pills — scrollable on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] border transition-all"
                style={{
                  background: category === cat ? "var(--bg-active)" : "var(--bg-card)",
                  border:     `1px solid ${category === cat ? "var(--border-md)" : "var(--border)"}`,
                  color:      category === cat ? "var(--t1)" : "var(--t4)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : artifacts.length === 0 ? (
          /* Empty state — no artifacts at all */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <Library size={24} className="text-white/15" />
            </div>
            <div>
              <p className="text-sm font-light mb-1" style={{ color: "var(--t2)" }}>Your library is empty</p>
              <p className="text-xs" style={{ color: "var(--t4)" }}>
                Generate something in chat — notes, tools, games — and it&apos;ll appear here.
              </p>
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          /* No search results */
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Ghost size={22} className="text-white/15" />
            <p className="text-sm" style={{ color: "var(--t4)" }}>
              No artifacts match &ldquo;{search}&rdquo; in {category === "All" ? "your library" : category}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <ArtifactCard key={item.id} item={item} index={i} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
