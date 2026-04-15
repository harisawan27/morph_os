import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, ListChecks, Flame, Minus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: todo]

const STORAGE_KEY = 'morph_todo_v1';

const PRIORITIES = {
  high:   { label: 'High',   color: 'text-red-400',    dot: 'bg-red-400',    ring: 'ring-red-500/30' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-400', ring: 'ring-yellow-500/30' },
  low:    { label: 'Low',    color: 'text-blue-400',   dot: 'bg-blue-400',   ring: 'ring-blue-500/30' },
};

const FILTERS = ['All', 'Active', 'Done'];

const SEED_TASKS = [
  { id: 1, text: 'Launch Morph OS v1',     completed: true,  priority: 'high' },
  { id: 2, text: 'Polish vault templates', completed: false, priority: 'high' },
  { id: 3, text: 'Wire semantic cache',    completed: false, priority: 'medium' },
];

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED_TASKS;
}

function saveTodos(todos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); } catch {}
  if (typeof morphSaveState !== 'undefined') morphSaveState(todos);
}

export default function TodoArtifact() {
  const [todos, setTodosRaw] = useState(() => loadTodos());
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('All');
  const [showPrioPicker, setShowPrioPicker] = useState(false);

  // On mount: hydrate from cloud (overrides localStorage if cloud has newer state)
  useEffect(() => {
    if (typeof morphLoadState !== 'undefined') {
      morphLoadState().then(s => { if (Array.isArray(s)) setTodosRaw(s); }).catch(() => {});
    }
  }, []);

  // Wrap setter to always persist
  const setTodos = (updater) => {
    setTodosRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveTodos(next);
      return next;
    });
  };

  const addTodo = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: input.trim(), completed: false, priority }]);
    setInput('');
    setShowPrioPicker(false);
  };

  const toggle = (id) => setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const remove = (id) => setTodos(prev => prev.filter(t => t.id !== id));

  const visible = todos.filter(t => {
    if (filter === 'Active') return !t.completed;
    if (filter === 'Done')   return t.completed;
    return true;
  });

  const done  = todos.filter(t => t.completed).length;
  const total = todos.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const p = PRIORITIES[priority];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white p-6 justify-center items-center font-sans overflow-hidden">
      <div className="w-full max-w-lg bg-white/4 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <header className="flex justify-between items-center mb-7 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ListChecks className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-tight">The Ledger</h1>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mt-0.5">{done}/{total} completed</p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="rgb(59,130,246)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${pct * 0.942} 94.2`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/60">
              {pct}%
            </span>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 mb-5 p-1 bg-white/3 rounded-2xl border border-white/5 shrink-0">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                filter === f
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({f === 'Active' ? todos.filter(t => !t.completed).length : done})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={addTodo} className="flex gap-2 mb-5 shrink-0 relative">
          <div className="relative flex-1">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all pr-28"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Morph a new task..."
            />
            {/* Priority picker inline */}
            <button
              type="button"
              onClick={() => setShowPrioPicker(v => !v)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/7 border border-white/10 transition-all ring-1 ${p.ring} ${p.color} text-[10px] uppercase tracking-wider`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
              {p.label}
              <ChevronDown size={10} />
            </button>
            <AnimatePresence>
              {showPrioPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute right-0 top-full mt-2 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 min-w-32.5"
                >
                  {Object.entries(PRIORITIES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setPriority(key); setShowPrioPicker(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs hover:bg-white/5 transition-colors ${val.color}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                      {val.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="submit"
            className="p-3.5 bg-blue-600/80 hover:bg-blue-600 rounded-2xl transition-all border border-blue-500/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            <Plus size={20} />
          </button>
        </form>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          <AnimatePresence initial={false}>
            {visible.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-32 flex flex-col items-center justify-center opacity-20"
              >
                <ListChecks size={36} />
                <p className="mt-3 text-[10px] tracking-widest uppercase">
                  {filter === 'Done' ? 'Nothing completed yet' : 'Clear field'}
                </p>
              </motion.div>
            ) : (
              visible.map((todo) => {
                const tp = PRIORITIES[todo.priority] || PRIORITIES.medium;
                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, scale: 0.97 }}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      todo.completed
                        ? 'bg-white/2 border-white/5'
                        : 'bg-white/5 border-white/10 hover:bg-white/8'
                    }`}
                    onClick={() => toggle(todo.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {todo.completed
                        ? <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                        : <Circle size={18} className={`shrink-0 ${tp.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                      }
                      <span className={`text-sm leading-tight truncate ${todo.completed ? 'line-through text-white/20' : 'text-white/80'}`}>
                        {todo.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`hidden sm:flex items-center gap-1 text-[9px] uppercase tracking-wider ${tp.color} opacity-40`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tp.dot}`} />
                        {tp.label}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(todo.id); }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-5 pt-5 border-t border-white/5 flex justify-between items-center shrink-0 opacity-40">
          <span className="text-[10px] uppercase tracking-widest">
            {todos.filter(t => !t.completed).length} remaining
          </span>
          {done > 0 && (
            <button
              onClick={() => setTodos(prev => prev.filter(t => !t.completed))}
              className="text-[10px] uppercase tracking-widest hover:text-white/80 transition-colors"
            >
              Clear done
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
