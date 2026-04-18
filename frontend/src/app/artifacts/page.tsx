"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search, Vault,
  Music2, Calculator, Gamepad2, Timer, Clock,
  FileText, Palette, CheckSquare, Cloud, BarChart2,
  DollarSign, Kanban, Lock, QrCode, Pencil,
  ArrowLeftRight, BookOpen, ClipboardList, Layers,
  Brain, Keyboard, CalendarDays, Users, Wand2,
  Cpu, Sparkles, Grid3X3, Ghost, RotateCcw, NotebookPen,
} from "lucide-react";

// ─── Template catalog ──────────────────────────────────────────────────────────
type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  prompt: string;
  accent: string;        // tailwind gradient
  preview: React.ReactNode;
};

const TEMPLATES: Template[] = [
  // ── Games ──
  {
    id: "snake",
    name: "Snake",
    description: "Classic arcade snake game with levels and high score tracking.",
    category: "Games",
    icon: Gamepad2,
    prompt: "snake game",
    accent: "from-green-500/25 to-emerald-500/10",
    preview: <SnakePreview />,
  },
  {
    id: "memory",
    name: "Memory Game",
    description: "Flip cards to find matching emoji pairs. Race against the clock.",
    category: "Games",
    icon: Brain,
    prompt: "memory card game",
    accent: "from-violet-500/25 to-purple-500/10",
    preview: <MemoryPreview />,
  },
  {
    id: "tictactoe",
    name: "Tic Tac Toe",
    description: "Play vs AI or a friend. Smart AI that blocks and wins.",
    category: "Games",
    icon: Grid3X3,
    prompt: "tic tac toe",
    accent: "from-blue-500/25 to-indigo-500/10",
    preview: <TicTacPreview />,
  },
  {
    id: "typing",
    name: "Typing Speed Test",
    description: "Measure your WPM and accuracy with real-time character tracking.",
    category: "Games",
    icon: Keyboard,
    prompt: "typing speed test",
    accent: "from-cyan-500/25 to-teal-500/10",
    preview: <TypingPreview />,
  },
  {
    id: "chess",
    name: "Chess",
    description: "Full chess with legal move validation, castling, en passant, and a greedy AI opponent.",
    category: "Games",
    icon: Gamepad2,
    prompt: "chess game",
    accent: "from-slate-500/20 to-indigo-500/10",
    preview: <ChessPreview />,
  },
  {
    id: "checkers",
    name: "Checkers",
    description: "Classic draughts with forced captures, multi-jump chains, king promotion, and AI mode.",
    category: "Games",
    icon: Gamepad2,
    prompt: "checkers game",
    accent: "from-red-500/20 to-blue-500/10",
    preview: <CheckersPreview />,
  },
  {
    id: "toss",
    name: "Coin Toss",
    description: "Pick heads or tails, flip with animation, track your win rate and history.",
    category: "Fun",
    icon: Sparkles,
    prompt: "coin toss",
    accent: "from-purple-500/20 to-indigo-500/10",
    preview: <TossPreview />,
  },

  // ── Productivity ──
  {
    id: "diary",
    name: "Daily Diary",
    description: "A personal diary with mood tracking, writing prompts, date navigation, and persistent entries.",
    category: "Productivity",
    icon: NotebookPen,
    prompt: "open diary",
    accent: "from-violet-500/20 to-indigo-500/10",
    preview: <DiaryPreview />,
  },
  {
    id: "todo",
    name: "Todo List",
    description: "Clean task manager with priorities, completion, and persistence.",
    category: "Productivity",
    icon: CheckSquare,
    prompt: "todo list",
    accent: "from-teal-500/25 to-cyan-500/10",
    preview: <TodoPreview />,
  },
  {
    id: "pomodoro",
    name: "Pomodoro+",
    description: "Focus timer with integrated task list, work/break cycles, and session tracking.",
    category: "Productivity",
    icon: Timer,
    prompt: "pomodoro timer",
    accent: "from-red-500/20 to-purple-500/10",
    preview: <PomodoroPreview />,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Monthly calendar view with event creation and local persistence.",
    category: "Productivity",
    icon: CalendarDays,
    prompt: "calendar",
    accent: "from-blue-500/25 to-sky-500/10",
    preview: <CalendarPreview />,
  },
  {
    id: "kanban",
    name: "Kanban Board",
    description: "Drag-and-drop task board with To Do, In Progress, and Done columns.",
    category: "Productivity",
    icon: Kanban,
    prompt: "kanban board",
    accent: "from-purple-500/25 to-violet-500/10",
    preview: <KanbanPreview />,
  },
  {
    id: "habit",
    name: "Habit Tracker",
    description: "Track daily habits with streak counters and weekly progress view.",
    category: "Productivity",
    icon: ClipboardList,
    prompt: "habit tracker",
    accent: "from-lime-500/25 to-green-500/10",
    preview: <HabitPreview />,
  },
  {
    id: "notes",
    name: "Rich Notes",
    description: "WYSIWYG notepad with bold, italic, headings, and TXT/DOC/PDF export.",
    category: "Productivity",
    icon: FileText,
    prompt: "notes",
    accent: "from-yellow-500/20 to-amber-500/10",
    preview: <NotesPreview />,
  },
  {
    id: "timer",
    name: "Timer",
    description: "Versatile timer with countdown, stopwatch, and lap tracking modes.",
    category: "Productivity",
    icon: Timer,
    prompt: "timer",
    accent: "from-orange-500/20 to-amber-500/10",
    preview: <TimerPreview />,
  },

  // ── Finance ──
  {
    id: "budget",
    name: "Budget Tracker",
    description: "Track income and expenses with category breakdowns and balance.",
    category: "Finance",
    icon: DollarSign,
    prompt: "budget tracker",
    accent: "from-emerald-500/25 to-green-500/10",
    preview: <BudgetPreview />,
  },
  {
    id: "billsplit",
    name: "Bill Splitter",
    description: "Split dinner bills with tip calculator and per-person breakdown.",
    category: "Finance",
    icon: Users,
    prompt: "split the bill",
    accent: "from-teal-500/25 to-emerald-500/10",
    preview: <BillPreview />,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Clean calculator with standard operations and calculation history.",
    category: "Finance",
    icon: Calculator,
    prompt: "calculator",
    accent: "from-slate-500/20 to-blue-500/10",
    preview: <CalcPreview />,
  },

  // ── Creative ──
  {
    id: "draw",
    name: "Drawing Canvas",
    description: "Freehand drawing with brush sizes, colors, eraser, and undo.",
    category: "Creative",
    icon: Pencil,
    prompt: "drawing canvas",
    accent: "from-pink-500/25 to-rose-500/10",
    preview: <DrawPreview />,
  },
  {
    id: "pixel",
    name: "Pixel Art Editor",
    description: "Grid-based pixel art with palette, fill tool, and PNG export.",
    category: "Creative",
    icon: Cpu,
    prompt: "pixel art editor",
    accent: "from-rose-500/20 to-orange-500/10",
    preview: <PixelPreview />,
  },
  {
    id: "gradient",
    name: "Gradient Generator",
    description: "Build CSS gradients with live preview, presets, and copy-to-clipboard.",
    category: "Creative",
    icon: Palette,
    prompt: "gradient generator",
    accent: "from-purple-500/25 via-pink-500/15 to-orange-500/10",
    preview: <GradientPreview />,
  },
  {
    id: "color",
    name: "Color Palette",
    description: "Explore color palettes, pick hex codes, and generate harmonies.",
    category: "Creative",
    icon: Palette,
    prompt: "color palette",
    accent: "from-fuchsia-500/25 to-purple-500/10",
    preview: <ColorPreview />,
  },

  // ── Visual / Data ──
  {
    id: "weather",
    name: "Weather Forecast",
    description: "Live weather with hourly and 7-day forecast powered by Open-Meteo.",
    category: "Visual",
    icon: Cloud,
    prompt: "weather in my city",
    accent: "from-sky-500/25 to-blue-500/10",
    preview: <WeatherPreview />,
  },
  {
    id: "clock",
    name: "World Clock",
    description: "Multi-city clock with 100+ cities, timezone search, and analog display.",
    category: "Visual",
    icon: Clock,
    prompt: "world clock",
    accent: "from-slate-500/20 to-blue-500/10",
    preview: <ClockPreview />,
  },
  {
    id: "chart",
    name: "Chart Builder",
    description: "Visualize data as bar, line, or pie charts with custom labels and colors.",
    category: "Visual",
    icon: BarChart2,
    prompt: "bar chart showing monthly revenue",
    accent: "from-indigo-500/25 to-blue-500/10",
    preview: <ChartPreview />,
  },
  {
    id: "matrix",
    name: "Matrix Rain",
    description: "The iconic falling-code screensaver with speed, density, and color controls.",
    category: "Visual",
    icon: Layers,
    prompt: "matrix rain",
    accent: "from-green-500/25 to-emerald-500/5",
    preview: <MatrixPreview />,
  },

  // ── Tools ──
  {
    id: "converter",
    name: "Unit Converter",
    description: "Convert length, weight, temperature, speed, and volume in one place.",
    category: "Tools",
    icon: ArrowLeftRight,
    prompt: "unit converter",
    accent: "from-cyan-500/20 to-blue-500/10",
    preview: <ConverterPreview />,
  },
  {
    id: "password",
    name: "Password Generator",
    description: "Generate secure passwords with custom length, symbols, and strength meter.",
    category: "Tools",
    icon: Lock,
    prompt: "password generator",
    accent: "from-red-500/20 to-orange-500/10",
    preview: <PasswordPreview />,
  },
  {
    id: "qrcode",
    name: "QR Code Generator",
    description: "Instantly generate scannable QR codes for any URL or text.",
    category: "Tools",
    icon: QrCode,
    prompt: "qr code generator",
    accent: "from-neutral-500/20 to-slate-500/10",
    preview: <QRPreview />,
  },
  {
    id: "flashcard",
    name: "Flashcards",
    description: "AI-generated study cards on any topic with flip animation and progress.",
    category: "Tools",
    icon: BookOpen,
    prompt: "flashcards on general knowledge",
    accent: "from-amber-500/20 to-yellow-500/10",
    preview: <FlashcardPreview />,
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "AI-generated multiple choice quiz on any topic with scoring.",
    category: "Tools",
    icon: BookOpen,
    prompt: "quiz on space exploration",
    accent: "from-blue-500/20 to-indigo-500/10",
    preview: <QuizPreview />,
  },

  // ── Fun ──
  {
    id: "spinwheel",
    name: "Spin the Wheel",
    description: "Random decision wheel — add your own options and spin for a result.",
    category: "Fun",
    icon: Sparkles,
    prompt: "spin the wheel",
    accent: "from-yellow-500/20 to-orange-500/10",
    preview: <WheelPreview />,
  },
  {
    id: "magicball",
    name: "Magic 8 Ball",
    description: "Ask any yes/no question and let the oracle decide your fate.",
    category: "Fun",
    icon: Wand2,
    prompt: "magic 8 ball",
    accent: "from-purple-500/25 to-indigo-500/10",
    preview: <MagicBallPreview />,
  },
  {
    id: "youtube",
    name: "Music Player",
    description: "Play any song or artist from YouTube with a premium glassmorphism player.",
    category: "Fun",
    icon: Music2,
    prompt: "play shape of you by ed sheeran",
    accent: "from-red-500/20 to-pink-500/10",
    preview: <MusicPreview />,
  },
];

