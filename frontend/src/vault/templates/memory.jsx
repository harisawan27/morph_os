import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Trophy, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: memory]

const EMOJIS = ['🎮','🎯','🎨','🎭','🎪','🎬','🎤','🎵','🚀','🌙','⚡','🔥','💎','🎲','🌊','🦋'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards() {
  const pairs = EMOJIS.slice(0, 8);
  return shuffle([...pairs, ...pairs].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })));
}

export default function MemoryGame() {
  const [cards,    setCards]    = useState(makeCards);
  const [flipped,  setFlipped]  = useState([]);
  const [moves,    setMoves]    = useState(0);
  const [matches,  setMatches]  = useState(0);
  const [lock,     setLock]     = useState(false);
  const [secs,     setSecs]     = useState(0);
  const [running,  setRunning]  = useState(false);
  const [best,     setBest]     = useState(() => {
    try { const v = localStorage.getItem('morph_memory_best'); return v ? parseInt(v, 10) : null; } catch { return null; }
  });

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const flip = useCallback((id) => {
    if (lock || flipped.length === 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (!running) setRunning(true);

    const next = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const nowFlipped = [...flipped, id];
    setCards(next);
    setFlipped(nowFlipped);

    if (nowFlipped.length === 2) {
      setMoves(m => m + 1);
      setLock(true);
      const [a, b] = nowFlipped.map(fid => next.find(c => c.id === fid));
      if (a.emoji === b.emoji) {
        const done = next.map(c => nowFlipped.includes(c.id) ? { ...c, matched: true } : c);
        setCards(done);
        setFlipped([]);
        setLock(false);
        const newMatches = matches + 1;
        setMatches(newMatches);
        if (newMatches === 8) {
          setRunning(false);
          const newBest = moves + 1;
          if (!best || newBest < best) {
            setBest(newBest);
            try { localStorage.setItem('morph_memory_best', String(newBest)); } catch {}
          }
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => nowFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setLock(false);
        }, 900);
      }
    }
  }, [cards, flipped, lock, matches, moves, running, best]);

  const reset = () => {
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setLock(false);
    setSecs(0);
    setRunning(false);
  };

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const won = matches === 8;

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-4 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/35 text-xs">
            <Zap size={11} className="text-purple-400" />
            <span>{moves} moves</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/35 text-xs">
            <Clock size={11} className="text-blue-400" />
            <span>{fmt(secs)}</span>
          </div>
          {best && (
            <div className="flex items-center gap-1.5 text-white/25 text-xs">
              <Trophy size={10} className="text-yellow-400" />
              <span>Best: {best}</span>
            </div>
          )}
        </div>
        <button onClick={reset} className="p-1.5 rounded-xl text-white/25 hover:text-white hover:bg-white/8 transition-all">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Progress */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-3 shrink-0">
        <div className="h-full bg-purple-500/60 rounded-full transition-all duration-500" style={{ width: `${(matches / 8) * 100}%` }} />
      </div>

      {/* Win overlay */}
      <AnimatePresence>
        {won && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
            <div className="text-5xl">🎉</div>
            <div className="text-center">
              <p className="text-white text-xl font-light">You matched them all!</p>
              <p className="text-white/40 text-sm mt-1">{moves} moves · {fmt(secs)}</p>
              {best === moves && <p className="text-yellow-400 text-xs mt-1">New best!</p>}
            </div>
            <button onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-white/70 hover:text-white text-sm transition-all">
              <RotateCcw size={13} /> Play again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-4 gap-2 content-center">
        {cards.map(card => (
          <motion.button
            key={card.id}
            onClick={() => flip(card.id)}
            whileTap={{ scale: 0.94 }}
            className={`aspect-square rounded-2xl flex items-center justify-center text-2xl border transition-all duration-300 ${
              card.matched
                ? 'bg-emerald-500/15 border-emerald-500/30 cursor-default'
                : card.flipped
                ? 'bg-white/8 border-white/15'
                : 'bg-white/4 border-white/8 hover:bg-white/[0.07] cursor-pointer'
            }`}
          >
            <motion.span
              initial={false}
              animate={{ rotateY: card.flipped || card.matched ? 0 : 180, opacity: card.flipped || card.matched ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            >
              {card.flipped || card.matched ? card.emoji : ''}
            </motion.span>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-white/15 text-[10px] uppercase tracking-widest mt-3 shrink-0">
        {matches}/8 pairs found
      </p>
    </div>
  );
}
