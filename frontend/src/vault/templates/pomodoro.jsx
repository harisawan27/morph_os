import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Check, X, Coffee, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: pomodoro]

const WORK_MINS  = 25;
const BREAK_MINS = 5;
const LONG_BREAK = 15;
const STORAGE_KEY = 'morph_pomodoro_tasks';

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveTasks(t) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {}
}

function Ring({ pct, size = 160, stroke = 10, mode }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash  = circ * (1 - pct);
  const color = mode === 'work' ? '#a855f7' : '#22d3ee';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
    </svg>
  );
}

export default function PomodoroPlus() {
  const [mode,    setMode]    = useState('work');   // 'work' | 'break' | 'longbreak'
  const [secs,    setSecs]    = useState(WORK_MINS * 60);
  const [running, setRunning] = useState(false);
  const [rounds,  setRounds]  = useState(0);
  const [tasks,   setTasks]   = useState(loadTasks);
  const [newTask, setNewTask] = useState('');
  const tickRef = useRef(null);

  const totalSecs = mode === 'work' ? WORK_MINS * 60 : mode === 'break' ? BREAK_MINS * 60 : LONG_BREAK * 60;
  const pct       = secs / totalSecs;

  const switchMode = useCallback((m) => {
    setMode(m);
    setSecs(m === 'work' ? WORK_MINS * 60 : m === 'break' ? BREAK_MINS * 60 : LONG_BREAK * 60);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) { clearInterval(tickRef.current); return; }
    tickRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          setRunning(false);
          if (mode === 'work') {
            const newRounds = rounds + 1;
            setRounds(newRounds);
            switchMode(newRounds % 4 === 0 ? 'longbreak' : 'break');
          } else {
            switchMode('work');
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, mode, rounds, switchMode]);

  const reset = () => { switchMode(mode); };
  const toggle = () => setRunning(r => !r);

  const mins = String(Math.floor(secs / 60)).padStart(2, '0');
  const sec  = String(secs % 60).padStart(2, '0');

  const addTask = () => {
    if (!newTask.trim()) return;
    const updated = [...tasks, { id: Date.now(), text: newTask.trim(), done: false }];
    setTasks(updated); saveTasks(updated); setNewTask('');
  };
  const toggleTask = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated); saveTasks(updated);
  };
  const removeTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated); saveTasks(updated);
  };

  const modeLabel = mode === 'work' ? 'Focus' : mode === 'break' ? 'Short Break' : 'Long Break';
  const ModeIcon  = mode === 'work' ? Brain : Coffee;

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col sm:flex-row overflow-hidden">

      {/* ── Timer side ── */}
      <div className="flex flex-col items-center justify-center gap-4 p-6 sm:w-56 sm:border-r border-white/6 shrink-0">

        {/* Mode tabs */}
        <div className="flex gap-1 bg-white/4 rounded-full p-0.5">
          {[['work','Focus'],['break','Break'],['longbreak','Long']].map(([m,l]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${mode === m ? 'bg-white/12 text-white' : 'text-white/30 hover:text-white/60'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Ring + time */}
        <div className="relative flex items-center justify-center">
          <Ring pct={pct} size={140} stroke={8} mode={mode} />
          <div className="absolute flex flex-col items-center">
            <ModeIcon size={14} className={mode === 'work' ? 'text-purple-400/60' : 'text-cyan-400/60'} />
            <span className="text-3xl font-light tracking-widest text-white/90 mt-1">{mins}:{sec}</span>
            <span className="text-[9px] uppercase tracking-widest text-white/25 mt-0.5">{modeLabel}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset} className="p-2 rounded-xl text-white/25 hover:text-white hover:bg-white/8 transition-all">
            <RotateCcw size={14} />
          </button>
          <button onClick={toggle}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium border transition-all ${
              running ? 'bg-white/8 border-white/15 text-white' : mode === 'work' ? 'bg-purple-600/20 border-purple-500/30 text-purple-300 hover:bg-purple-600/30' : 'bg-cyan-600/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30'
            }`}>
            {running ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
        </div>

        {/* Round dots */}
        <div className="flex gap-1.5">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < (rounds % 4) ? 'bg-purple-400/60' : 'bg-white/10'}`} />
          ))}
        </div>
        <p className="text-white/20 text-[9px]">{rounds} sessions done</p>
      </div>

      {/* ── Tasks side ── */}
      <div className="flex-1 flex flex-col p-4 min-h-0">
        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3 shrink-0">Tasks</p>

        <div className="flex-1 overflow-y-auto space-y-1.5 morph-scrollbar mb-3">
          <AnimatePresence>
            {tasks.length === 0 && (
              <p className="text-white/15 text-xs text-center py-6">Add tasks to focus on</p>
            )}
            {tasks.map(t => (
              <motion.div key={t.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${t.done ? 'bg-white/2 border-white/4 opacity-50' : 'bg-white/3 border-white/[0.07]'}`}>
                <button onClick={() => toggleTask(t.id)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${t.done ? 'bg-emerald-500/30 border-emerald-500/50' : 'border-white/20 hover:border-white/40'}`}>
                  {t.done && <Check size={9} className="text-emerald-400" />}
                </button>
                <span className={`text-sm flex-1 ${t.done ? 'line-through text-white/25' : 'text-white/65'}`}>{t.text}</span>
                <button onClick={() => removeTask(t.id)} className="text-white/15 hover:text-red-400 transition-colors shrink-0">
                  <X size={11} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 shrink-0">
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task…"
            className="flex-1 bg-white/3 border border-white/6 focus:border-white/15 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/18 outline-none transition-colors" />
          <button onClick={addTask}
            className="px-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