const CATEGORIES = ["All", "Games", "Productivity", "Finance", "Creative", "Visual", "Tools", "Fun"];

// ─── Mini preview components ───────────────────────────────────────────────────
// Each is a tiny static visual hint of what the template looks like

function DiaryPreview() {
  return (
    <div className="space-y-2 w-full text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📔</span>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>Daily Diary</span>
        </div>
        <span className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>Today</span>
      </div>
      <div className="flex gap-1.5 items-center">
        {["🌟","😊","😐","😔","😤"].map((e, i) => (
          <div key={i} className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${i === 1 ? "border border-green-500/40 bg-green-500/10" : "bg-white/3 border border-white/6"}`}>{e}</div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/10 w-full" />
        <div className="h-1.5 rounded-full bg-white/8 w-5/6" />
        <div className="h-1.5 rounded-full bg-white/6 w-4/5" />
        <div className="h-1.5 rounded-full bg-white/10 w-full" />
      </div>
      <div className="text-[9px] italic" style={{ color: "rgba(255,255,255,0.2)" }}>"What made today worth remembering?"</div>
    </div>
  );
}

function SnakePreview() {
  const grid = Array(25).fill(0);
  const snake = [12, 11, 10];
  const food = 7;
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
      {grid.map((_, i) => (
        <div key={i} className={`aspect-square rounded-sm ${snake.includes(i) ? "bg-green-400" : i === food ? "bg-red-400" : "bg-white/4"}`} />
      ))}
    </div>
  );
}

function MemoryPreview() {
  const emojis = ["🎮","🎯","🎨","🎭","","","",""];
  return (
    <div className="grid grid-cols-4 gap-1">
      {emojis.map((e, i) => (
        <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-sm ${e ? "bg-white/10 border border-white/15" : "bg-white/4 border border-white/6"}`}>
          {e}
        </div>
      ))}
    </div>
  );
}

