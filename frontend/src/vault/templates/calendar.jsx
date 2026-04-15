import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: calendar]

const STORAGE_KEY = 'morph_calendar_events';
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveEvents(e) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); } catch {}
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function startDay(y, m)    { return new Date(y, m, 1).getDay(); }
function dateKey(y, m, d)  { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

export default function CalendarApp() {
  const now   = new Date();
  const [year,   setYear]   = useState(now.getFullYear());
  const [month,  setMonth]  = useState(now.getMonth());
  const [events, setEvents] = useState(loadEvents);
  const [sel,    setSel]    = useState(null);   // selected day
  const [input,  setInput]  = useState('');

  const today = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSel(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSel(null);
  };

  const addEvent = () => {
    if (!input.trim() || !sel) return;
    const next = { ...events, [sel]: [...(events[sel] || []), input.trim()] };
    setEvents(next);
    saveEvents(next);
    setInput('');
  };

  const removeEvent = (key, idx) => {
    const list = [...(events[key] || [])];
    list.splice(idx, 1);
    const next = { ...events, [key]: list };
    if (!list.length) delete next[key];
    setEvents(next);
    saveEvents(next);
  };

  const total = daysInMonth(year, month);
  const start = startDay(year, month);
  const cells = Array(start).fill(null).concat(Array.from({ length: total }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const selKey   = sel ? dateKey(year, month, sel) : null;
  const selEvents = selKey ? (events[selKey] || []) : [];

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-4 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <button onClick={prevMonth} className="p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-white/30" />
          <h2 className="text-white/80 text-sm font-medium">{MONTHS[month]} {year}</h2>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] uppercase tracking-widest text-white/20 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key     = dateKey(year, month, day);
          const isToday = key === today;
          const isSel   = day === sel;
          const evCount = (events[key] || []).length;

          return (
            <button key={key} onClick={() => setSel(day === sel ? null : day)}
              className={`flex flex-col items-center justify-start pt-1 rounded-xl transition-all min-h-[40px] ${
                isSel    ? 'bg-purple-600/20 border border-purple-500/30' :
                isToday  ? 'bg-white/8 border border-white/15' :
                           'hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`text-xs font-medium leading-none ${isToday ? 'text-white' : isSel ? 'text-purple-300' : 'text-white/50'}`}>
                {day}
              </span>
              {evCount > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {Array(Math.min(evCount, 3)).fill(0).map((_, ii) => (
                    <span key={ii} className="w-1 h-1 rounded-full bg-purple-400/60" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="border-t border-white/[0.06] pt-3 mt-2">
              <p className="text-white/40 text-xs mb-2">{MONTHS[month]} {sel}</p>

              {/* Events list */}
              <div className="space-y-1 mb-2 max-h-20 overflow-y-auto morph-scrollbar">
                {selEvents.length === 0
                  ? <p className="text-white/15 text-xs">No events</p>
                  : selEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 shrink-0" />
                      <span className="text-xs text-white/60 flex-1 truncate">{ev}</span>
                      <button onClick={() => removeEvent(selKey, idx)} className="text-white/20 hover:text-red-400 transition-colors">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Add event */}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEvent()}
                  placeholder="Add event…"
                  className="flex-1 bg-white/[0.03] border border-white/[0.07] focus:border-white/15 rounded-xl px-3 py-2 text-xs text-white/70 placeholder-white/18 outline-none transition-colors"
                />
                <button onClick={addEvent}
                  className="px-3 py-2 bg-purple-600/15 border border-purple-500/25 rounded-xl text-purple-400 hover:bg-purple-600/25 transition-all">
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
