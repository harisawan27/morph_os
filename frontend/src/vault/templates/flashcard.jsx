import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: flashcard]

const seedData = {{DATA_JSON}};

const DEFAULT_CARDS = [
  { front: 'What is photosynthesis?',          back: 'The process by which plants convert sunlight, water, and CO₂ into glucose and oxygen.' },
  { front: 'What is Newton\'s First Law?',     back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted on by an external force.' },
  { front: 'What does DNA stand for?',         back: 'Deoxyribonucleic Acid — the molecule that carries genetic information.' },
  { front: 'What is the speed of light?',      back: 'Approximately 299,792,458 m/s (3×10⁸ m/s) in vacuum.' },
  { front: 'Who wrote Romeo and Juliet?',      back: 'William Shakespeare, written around 1594–1596.' },
];

export default function Flashcards() {
  const topic = seedData.topic || 'Study Cards';
  const cards = (seedData.cards && seedData.cards.length) ? seedData.cards : DEFAULT_CARDS;

  const [index,   setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known,   setKnown]   = useState(new Set());
  const [dir,     setDir]     = useState(1);
  const [done,    setDone]    = useState(false);

  const go = (d) => {
    if (index + d < 0 || index + d >= cards.length) return;
    setDir(d);
    setFlipped(false);
    setTimeout(() => setIndex(i => i + d), 100);
  };

  const markKnown = () => {
    const next = new Set(known).add(index);
    setKnown(next);
    if (next.size === cards.length) { setDone(true); return; }
    if (index < cards.length - 1) go(1); else go(-1);
  };

  const reset = () => { setIndex(0); setFlipped(false); setKnown(new Set()); setDone(false); };

  if (done) return (
    <div className="h-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-5 text-white p-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
        <Check size={26} className="text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-white/80 text-lg font-light">All {cards.length} cards mastered!</p>
        <p className="text-white/25 text-sm mt-1">{topic}</p>
      </div>
      <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-white/6 border border-white/10 rounded-2xl text-sm text-white/60 hover:text-white transition-all">
        <RotateCcw size={13} /> Start over
      </button>
    </div>
  );

  const card = cards[index];
  const isKnown = known.has(index);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 gap-6 select-none">

      {/* Progress */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-white/25 mb-2">
          <span>{topic}</span>
          <span>{index + 1} / {cards.length} · {known.size} known</span>
        </div>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${known.has(i) ? 'bg-emerald-500' : i === index ? 'bg-white/50' : 'bg-white/8'}`} />
          ))}
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ x: dir * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -dir * 40, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-md"
        >
          <div
            className={`relative w-full aspect-[4/3] cursor-pointer`}
            style={{ perspective: '1000px' }}
            onClick={() => setFlipped(f => !f)}
          >
            <motion.div
              className="w-full h-full"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 200, damping: 25 }}
              style={{ transformStyle: 'preserve-3d', position: 'relative' }}
            >
              {/* Front */}
              <div className={`absolute inset-0 bg-white/4 border ${isKnown ? 'border-emerald-500/25' : 'border-white/10'} rounded-3xl flex flex-col items-center justify-center p-6 backface-hidden`}
                style={{ backfaceVisibility: 'hidden' }}>
                <p className="text-[9px] uppercase tracking-widest text-white/20 mb-3">Question</p>
                <p className="text-white/85 text-center text-lg font-light leading-relaxed">{card.front}</p>
                <p className="text-white/15 text-xs mt-4">Tap to reveal</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 bg-white/[0.06] border border-white/15 rounded-3xl flex flex-col items-center justify-center p-6"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className="text-[9px] uppercase tracking-widest text-white/20 mb-3">Answer</p>
                <p className="text-white/90 text-center text-base font-light leading-relaxed">{card.back}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={() => go(-1)} disabled={index === 0}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-25 transition-all">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => { setKnown(prev => { const n = new Set(prev); n.delete(index); return n; }); if(index < cards.length-1) go(1); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400/70 hover:text-red-400 text-sm transition-all">
          <X size={13} /> Skip
        </button>
        <button onClick={markKnown}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/12 border border-emerald-500/20 rounded-xl text-emerald-400/80 hover:text-emerald-400 text-sm transition-all">
          <Check size={13} /> Got it
        </button>
        <button onClick={() => go(1)} disabled={index === cards.length - 1}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-25 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