function TicTacPreview() {
  const b = ["×","○","×","○","×","○","","×",""];
  return (
    <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
      {b.map((v, i) => (
        <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-sm border ${v === "×" ? "text-purple-400 border-white/10" : v === "○" ? "text-blue-400 border-white/10" : "border-white/5"} bg-white/3`}>
          {v}
        </div>
      ))}
    </div>
  );
}

function TypingPreview() {
  return (
    <div className="space-y-2 w-full">
      <div className="flex gap-0.5 flex-wrap">
        {"The quick ".split("").map((c, i) => (
          <span key={i} className={`text-[10px] font-mono ${c === " " ? "w-1" : i < 7 ? "text-white/70" : "text-red-400"}`}>{c}</span>
        ))}
        <span className="text-[10px] font-mono text-white bg-white/15 rounded px-0.5">b</span>
      </div>
      <div className="h-0.5 bg-white/5 rounded-full w-full">
        <div className="h-full bg-purple-500/60 rounded-full w-2/3" />
      </div>
      <div className="flex justify-between text-[9px] text-white/25">
        <span>62 WPM</span><span>94% acc</span><span>23s</span>
      </div>
    </div>
  );
}

function TodoPreview() {
  const items = [
    { t: "Design landing page", done: true },
    { t: "Write unit tests", done: true },
    { t: "Deploy to production", done: false },
  ];
  return (
    <div className="space-y-1.5 w-full">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-md border shrink-0 ${it.done ? "bg-emerald-500/40 border-emerald-500/60" : "border-white/20"}`} />
          <span className={`text-[10px] ${it.done ? "line-through text-white/25" : "text-white/55"}`}>{it.t}</span>
        </div>
      ))}
    </div>
  );
}

