import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Zap, Target, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: typing]

const PASSAGES = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. The future belongs to those who believe in the beauty of their dreams.",
  "In the middle of every difficulty lies opportunity. Imagination is more important than knowledge. Life is what happens when you are busy making other plans.",
  "The only way to do great work is to love what you do. Stay hungry, stay foolish. Innovation distinguishes between a leader and a follower.",
  "To be or not to be that is the question. All that glitters is not gold. We know what we are but know not what we may be.",
];

const TIME_LIMIT = 60;

export default function TypingTest() {
  const [passage,  setPassage]  = useState(() => PASSAGES[Math.floor(Math.random() * PASSAGES.length)]);
  const [typed,    setTyped]    = useState('');
  const [started,  setStarted]  = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [done,     setDone]     = useState(false);
  const [wpm,      setWpm]      = useState(0);
  const [acc,      setAcc]      = useState(100);
  const [best,     setBest]     = useState(() => {
    try { const v = localStorage.getItem('morph_typing_best'); return v ? parseInt(v, 10) : null; } catch { return null; }
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!started || done) return;
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); finish(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, done]);

  const finish = useCallback(() => {
    setDone(true);
    setStarted(false);
  }, []);

  useEffect(() => {
    if (done) {
      const elapsed = (TIME_LIMIT - timeLeft) || TIME_LIMIT;
      const words   = typed.trim().split(/\s+/).filter(Boolean).length;
      const mins    = elapsed / 60;
      const w       = Math.round(words / mins);
      const correct = [...typed].filter((ch, i) => ch === passage[i]).length;
      const a       = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 0;
      setWpm(w);
      setAcc(a);
      if (!best || w > best) {
        setBest(w);
        try { localStorage.setItem('morph_typing_best', String(w)); } catch {}
      }
    }
  }, [done]);

  const handleInput = (e) => {
    const val = e.target.value;
    if (!started && val.length > 0) setStarted(true);
    if (val.length > passage.length) return;
    setTyped(val);
    if (val === passage) finish();
  };

  const reset = () => {
    setPassage(PASSAGES[Math.floor(Math.random() * PASSAGES.length)]);
    setTyped('');
    setStarted(false);
    setTimeLeft(TIME_LIMIT);
    setDone(false);
    setWpm(0);
    setAcc(100);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 20 ? 'bg-emerald-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-5 gap-4 overflow-hidden">

      {/* Stats bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-white/35">
            <Zap size={11} className="text-purple-400" /> <span>{started || done ? wpm : '—'} WPM</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/35">
            <Target size={11} className="text-blue-400" /> <span>{done ? acc : started ? Math.round((([...typed].filter((c,i) => c === passage[i]).length) / Math.max(1, typed.length)) * 100) : '—'}%</span>
          </div>
          {best && <div className="text-xs text-white/20">Best: {best} WPM</div>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/35">
            <Clock size={11} className={timeLeft <= 10 ? 'text-red-400' : 'text-white/30'} />
            <span className={timeLeft <= 10 && started ? 'text-red-400' : ''}>{timeLeft}s</span>
          </div>
          <button onClick={reset} className="p-1.5 rounded-xl text-white/25 hover:text-white hover:bg-white/8 transition-all">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-0.5 bg-white/5 rounded-full shrink-0">
        <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Results overlay */}
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#0a0a0a]/90 backdrop-blur-sm">
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-white text-3xl font-light">{wpm}</p>
                <p className="text-white/30 text-xs uppercase tracking-widest mt-1">WPM</p>
              </div>
              <div>
                <p className="text-white text-3xl font-light">{acc}%</p>
                <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Accuracy</p>
              </div>
              <div>
                <p className={`text-3xl font-light ${best === wpm ? 'text-yellow-400' : 'text-white/40'}`}>{best}</p>
                <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Best</p>
              </div>
            </div>
            {wpm >= 80 ? <p className="text-emerald-400/60 text-sm">Exceptional! 🔥</p>
              : wpm >= 50 ? <p className="text-blue-400/60 text-sm">Great speed! ⚡</p>
              : <p className="text-white/30 text-sm">Keep practicing!</p>}
            <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-white/6 border border-white/10 rounded-2xl text-white/60 hover:text-white text-sm transition-all">
              <RotateCcw size={13} /> Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passage display */}
      <div className="flex-1 bg-white/2 border border-white/6 rounded-2xl p-4 font-mono text-sm leading-relaxed overflow-hidden">
        {[...passage].map((ch, i) => {
          let cls = 'text-white/20';
          if (i < typed.length) cls = typed[i] === ch ? 'text-white/70' : 'text-red-400 bg-red-500/15 rounded';
          if (i === typed.length) cls = 'text-white bg-white/15 rounded';
          return <span key={i} className={cls}>{ch}</span>;
        })}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        value={typed}
        onChange={handleInput}
        disabled={done}
        placeholder={started ? '' : 'Start typing to begin…'}
        className="shrink-0 bg-white/3 border border-white/[0.07] focus:border-white/15 rounded-2xl px-4 py-3 text-sm text-white/80 placeholder-white/18 outline-none font-mono transition-colors"
        autoComplete="off" autoCorrect="off" spellCheck="false"
      />
    </div>
  );
}
