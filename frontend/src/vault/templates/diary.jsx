import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Save, Clock, RefreshCw, History, X } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: diary]

const STORAGE_KEY = 'morph_diary_v1';

const MOODS = [
  { emoji: '🌟', label: 'Amazing', color: '#f59e0b' },
  { emoji: '😊', label: 'Good',    color: '#22c55e' },
  { emoji: '😐', label: 'Okay',    color: '#94a3b8' },
  { emoji: '😔', label: 'Low',     color: '#60a5fa' },
  { emoji: '😤', label: 'Stressed',color: '#f87171' },
];

const PROMPTS = [
  'What made today worth remembering?',
  'What are you grateful for right now?',
  'What challenged you today, and what did you learn?',
  'Describe how you are feeling in three words.',
  'What is one thing you want to do differently tomorrow?',
  'What surprised you today?',
  'What conversation stayed with you?',
  'What did you do today that your future self will thank you for?',
  'Write about something that made you smile.',
  'What is weighing on your mind right now?',
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateLabel(dateStr) {
  const today = todayStr();
  const yest  = offsetDate(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yest)  return 'Yesterday';
  return formatShort(dateStr);
}

function wordCount(t) {
  return t.trim() ? t.trim().split(/\s+/).length : 0;
}

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

export default function Diary() {
  const today = todayStr();
  const [date,        setDate]        = useState(today);
  const [entries,     setEntries]     = useState(loadEntries);
  const [text,        setText]        = useState('');
  const [mood,        setMood]        = useState(null);
  const [savedFlag,   setSavedFlag]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [prompt,      setPrompt]      = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [saveFlash,   setSaveFlash]   = useState(false);
  const taRef = useRef(null);

  // Load entry when date changes
  useEffect(() => {
    const e = entries[date];
    setText(e?.text ?? '');
    setMood(e?.mood ?? null);
    setSavedFlag(!!e?.text);
  }, [date]);

  const currentEntry = entries[date];
  const isDirty = text !== (currentEntry?.text ?? '');
  const wc = wordCount(text);

  const save = useCallback(() => {
    if (!text.trim()) return;
    const updated = {
      ...entries,
      [date]: {
        text,
        mood,
        words: wordCount(text),
        savedAt: new Date().toISOString(),
      },
    };
    setEntries(updated);
    saveEntries(updated);
    setSavedFlag(true);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1800);
  }, [text, mood, date, entries]);

  // Auto-save on blur
  const onBlur = () => { if (isDirty && text.trim()) save(); };

  const navigate = (dir) => {
    const next = offsetDate(date, dir);
    if (next <= today) setDate(next);
  };

  const allDates = Object.keys(entries).sort().reverse();
  const moodObj = MOODS.find(m => m.label === mood);

  return (
    <div className="flex flex-col h-full min-h-screen" style={{ background: 'linear-gradient(160deg,#080810 0%,#0c0c18 60%,#080f18 100%)', color: '#e2e8f0' }}>

      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(59,130,246,0.15))', border: '1px solid rgba(139,92,246,0.25)' }}>
              📔
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>Daily Diary</div>
              {wc > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={9} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui' }}>
                    {wc} words · {Math.max(1, Math.ceil(wc / 200))} min read
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all"
            style={{
              background: showHistory ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showHistory ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: showHistory ? '#a78bfa' : 'rgba(255,255,255,0.35)',
              fontFamily: 'system-ui',
            }}
          >
            <History size={11} />
            {allDates.length > 0 ? `${allDates.length} entries` : 'History'}
          </button>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
            <ChevronLeft size={14} />
          </button>

          <div className="flex-1 text-center">
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
              style={{ color: date === today ? '#a78bfa' : 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
              {dateLabel(date)}
            </div>
            <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>
              {formatFull(date)}
            </div>
          </div>

          <button onClick={() => navigate(1)} disabled={date >= today}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              color: date >= today ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
              cursor: date >= today ? 'default' : 'pointer',
            }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <div className="shrink-0 overflow-y-auto" style={{ maxHeight: 180, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
          <div className="p-4">
            {allDates.length === 0 ? (
              <p className="text-center text-[12px] py-4" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui' }}>No entries yet. Start writing!</p>
            ) : (
              <div className="space-y-2">
                {allDates.map(d => {
                  const e = entries[d];
                  const m = MOODS.find(mx => mx.label === e.mood);
                  const isActive = d === date;
                  return (
                    <button key={d} onClick={() => { setDate(d); setShowHistory(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: isActive ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isActive ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      <span className="text-base">{m?.emoji ?? '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>{dateLabel(d)}</div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui' }}>
                          {e.text.slice(0, 60)}{e.text.length > 60 ? '…' : ''}
                        </div>
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui' }}>{e.words}w</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mood row ── */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-[10px] uppercase tracking-widest mr-1" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui' }}>Mood</span>
        {MOODS.map(m => (
          <button key={m.label} title={m.label} onClick={() => setMood(mood === m.label ? null : m.label)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all"
            style={{
              background: mood === m.label ? `${m.color}22` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${mood === m.label ? m.color + '55' : 'rgba(255,255,255,0.06)'}`,
              transform: mood === m.label ? 'scale(1.18)' : 'scale(1)',
            }}>
            {m.emoji}
          </button>
        ))}
        {moodObj && (
          <span className="text-[11px] ml-1" style={{ color: moodObj.color, fontFamily: 'system-ui', opacity: 0.8 }}>{moodObj.label}</span>
        )}
      </div>

      {/* ── Writing prompt ── */}
      {!text && (
        <div className="shrink-0 mx-5 mt-3 mb-1">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(139,92,246,0.04)', border: '1px dashed rgba(139,92,246,0.14)' }}>
            <span className="text-base mt-0.5 shrink-0">✍️</span>
            <p className="text-[12px] italic leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Georgia, serif' }}>
              "{prompt}"
            </p>
            <button onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])} title="New prompt"
              className="shrink-0 mt-0.5 transition-opacity" style={{ color: 'rgba(255,255,255,0.2)', opacity: 0.7 }}>
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Textarea ── */}
      <div className="flex-1 px-5 py-4">
        <textarea
          ref={taRef}
          value={text}
          onChange={e => { setText(e.target.value); setSavedFlag(false); }}
          onBlur={onBlur}
          placeholder={`Write freely — this is your space.\n\n${prompt}`}
          className="w-full h-full min-h-[200px] outline-none resize-none rounded-2xl px-5 py-4 text-[15px] leading-[1.9] transition-colors"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'Georgia, Merriweather, serif',
            caretColor: '#a78bfa',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.3)'; }}
          onBlurCapture={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        />
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 pb-6 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {text && (
          <button onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
            <RefreshCw size={10} />
            New prompt
          </button>
        )}
        {!text && <div />}

        <div className="flex items-center gap-3">
          {saveFlash && (
            <span className="text-[11px]" style={{ color: 'rgba(34,197,94,0.7)', fontFamily: 'system-ui' }}>✓ Saved</span>
          )}
          <button
            onClick={save}
            disabled={!text.trim() || (!isDirty && savedFlag)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-all"
            style={{
              background: isDirty || !savedFlag ? 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(59,130,246,0.2))' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isDirty || !savedFlag ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
              color: isDirty || !savedFlag ? '#c4b5fd' : 'rgba(255,255,255,0.2)',
              cursor: !text.trim() || (!isDirty && savedFlag) ? 'default' : 'pointer',
              fontFamily: 'system-ui',
            }}>
            <Save size={12} />
            {!savedFlag ? 'Save entry' : isDirty ? 'Update' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  );
}