function PomodoroPreview() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-14 shrink-0">
        <svg width={56} height={56} className="-rotate-90" viewBox="0 0 56 56">
          <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
          <circle cx={28} cy={28} r={22} fill="none" stroke="#a855f7" strokeWidth={5}
            strokeDasharray={138} strokeDashoffset={35} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-white/60 font-mono">19:42</span>
        </div>
      </div>
      <div className="space-y-1 flex-1">
        {["Review PR","Write docs"].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded border border-white/15" />
            <span className="text-[10px] text-white/40">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarPreview() {
  const days = [null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  return (
    <div className="grid grid-cols-7 gap-0.5 w-full">
      {["S","M","T","W","T","F","S"].map(d => (
        <div key={d} className="text-[8px] text-white/20 text-center">{d}</div>
      ))}
      {days.map((d, i) => (
        <div key={i} className={`aspect-square rounded text-[9px] flex items-center justify-center ${d === 15 ? "bg-purple-500/30 text-purple-300" : d ? "text-white/40 hover:bg-white/5" : ""}`}>
          {d}
          {d === 8 && <span className="absolute bottom-0.5 w-0.5 h-0.5 bg-blue-400 rounded-full" />}
        </div>
      ))}
    </div>
  );
}

function KanbanPreview() {
  return (
    <div className="flex gap-2 w-full">
      {[{col:"Todo",items:["Design","API"],c:"blue"},{col:"In Progress",items:["Auth"],c:"yellow"},{col:"Done",items:["Setup"],c:"green"}].map(({col,items,c}) => (
        <div key={col} className="flex-1">
          <div className={`text-[8px] uppercase tracking-widest text-white/20 mb-1`}>{col}</div>
          {items.map(it => (
            <div key={it} className="bg-white/[0.04] border border-white/[0.07] rounded-md px-1.5 py-1 text-[9px] text-white/40 mb-1">{it}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function HabitPreview() {
  const habits = [
    { name: "Exercise", streak: 7, days: [1,1,1,0,1,1,1] },
    { name: "Read", streak: 3, days: [0,1,1,0,0,1,1] },
  ];
  return (
    <div className="space-y-2 w-full">
      {habits.map(h => (
        <div key={h.name}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/50">{h.name}</span>
            <span className="text-[9px] text-orange-400">🔥 {h.streak}</span>
          </div>
          <div className="flex gap-1">
            {h.days.map((d, i) => (
              <div key={i} className={`w-4 h-4 rounded ${d ? "bg-emerald-500/50" : "bg-white/[0.05]"}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesPreview() {
  return (
    <div className="space-y-1.5 w-full text-left">
      <div className="text-[11px] font-semibold text-white/60">Meeting Notes</div>
      <div className="space-y-1">
        <div className="h-1.5 bg-white/10 rounded w-full" />
        <div className="h-1.5 bg-white/8 rounded w-5/6" />
        <div className="h-1.5 bg-white/6 rounded w-4/6" />
        <div className="h-1.5 bg-white/10 rounded w-full" />
        <div className="h-1.5 bg-white/8 rounded w-3/4" />
      </div>
      <div className="flex gap-1 pt-1">
        {["B","I","H1"].map(f => (
          <div key={f} className="px-1.5 py-0.5 bg-white/[0.05] border border-white/[0.07] rounded text-[8px] text-white/25">{f}</div>
        ))}
      </div>
    </div>
  );
}

function TimerPreview() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-2xl font-light text-white/70 font-mono tracking-widest">25:00</div>
      <div className="flex gap-1.5">
        {["Countdown","Stopwatch","Lap"].map(m => (
          <div key={m} className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] rounded-full text-[8px] text-white/25">{m}</div>
        ))}
      </div>
    </div>
  );
}

function BudgetPreview() {
  const bars = [60, 35, 80, 45, 90, 55];
  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-10 mb-1">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: h > 70 ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.25)" }} />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-white/20">
        {["Jan","Feb","Mar","Apr","May","Jun"].map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function BillPreview() {
  return (
    <div className="space-y-1.5 w-full">
      {[{n:"Alex",a:"$24.50"},{n:"Sam",a:"$24.50"},{n:"Jamie",a:"$24.50"}].map(p => (
        <div key={p.n} className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 text-[7px] text-purple-400 flex items-center justify-center">{p.n[0]}</div>
            <span className="text-[10px] text-white/45">{p.n}</span>
          </div>
          <span className="text-[10px] text-emerald-400/70">{p.a}</span>
        </div>
      ))}
    </div>
  );
}

function CalcPreview() {
  const btns = ["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","=","+"];
  return (
    <div className="space-y-1.5 w-full">
      <div className="text-right text-sm text-white/60 font-mono pr-1">1,234</div>
      <div className="grid grid-cols-4 gap-1">
        {btns.map(b => (
          <div key={b} className={`aspect-square rounded-lg flex items-center justify-center text-[9px] ${["÷","×","−","+","="].includes(b) ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.04] text-white/40"}`}>{b}</div>
        ))}
      </div>
    </div>
  );
}

function DrawPreview() {
  return (
    <div className="w-full h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl relative overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 120 64">
        <path d="M10 50 Q30 20 50 35 Q70 50 90 15 Q100 8 110 20" fill="none" stroke="rgba(236,72,153,0.6)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 55 Q40 40 60 45 Q80 50 100 30" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PixelPreview() {
  const art = [
    [0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,0,0,1,0,0],
    [0,0,1,0,0,1,0,0],
  ];
  const palette = ["transparent","rgba(239,68,68,0.7)"];
  return (
    <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: "repeat(8,1fr)", width: 72 }}>
      {art.flat().map((v, i) => (
        <div key={i} className="aspect-square rounded-[1px]" style={{ background: palette[v] || "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );
}

function GradientPreview() {
  return (
    <div className="w-full h-14 rounded-xl overflow-hidden relative">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899, #f97316)" }} />
      <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
        <p className="text-[8px] font-mono text-white/60">linear-gradient(135deg, …)</p>
      </div>
    </div>
  );
}

function ColorPreview() {
  const colors = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
  return (
    <div className="flex gap-1 flex-wrap">
      {colors.map(c => (
        <div key={c} className="w-6 h-6 rounded-lg border border-white/10" style={{ background: c }} />
      ))}
    </div>
  );
}

function WeatherPreview() {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-light text-white/70">24°</p>
          <p className="text-[9px] text-white/25">Partly Cloudy · Mumbai</p>
        </div>
        <div className="text-2xl">⛅</div>
      </div>
      <div className="flex gap-1">
        {["Mon","Tue","Wed","Thu","Fri"].map((d, i) => (
          <div key={d} className="flex-1 bg-white/[0.04] rounded-lg py-1 text-center">
            <div className="text-[7px] text-white/20 mb-0.5">{d}</div>
            <div className="text-[9px]">{["☀️","⛅","🌧️","☀️","⛅"][i]}</div>
            <div className="text-[7px] text-white/30">{[28,25,21,30,26][i]}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClockPreview() {
  return (
    <div className="flex gap-3 items-center">
      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        <line x1={24} y1={24} x2={24} y2={8} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={24} y1={24} x2={34} y2={28} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={24} cy={24} r={2} fill="rgba(168,85,247,0.8)" />
      </svg>
      <div className="space-y-1">
        {["New York","London","Tokyo"].map((c, i) => (
          <div key={c} className="flex justify-between gap-4">
            <span className="text-[9px] text-white/30">{c}</span>
            <span className="text-[9px] text-white/50 font-mono">{["09:24","14:24","23:24"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartPreview() {
  const vals = [60,85,45,70,90,55,75];
  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-12">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: `rgba(139,92,246,${0.3 + v / 250})` }} />
        ))}
      </div>
      <div className="h-px bg-white/[0.06] mt-1" />
    </div>
  );
}

function MatrixPreview() {
  const chars = "アｶ1ｸ0ﾃｲ9ｴｱ3ｺ7ﾔ2ｷ5";
  return (
    <div className="w-full h-14 font-mono text-[8px] leading-tight overflow-hidden relative">
      {Array(4).fill(0).map((_, col) => (
        <div key={col} className="absolute top-0" style={{ left: `${col * 25}%` }}>
          {chars.slice(col * 4, col * 4 + 8).split("").map((c, i) => (
            <div key={i} style={{ color: i === 0 ? "#ffffff" : `rgba(0,255,65,${1 - i * 0.12})` }}>{c}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ConverterPreview() {
  return (
    <div className="space-y-1.5 w-full">
      {[["100 km","62.1 mi"],["10 kg","22.0 lb"]].map(([a, b]) => (
        <div key={a} className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[10px] text-white/50">{a}</div>
          <ArrowLeftRight size={10} className="text-white/20 flex-shrink-0" />
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[10px] text-white/50">{b}</div>
        </div>
      ))}
    </div>
  );
}

function PasswordPreview() {
  return (
    <div className="space-y-2 w-full">
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 font-mono text-[10px] text-white/50 tracking-wider">
        X7$mK#9pQ2@nL
      </div>
      <div className="flex gap-1">
        {["Uppercase","Numbers","Symbols"].map(l => (
          <div key={l} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/40 border border-emerald-500/60" />
            <span className="text-[8px] text-white/25">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QRPreview() {
  return (
    <div className="w-14 h-14 mx-auto bg-white/90 rounded-lg p-1.5">
      <svg viewBox="0 0 21 21" className="w-full h-full">
        {/* Simplified QR pattern */}
        {[0,1,2,3,4,5,6,14,15,16,17,18,19,20].map(x => [0,1,2,3,4,5,6].map(y => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
        )))}
        {[0,6].map(x => [0,6].map(y => (
          <rect key={`c-${x}-${y}`} x={x+1} y={y+1} width={5} height={5} fill="#fff" />
        )))}
        {[2,3,4].map(x => [2,3,4].map(y => (
          <rect key={`ci-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
        )))}
        {[8,9,10,12].map(x => [8,9,11].map(y => (
          <rect key={`d-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
        )))}
      </svg>
    </div>
  );
}

function FlashcardPreview() {
  return (
    <div className="relative w-full h-14">
      <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.07] rounded-xl translate-x-1 translate-y-1" />
      <div className="absolute inset-0 bg-white/[0.05] border border-white/[0.09] rounded-xl flex flex-col items-center justify-center gap-1">
        <p className="text-[9px] uppercase tracking-widest text-white/20">Question</p>
        <p className="text-[10px] text-white/50 text-center px-3">What is photosynthesis?</p>
      </div>
    </div>
  );
}

function QuizPreview() {
  return (
    <div className="space-y-1.5 w-full">
      <p className="text-[10px] text-white/50">Which planet is largest?</p>
      {["Earth","Saturn","Jupiter","Uranus"].map((opt, i) => (
        <div key={opt} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] ${i === 2 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-white/[0.02] border-white/[0.05] text-white/25"}`}>
          <span>{String.fromCharCode(65+i)}</span><span>{opt}</span>
        </div>
      ))}
    </div>
  );
}

function WheelPreview() {
  const segments = 6;
  const colors = ["#7c3aed","#2563eb","#059669","#d97706","#dc2626","#7c3aed"];
  const r = 30, cx = 35, cy = 35;
  return (
    <div className="flex items-center gap-3">
      <svg width={70} height={70} viewBox="0 0 70 70">
        {Array(segments).fill(0).map((_, i) => {
          const start = (i * 360) / segments;
          const end = ((i + 1) * 360) / segments;
          const s = { x: cx + r * Math.cos(((start - 90) * Math.PI) / 180), y: cy + r * Math.sin(((start - 90) * Math.PI) / 180) };
          const e = { x: cx + r * Math.cos(((end - 90) * Math.PI) / 180), y: cy + r * Math.sin(((end - 90) * Math.PI) / 180) };
          return <path key={i} d={`M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 0,1 ${e.x},${e.y}Z`} fill={colors[i]} opacity="0.7" />;
        })}
        <circle cx={cx} cy={cy} r={8} fill="#0a0a0a" />
        <polygon points={`${cx},2 ${cx-4},10 ${cx+4},10`} fill="white" opacity="0.8" />
      </svg>
      <div className="space-y-1">
        {["Pizza 🍕","Sushi 🍣","Tacos 🌮"].map(o => (
          <div key={o} className="text-[9px] text-white/35">{o}</div>
        ))}
      </div>
    </div>
  );
}

function MagicBallPreview() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-full flex items-center justify-center relative"
        style={{ background: "radial-gradient(circle at 35% 30%, #2a2a3e, #000008)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.5), rgba(37,99,235,0.3))" }}>
          <span className="text-white/90 text-base font-bold">8</span>
        </div>
      </div>
      <p className="text-[9px] text-emerald-400/60">Signs point to yes</p>
    </div>
  );
}

function MusicPreview() {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/40 to-pink-500/40 border border-white/10 flex items-center justify-center">
          <Music2 size={12} className="text-white/60" />
        </div>
        <div>
          <p className="text-[10px] text-white/60">Shape of You</p>
          <p className="text-[8px] text-white/25">Ed Sheeran</p>
        </div>
      </div>
      <div className="h-1 bg-white/5 rounded-full">
        <div className="h-full bg-red-400/60 rounded-full w-2/5" />
      </div>
      <div className="flex justify-center gap-3">
        {["⏮","⏸","⏭"].map(c => (
          <div key={c} className="w-6 h-6 flex items-center justify-center text-white/30 text-sm">{c}</div>
        ))}
      </div>
    </div>
  );
}

function ChessPreview() {
  // 4×4 snapshot of a chess board corner
  const board = [
    ["♜","♞","♝","♛"],
    ["♟","♟","♟","♟"],
    ["","","",""],
    ["♙","♙","♙","♙"],
  ];
  return (
    <div className="grid grid-cols-4 gap-0 mx-auto rounded-lg overflow-hidden border border-white/[0.08]" style={{ width: 72 }}>
      {board.flatMap((row, r) =>
        row.map((piece, c) => {
          const dark = (r + c) % 2 === 1;
          return (
            <div key={`${r}-${c}`} className="flex items-center justify-center text-[13px]"
              style={{ width: 18, height: 18, background: dark ? "#1e1e2a" : "#0e0e14", color: r < 2 ? "rgba(96,165,250,0.85)" : "rgba(248,248,255,0.85)" }}>
              {piece}
            </div>
          );
        })
      )}
    </div>
  );
}

function CheckersPreview() {
  const layout = [
    [0,1,0,1],[1,0,1,0],[0,0,0,0],[0,2,0,2],
  ];
  return (
    <div className="grid grid-cols-4 gap-0 mx-auto rounded-lg overflow-hidden border border-white/[0.08]" style={{ width: 72 }}>
      {layout.flatMap((row, r) =>
        row.map((cell, c) => {
          const dark = (r + c) % 2 === 1;
          return (
            <div key={`${r}-${c}`} className="flex items-center justify-center"
              style={{ width: 18, height: 18, background: dark ? "#1e1e1e" : "#0e0e0e" }}>
              {cell === 1 && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(252,165,165,0.9), rgba(220,38,38,0.85))" }} />}
              {cell === 2 && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(147,197,253,0.9), rgba(29,78,216,0.85))" }} />}
            </div>
          );
        })
      )}
    </div>
  );
}

function TossPreview() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
        style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", border: "2px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>
        H
      </div>
      <div className="flex gap-1.5">
        <div className="px-2.5 py-1 rounded-full text-[9px] font-medium" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}>Heads</div>
        <div className="px-2.5 py-1 rounded-full text-[9px] font-medium" style={{ background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.3)", color: "#93c5fd" }}>Tails</div>
      </div>
    </div>
  );
}

// ─── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({ t, index }: { t: Template; index: number }) {
  const router = useRouter();

  const launch = () => {
    router.push(`/?launch=${encodeURIComponent(t.prompt)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
      className="group flex flex-col rounded-3xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      {/* Preview area */}
      <div className={`relative h-32 bg-gradient-to-br ${t.accent} flex items-center justify-center p-4 overflow-hidden`}
        style={{ borderBottom: "1px solid var(--border)" }}>
        {t.preview}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
              <t.icon size={13} style={{ color: "var(--t3)" }} />
            </div>
            <h3 className="text-sm font-medium leading-none" style={{ color: "var(--t1)" }}>{t.name}</h3>
          </div>
          <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
            style={{ color: "var(--t4)", background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            {t.category}
          </span>
        </div>

        <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--t3)" }}>{t.description}</p>

        <button
          onClick={launch}
          className="w-full py-2 rounded-xl text-xs transition-all active:scale-[0.98] mt-1"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t2)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
        >
          Launch →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function VaultPage() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return TEMPLATES.filter(t => {
      const matchCat = category === "All" || t.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  return (
    <div className="min-h-full bg-page text-t1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 md:pt-10 pb-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <Vault size={18} className="text-white/30" />
            <h1 className="text-white text-xl font-light tracking-tight">The Vault</h1>
            <span className="text-[10px] uppercase tracking-widest text-white/20 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
              {TEMPLATES.length} templates
            </span>
          </div>
          <p className="text-white/25 text-sm">Every tool Morph OS can build — one click to launch.</p>
        </motion.div>

        {/* Search + category row */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex flex-col gap-3 mb-6">

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--t4)" }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)" }}
            />
          </div>

          {/* Category pills — scrollable on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] transition-all"
                style={{
                  background: category === cat ? "var(--bg-active)" : "var(--bg-card)",
                  border:     `1px solid ${category === cat ? "var(--border-md)" : "var(--border)"}`,
                  color:      category === cat ? "var(--t1)" : "var(--t4)",
                }}>
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Ghost size={24} className="text-white/15" />
            <p className="text-white/25 text-sm">No templates match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((t, i) => (
                <TemplateCard key={t.id} t={t} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
