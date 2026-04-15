import React, { useState, useCallback, useEffect } from 'react';
import { Copy, Check, RefreshCw, Shuffle, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: color]

const COLOR_STORAGE = 'morph_color_v1';
const INITIAL_HEX = '#6366f1';
function loadColorPrefs() {
  try { const r = localStorage.getItem(COLOR_STORAGE); if (r) return JSON.parse(r); } catch {}
  return { hex: INITIAL_HEX, harmony: 'Complementary' };
}
function saveColorPrefs(hex, harmony) {
  try { localStorage.setItem(COLOR_STORAGE, JSON.stringify({ hex, harmony })); } catch {}
  if (typeof morphSaveState !== 'undefined') morphSaveState({ hex, harmony });
}

// ─── Color math ───────────────────────────────────────────────
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255;
  let g = parseInt(hex.slice(3,5),16)/255;
  let b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h,s, l = (max+min)/2;
  if (max === min) { h=s=0; }
  else {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d+2)/6; break;
      default: h = ((r-g)/d+4)/6;
    }
  }
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}

function isLight(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55;
}

const HARMONIES = {
  Complementary: ([h,s,l]) => [
    [h, s, l],
    [(h+180)%360, s, l],
    [h, s, Math.max(10,l-20)],
    [(h+180)%360, s, Math.min(90,l+15)],
    [h, Math.max(10,s-20), Math.min(90,l+25)],
  ],
  Triadic: ([h,s,l]) => [
    [h, s, l],
    [(h+120)%360, s, l],
    [(h+240)%360, s, l],
    [h, s, Math.min(90,l+20)],
    [(h+120)%360, Math.max(10,s-15), Math.min(90,l+15)],
  ],
  Analogous: ([h,s,l]) => [
    [(h+330)%360, s, l],
    [(h+345)%360, s, l],
    [h, s, l],
    [(h+15)%360,  s, l],
    [(h+30)%360,  s, l],
  ],
  Monochromatic: ([h,s,l]) => [
    [h, s, Math.max(10,l-30)],
    [h, s, Math.max(10,l-15)],
    [h, s, l],
    [h, s, Math.min(90,l+15)],
    [h, s, Math.min(90,l+30)],
  ],
  'Split-Comp': ([h,s,l]) => [
    [h, s, l],
    [(h+150)%360, s, l],
    [(h+210)%360, s, l],
    [h, Math.max(10,s-20), Math.min(90,l+20)],
    [(h+180)%360, Math.max(10,s-10), Math.min(90,l+10)],
  ],
};

const HARMONY_KEYS = Object.keys(HARMONIES);

export default function ColorPaletteArtifact() {
  const _p = loadColorPrefs();
  const [baseHex, setBaseHexRaw]  = useState(_p.hex);
  const [inputHex, setInputHex]   = useState(_p.hex);
  const [harmony, setHarmonyRaw]  = useState(_p.harmony);
  const [copied, setCopied]       = useState(null);

  const setBaseHex = (h) => { setBaseHexRaw(h); saveColorPrefs(h, harmony); };
  const setHarmony = (h) => { setHarmonyRaw(h); saveColorPrefs(baseHex, h); };

  // On mount: hydrate from cloud
  useEffect(() => {
    if (typeof morphLoadState !== 'undefined') {
      morphLoadState().then(s => {
        if (s && s.hex) { setBaseHexRaw(s.hex); setInputHex(s.hex); }
        if (s && s.harmony) setHarmonyRaw(s.harmony);
      }).catch(() => {});
    }
  }, []);

  const hsl   = hexToHsl(baseHex);
  const swatches = HARMONIES[harmony](hsl).map(([h,s,l]) => hslToHex(h,s,l));

  const copy = (hex) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(hex);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const randomize = () => {
    const hex = hslToHex(Math.floor(Math.random()*360), 60+Math.floor(Math.random()*30), 40+Math.floor(Math.random()*20));
    setBaseHex(hex); setInputHex(hex);
  };

  const copyAll = () => {
    const css = swatches.map((h,i) => `  --color-${i+1}: ${h};`).join('\n');
    navigator.clipboard.writeText(`:root {\n${css}\n}`);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleHexInput = (val) => {
    setInputHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setBaseHex(val);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white p-6 items-center justify-center overflow-hidden">
      <div className="w-full max-w-xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-white/10" style={{ background: baseHex + '33' }}>
              <Palette size={18} style={{ color: baseHex }} />
            </div>
            <div>
              <h1 className="text-lg font-light">Color Forge</h1>
              <p className="text-[9px] uppercase tracking-widest text-white/25">{harmony} Harmony</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={randomize}
              className="p-2.5 rounded-xl bg-white/5 border border-white/7 text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <Shuffle size={16} />
            </button>
            <button onClick={copyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/7 text-white/40 hover:text-white hover:bg-white/10 transition-all text-[10px] uppercase tracking-wider">
              {copied === 'all' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              CSS Vars
            </button>
          </div>
        </div>

        {/* Base color picker */}
        <div className="flex items-center gap-4 p-4 bg-white/4 border border-white/7 rounded-2xl">
          <label className="relative cursor-pointer shrink-0">
            <div className="w-12 h-12 rounded-xl border-2 border-white/20 shadow-lg transition-all"
              style={{ background: baseHex, boxShadow: `0 0 20px ${baseHex}66` }} />
            <input
              type="color" value={baseHex}
              onChange={e => { setBaseHex(e.target.value); setInputHex(e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Base Color</p>
            <input
              value={inputHex}
              onChange={e => handleHexInput(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-white/80 outline-none focus:ring-1 focus:ring-white/20 w-full uppercase tracking-widest"
              maxLength={7}
            />
          </div>
          {/* Hue slider */}
          <input
            type="range" min={0} max={359} value={hsl[0]}
            onChange={e => {
              const [,s,l] = hexToHsl(baseHex);
              const hex = hslToHex(Number(e.target.value), s, l);
              setBaseHex(hex); setInputHex(hex);
            }}
            className="w-24 cursor-pointer"
            style={{ accentColor: baseHex }}
          />
        </div>

        {/* Harmony selector */}
        <div className="flex gap-1.5 flex-wrap">
          {HARMONY_KEYS.map(h => (
            <button key={h} onClick={() => setHarmony(h)}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider border transition-all ${
                harmony === h
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-white/3 text-white/30 border-white/6 hover:text-white/60'
              }`}>
              {h}
            </button>
          ))}
        </div>

        {/* Swatches */}
        <div className="grid grid-cols-5 gap-3">
          {swatches.map((hex, i) => (
            <motion.div key={hex+i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => copy(hex)}
                className="aspect-square rounded-2xl border-2 border-white/10 relative group overflow-hidden shadow-lg transition-all"
                style={{ background: hex, boxShadow: `0 4px 20px ${hex}44` }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm">
                  {copied === hex
                    ? <Check size={18} className="text-white drop-shadow-lg" />
                    : <Copy size={18} className="text-white drop-shadow-lg" />
                  }
                </div>
              </motion.button>
              <div className="text-center">
                <p className="text-[9px] font-mono uppercase text-white/40">{hex}</p>
                {i === 0 && <p className="text-[8px] uppercase tracking-wider text-white/20">Base</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Full-width preview bar */}
        <div className="h-10 rounded-2xl overflow-hidden flex border border-white/5 shadow-2xl">
          {swatches.map((hex, i) => (
            <div key={i} className="flex-1 transition-all duration-300" style={{ background: hex }} />
          ))}
        </div>
      </div>
    </div>
  );
}
