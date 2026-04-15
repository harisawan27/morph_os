import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Flame, Check } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: habit]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayIndex() {
  return (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun
}

const STORAGE_KEY = 'morph_habit_v1';
const DEFAULT_HABITS = [
  { id: 1, name: 'Morning walk',   checks: [true,  true,  false, true,  false, false, false] },
  { id: 2, name: 'Read 30 min',    checks: [true,  false, true,  true,  true,  false, false] },
  { id: 3, name: 'Drink 2L water', checks: [true,  true,  true,  false, true,  true,  false] },
];
function loadHabits() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}

export default function HabitTracker() {
  const [habits, setHabits] = useState(() => loadHabits() || DEFAULT_HABITS);
  const [input, setInput] = useState('');
  const today = todayIndex();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); } catch {}
  }, [habits]);

  const addHabit = () => {
    if (!input.trim()) return;
    setHabits(prev => [...prev, { id: Date.now(), name: input.trim(), checks: Array(7).fill(false) }]);
    setInput('');
  };

  const toggle = (habitId, dayIdx) => {
    setHabits(prev => prev.map(h =>
      h.id === habitId ? { ...h, checks: h.checks.map((c, i) => i === dayIdx ? !c : c) } : h
    ));
  };

  const remove = id => setHabits(prev => prev.filter(h => h.id !== id));

  const streak = checks => {
    let s = 0;
    for (let i = today; i >= 0; i--) { if (checks[i]) s++; else break; }
    return s;
  };

  const totalToday = useMemo(() =>
    habits.filter(h => h.checks[today]).length, [habits, today]);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-end justify-between mb-1">
          <h2 className="text-lg font-light text-white/80">Habits</h2>
          <span className="text-white/30 text-sm">{totalToday}/{habits.length} today</span>
        </div>
        {/* Today progress bar */}
        <div className="w-full h-1 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: habits.length ? `${(totalToday / habits.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[1fr_repeat(7,32px)] gap-1 px-5 mb-2 shrink-0">
        <div />
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-[9px] uppercase tracking-wider ${i === today ? 'text-purple-400' : 'text-white/20'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Habit rows */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2 morph-scrollbar pb-4">
        {habits.map(h => (
          <div key={h.id} className="group grid grid-cols-[1fr_repeat(7,32px)] gap-1 items-center">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <button onClick={() => remove(h.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-white/15 hover:text-red-400 transition-all">
                <Trash2 size={12} />
              </button>
              <span className="text-sm text-white/70 truncate">{h.name}</span>
              {streak(h.checks) > 1 && (
                <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-orange-400">
                  <Flame size={10} />{streak(h.checks)}
                </span>
              )}
            </div>
            {h.checks.map((checked, i) => (
              <button key={i} onClick={() => toggle(h.id, i)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  i === today ? 'ring-1 ring-purple-500/40' : ''
                } ${checked ? 'bg-purple-500/25 text-purple-400' : 'bg-white/4 text-white/10 hover:bg-white/8 hover:text-white/30'}`}>
                {checked && <Check size={13} strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        ))}

        {habits.length === 0 && (
          <p className="text-center text-white/15 text-xs pt-6">Add a habit to get started</p>
        )}
      </div>

      {/* Add habit */}
      <div className="px-5 pb-5 shrink-0">
        <div className="flex gap-2 bg-white/4 border border-white/8 rounded-2xl px-4 py-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()}
            placeholder="Add a new habit..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
          <button onClick={addHabit} className="w-7 h-7 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all">
            <Plus size={13} className="text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
}
