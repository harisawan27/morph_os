import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: toss]

const KEY = 'morph_toss_v1';
const load = () => { try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export default function CoinToss() {
  const [flipping, setFlipping]   = useState(false);
  const [side, setSide]           = useState(null);
  const [choice, setChoice]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [stats, setStats]         = useState(() => load() || { H: 0, T: 0, wins: 0, total: 0 });

  const flip = (picked) => {
    if (flipping) return;
    setChoice(picked);
    setFlipping(true);
    setSide(null);
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'H' : 'T';
      setSide(result);
      setFlipping(false);
      const won = picked === result;
      setStats(s => {
        const next = { ...s, [result]: s[result] + 1, wins: s.wins + (won ? 1 : 0), total: s.total + 1 };
        save(next);
        return next;
      });
      setHistory(h => [{ result, won }, ...h].slice(0, 10));
    }, 1100);
  };

  const reset = () => {
    setStats({ H: 0, T: 0, wins: 0, total: 0 });
    setHistory([]);
    setSide(null);
    setChoice(null);
    try { localStorage.removeItem(KEY); } catch {}
  };

  const pct = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-7 p-6 overflow-hidden select-none">

      {/* Title */}
      <p className="text-xs uppercase tracking-widest text-white/20">Coin Toss</p>

      {/* Stats row */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-2xl font-light" style={{ color: 'rgba(167,139,250,0.9)' }}>{stats.H}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/25 mt-1">Heads</p>
        </div>
        <div>
          <p className="text-xl font-light text-white/40">{pct}%</p>
          <p className="text-[9px] uppercase tracking-widest text-white/15 mt-1">Win rate</p>
        </div>
        <div>
          <p className="text-2xl font-light" style={{ color: 'rgba(96,165,250,0.9)' }}>{stats.T}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/25 mt-1">Tails</p>
        </div>
      </div>

      {/* Coin */}
      <motion.div
        animate={flipping ? {
          rotateY: [0, 90, 180, 270, 360, 450, 540, 630, 720],
          scale:   [1, 1.08, 1, 1.08, 1, 1.08, 1, 1.04, 1],
        } : {}}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
        className="w-36 h-36 rounded-full flex items-center justify-center font-bold text-3xl tracking-wide shadow-2xl"
        style={{
          background: flipping
            ? 'linear-gradient(135deg,#c9a227,#f0c040)'
            : side === 'H'
            ? 'linear-gradient(135deg,#7c3aed,#6366f1)'
            : side === 'T'
            ? 'linear-gradient(135deg,#1d4ed8,#0891b2)'
            : 'linear-gradient(135deg,#1c1c1c,#2a2a2a)',
          border: '3px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        }}
      >
        {flipping ? '✦' : side === 'H' ? 'H' : side === 'T' ? 'T' : '?'}
      </motion.div>

      {/* Result */}
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          {side && !flipping && (
            <motion.p
              key={side + stats.total}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-base font-light"
              style={{ color: choice === side ? 'rgba(167,139,250,0.85)' : 'rgba(248,113,113,0.85)' }}
            >
              {side === 'H' ? 'Heads' : 'Tails'} — {choice === side ? 'You called it! 🎯' : 'Bad luck'}
            </motion.p>
          )}
          {!side && !flipping && (
            <motion.p key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-white/25">
              Pick a side to flip
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => flip('H')}
          disabled={flipping}
          className="px-8 py-3 rounded-2xl text-sm font-medium transition-all duration-150 disabled:opacity-30 active:scale-95"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#c4b5fd' }}
        >
          Heads
        </button>
        <button
          onClick={() => flip('T')}
          disabled={flipping}
          className="px-8 py-3 rounded-2xl text-sm font-medium transition-all duration-150 disabled:opacity-30 active:scale-95"
          style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.35)', color: '#93c5fd' }}
        >
          Tails
        </button>
      </div>

      {/* History dots */}
      {history.length > 0 && (
        <div className="flex gap-1.5">
          {history.map((h, i) => (
            <span
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{
                background: h.won ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: h.won ? '#c4b5fd' : '#555',
              }}
            >
              {h.result}
            </span>
          ))}
        </div>
      )}

      {stats.total > 0 && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors"
        >
          <RotateCcw size={10} /> Reset stats
        </button>
      )}
    </div>
  );
}
