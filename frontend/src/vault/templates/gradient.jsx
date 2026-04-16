import React, { useState, useCallback } from 'react';
import { Copy, Check, Plus, X, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: gradient]

const PRESETS = [
  { name: 'Aurora',    colors: ['#7c3aed','#2563eb'],        angle: 135 },
  { name: 'Sunset',    colors: ['#f97316','#ec4899'],        angle: 45  },
  { name: 'Ocean',     colors: ['#06b6d4','#3b82f6'],        angle: 180 },
  { name: 'Forest',    colors: ['#22c55e','#16a34a'],        angle: 135 },
  { name: 'Rose Gold', colors: ['#f9a8d4','#fb923c'],        angle: 90  },
  { name: 'Midnight',  colors: ['#1e1b4b','#4c1d95','#0f172a'], angle: 160 },
  { name: 'Neon',      colors: ['#a855f7','#ec4899','#f97316'], angle: 90 },
  { name: 'Arctic',    colors: ['#e0f2fe','#7dd3fc','#38bdf8'], angle: 120 },
];

const TYPES = ['linear', 'radial'];

function randomHex() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

export default function GradientGen() {
  const [colors, setColors] = useState(['#7c3aed', '#2563eb']);
  const [angle,  setAngle]  = useState(135);
  const [type,   setType]   = useState('linear');
  const [copied, setCopied] = useState(false);

  const css = type === 'linear'
    ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
    : `radial-gradient(circle, ${colors.join(', ')})`;

  const cssString = `background: ${css};`;

  const copy = () => {
    try { navigator.clipboard.writeText(cssString); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateColor = (i, val) => setColors(c => c.map((x, idx) => idx === i ? val : x));
  const addColor    = () => { if (colors.length < 5) setColors(c => [...c, randomHex()]); };
  const removeColor = (i) => { if (colors.length > 2) setColors(c => c.filter((_, idx) => idx !== i)); };

  const applyPreset = (p) => { setColors(p.colors); setAngle(p.angle); };
  const randomize   = () => setColors(colors.map(() => randomHex()));

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Preview */}
      <div className="flex-1 relative" style={{ background: css }}>
        <div className="absolute inset-0 flex items-end justify-between p-4">
          {/* CSS output */}
          <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 flex-1 mr-3">
            <p className="text-white/60 text-xs font-mono truncate">{cssString}</p>
          </div>
          <button onClick={copy}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl text-xs text-white/70 hover:text-white transition-all shrink-0">
            {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy CSS</>}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 p-4 space-y-4 border-t border-white/6">

        {/* Type + angle */}
        <div className="flex items-center gap-4">
          <div className="flex bg-white/4 border border-white/[0.07] rounded-full p-0.5 gap-0.5">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1 rounded-full text-[11px] capitalize transition-all ${type === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
                {t}
              </button>
            ))}
          </div>
          {type === 'linear' && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-white/25 text-xs w-6">{angle}°</span>
              <input type="range" min="0" max="360" value={angle} onChange={e => setAngle(+e.target.value)}
                className="flex-1 h-1 accent-purple-500" />
            </div>
          )}
          <button onClick={randomize} className="p-1.5 text-white/25 hover:text-white transition-all" title="Randomize">
            <Shuffle size={14} />
          </button>
        </div>

        {/* Color stops */}
        <div className="flex items-center gap-2 flex-wrap">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-1 bg-white/4 border border-white/8 rounded-xl px-2 py-1.5">
              <input type="color" value={c} onChange={e => updateColor(i, e.target.value)}
                className="w-5 h-5 rounded-md border-0 cursor-pointer bg-transparent" style={{ padding: '1px' }} />
              <span className="text-xs text-white/40 font-mono w-16">{c}</span>
              {colors.length > 2 && (
                <button onClick={() => removeColor(i)} className="text-white/20 hover:text-red-400 transition-colors ml-0.5">
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          {colors.length < 5 && (
            <button onClick={addColor}
              className="p-1.5 bg-white/3 border border-white/[0.07] rounded-xl text-white/25 hover:text-white transition-all">
              <Plus size={13} />
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)}
              className="px-2.5 py-1 rounded-full text-[10px] text-white/35 border border-white/[0.07] hover:text-white hover:border-white/20 transition-all"
              style={{ background: `linear-gradient(90deg, ${p.colors[0]}, ${p.colors[p.colors.length-1]})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
