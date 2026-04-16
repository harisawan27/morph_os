import React, { useState, useRef, useCallback } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: spinwheel]

const seedData = {{DATA_JSON}};

const DEFAULT_OPTIONS = ['Pizza 🍕','Sushi 🍣','Tacos 🌮','Burgers 🍔','Ramen 🍜','Salad 🥗'];

const COLORS = [
  '#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626',
  '#7c3aed','#4f46e5','#0284c7','#16a34a','#ca8a04','#b91c1c',
];

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export default function SpinWheel() {
  const initial = (seedData.options && seedData.options.length >= 2)
    ? seedData.options
    : DEFAULT_OPTIONS;

  const [options,  setOptions]  = useState(initial);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [newOpt,   setNewOpt]   = useState('');
  const spinRef = useRef(0);

  const spin = useCallback(() => {
    if (spinning || options.length < 2) return;
    setResult(null);
    setSpinning(true);
    const extra  = 1800 + Math.random() * 1800;
    const target = spinRef.current + extra;
    spinRef.current = target % 360;
    setRotation(target);

    setTimeout(() => {
      setSpinning(false);
      // Calculate which segment landed at the top (270deg = top after rotation)
      const norm = ((target % 360) + 360) % 360;
      const perSeg = 360 / options.length;
      // The pointer is at top. After spinning, find which segment is at top.
      const idx = Math.floor(((360 - norm % 360) % 360) / perSeg) % options.length;
      setResult(options[idx]);
    }, 4000);
  }, [spinning, options]);

  const addOption = () => {
    const t = newOpt.trim();
    if (!t || options.length >= 12) return;
    setOptions(o => [...o, t]);
    setNewOpt('');
    setResult(null);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(o => o.filter((_, idx) => idx !== i));
    setResult(null);
  };

  const cx = 150, cy = 150, r = 130;
  const perSeg = 360 / options.length;

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center gap-4 p-5 overflow-y-auto morph-scrollbar">

      {/* Wheel */}
      <div className="relative shrink-0">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-10 border-r-10 border-t-18 border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
        </div>

        <motion.svg
          width={300} height={300} viewBox="0 0 300 300"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.35, 1.0] }}
          style={{ filter: spinning ? 'drop-shadow(0 0 20px rgba(124,58,237,0.4))' : 'none' }}
        >
          {/* Segments */}
          {options.map((opt, i) => {
            const startDeg = i * perSeg;
            const endDeg   = (i + 1) * perSeg;
            const midDeg   = startDeg + perSeg / 2;
            const textPos  = polarToXY(cx, cy, r * 0.65, midDeg);
            const maxLen   = perSeg > 30 ? 12 : 6;
            const label    = opt.length > maxLen ? opt.slice(0, maxLen - 1) + '…' : opt;
            return (
              <g key={i}>
                <path d={buildPath(cx, cy, r, startDeg, endDeg)} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
                <text
                  x={textPos.x} y={textPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={perSeg > 40 ? 11 : 9}
                  fill="white" opacity="0.9"
                  transform={`rotate(${midDeg}, ${textPos.x}, ${textPos.y})`}
                  style={{ userSelect: 'none' }}
                >
                  {label}
                </text>
              </g>
            );
          })}
          {/* Center */}
          <circle cx={cx} cy={cy} r={20} fill="#0a0a0a" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        </motion.svg>
      </div>

      {/* Spin button */}
      <button onClick={spin} disabled={spinning}
        className={`px-8 py-3 rounded-2xl text-sm font-medium border transition-all ${
          spinning ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed' :
          'bg-purple-600/20 border-purple-500/30 text-purple-300 hover:bg-purple-600/30 active:scale-95'
        }`}>
        {spinning ? 'Spinning…' : '🎰 Spin!'}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="bg-linear-to-r from-purple-600/15 to-blue-600/15 border border-purple-500/25 rounded-2xl px-6 py-3 text-center">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Result</p>
            <p className="text-white text-lg">{result}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options list */}
      <div className="w-full max-w-xs">
        <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Options ({options.length}/12)</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-full px-2.5 py-1">
              <span className="text-xs text-white/55">{opt}</span>
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-white/20 hover:text-red-400 transition-colors">
                  <X size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 12 && (
          <div className="flex gap-2">
            <input value={newOpt} onChange={e => setNewOpt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOption()}
              placeholder="Add option…"
              className="flex-1 bg-white/3 border border-white/6 rounded-xl px-3 py-2 text-xs text-white/60 placeholder-white/18 outline-none" />
            <button onClick={addOption}
              className="px-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
