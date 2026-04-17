import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Timer, Flag, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: timer]

const TIMER_STORAGE = 'morph_timer_prefs_v1';
function loadPrefs() {
  try { const r = localStorage.getItem(TIMER_STORAGE); if (r) return JSON.parse(r); } catch {}
  return { mode: 'Pomodoro', countdownTotal: 5 * 60 };
}
function savePrefs(prefs) {
  try { localStorage.setItem(TIMER_STORAGE, JSON.stringify(prefs)); } catch {}
  if (typeof morphSaveState !== 'undefined') morphSaveState(prefs);
}

const MODES = ['Pomodoro', 'Stopwatch', 'Countdown'];
const POMO_WORK   = 25 * 60;
const POMO_BREAK  = 5  * 60;

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// SVG Ring progress
function Ring({ pct, size = 220, stroke = 10, color = '#3b82f6', children }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--morph-05)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.4s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function TimerArtifact() {
  const [mode, setModeState]  = useState(() => loadPrefs().mode);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(() => {
    const p = loadPrefs();
    return p.mode === 'Pomodoro' ? POMO_WORK : p.countdownTotal;
  });
  const [pomoPhase, setPomoPhase]   = useState('Work');
  const [pomoCount, setPomoCount]   = useState(0);
  const [countdownTotal, setCountdownTotalRaw] = useState(() => loadPrefs().countdownTotal);
  const [laps, setLaps]     = useState([]);
  const intervalRef = useRef(null);

  // On mount: hydrate prefs from cloud
  useEffect(() => {
    if (typeof morphLoadState !== 'undefined') {
      morphLoadState().then(s => {
        if (s && typeof s === 'object') {
          if (s.mode)            setModeState(s.mode);
          if (s.countdownTotal)  { setCountdownTotalRaw(s.countdownTotal); setRemaining(s.countdownTotal); }
        }
      }).catch(() => {});
    }
  }, []);

  const setMode = (m) => {
    setModeState(m);
    savePrefs({ mode: m, countdownTotal });
  };
  const setCountdownTotal = (v) => {
    setCountdownTotalRaw(v);
    savePrefs({ mode, countdownTotal: v });
  };

  const tick = useCallback(() => {
    if (mode === 'Stopwatch') {
      setElapsed(e => e + 1);
    } else {
      setRemaining(r => {
        if (r <= 1) {
          // Phase complete
          if (mode === 'Pomodoro') {
            if (pomoPhase === 'Work') {
              setPomoCount(c => c + 1);
              setPomoPhase('Break');
              return POMO_BREAK;
            } else {
              setPomoPhase('Work');
              return POMO_WORK;
            }
          } else {
            // Countdown done
            setRunning(false);
            return 0;
          }
        }
        return r - 1;
      });
    }
  }, [mode, pomoPhase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    if (mode === 'Pomodoro') { setRemaining(POMO_WORK); setPomoPhase('Work'); }
    if (mode === 'Countdown') setRemaining(countdownTotal);
  };

  const lap = () => {
    if (mode === 'Stopwatch') setLaps(l => [elapsed, ...l].slice(0, 8));
  };

  const adjustCountdown = (delta) => {
    if (running) return;
    const next = Math.max(60, countdownTotal + delta);
    setCountdownTotal(next);
    setRemaining(next);
  };

  const switchMode = (m) => {
    setMode(m);
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    if (m === 'Pomodoro')  { setRemaining(POMO_WORK); setPomoPhase('Work'); }
    if (m === 'Countdown') setRemaining(countdownTotal);
  };

  // Ring config
  let ringPct = 0, ringColor = '#3b82f6', timeDisplay = '00:00', subLabel = '';
  if (mode === 'Stopwatch') {
    ringPct = (elapsed % 60) / 60;
    ringColor = '#a855f7';
    timeDisplay = formatTime(elapsed);
    subLabel = `${laps.length} laps`;
  } else if (mode === 'Pomodoro') {
    const total = pomoPhase === 'Work' ? POMO_WORK : POMO_BREAK;
    ringPct = 1 - remaining / total;
    ringColor = pomoPhase === 'Work' ? '#3b82f6' : '#22c55e';
    timeDisplay = formatTime(remaining);
    subLabel = `${pomoPhase} • Session ${pomoCount + 1}`;
  } else {
    ringPct = 1 - remaining / countdownTotal;
    ringColor = remaining <= 10 ? '#ef4444' : '#f59e0b';
    timeDisplay = formatTime(remaining);
    subLabel = remaining === 0 ? 'Done!' : 'counting down';
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-white/4 rounded-2xl border border-white/7 w-full">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                mode === m ? 'bg-white/10 text-white font-bold' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Countdown adjust */}
        {mode === 'Countdown' && !running && (
          <div className="flex items-center gap-4">
            {[[-300,'-5m'],[-60,'-1m'],[60,'+1m'],[300,'+5m']].map(([d,l]) => (
              <button key={l} onClick={() => adjustCountdown(d)}
                className="px-3 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/10 transition-all uppercase tracking-wider">
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Ring */}
        <Ring pct={ringPct} color={ringColor}>
          <span className="text-4xl font-extralight font-mono tracking-tighter">{timeDisplay}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/30 mt-1">{subLabel}</span>
          {mode === 'Pomodoro' && pomoCount > 0 && (
            <div className="flex gap-1 mt-2">
              {[...Array(Math.min(pomoCount, 8))].map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
              ))}
            </div>
          )}
        </Ring>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={reset}
            className="p-4 rounded-2xl bg-white/5 border border-white/7 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <RotateCcw size={20} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRunning(r => !r)}
            className="px-10 py-4 rounded-2xl font-medium text-sm tracking-wide transition-all border"
            style={{
              background: running ? 'var(--morph-08)' : ringColor + '22',
              borderColor: running ? 'var(--morph-10)' : ringColor + '55',
              color:       running ? 'var(--morph-70)' : ringColor,
              boxShadow:   running ? 'none' : `0 0 30px ${ringColor}33`,
            }}
          >
            {running ? <Pause size={22} /> : <Play size={22} />}
          </motion.button>

          {mode === 'Stopwatch' ? (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={lap}
              disabled={!running}
              className="p-4 rounded-2xl bg-white/5 border border-white/7 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20"
            >
              <Flag size={20} />
            </motion.button>
          ) : (
            <div className="p-4 rounded-2xl bg-white/2 border border-white/4">
              {mode === 'Pomodoro'
                ? <Coffee size={20} className="text-white/20" />
                : <Timer size={20} className="text-white/20" />}
            </div>
          )}
        </div>

        {/* Laps */}
        <AnimatePresence>
          {laps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="w-full space-y-1.5 overflow-hidden"
            >
              {laps.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-between px-5 py-2.5 bg-white/3 border border-white/5 rounded-xl"
                >
                  <span className="text-[10px] uppercase tracking-widest text-white/25">Lap {laps.length - i}</span>
                  <span className="text-xs font-mono text-white/50">{formatTime(t)}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
