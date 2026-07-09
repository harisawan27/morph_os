import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eraser, Paintbrush, Droplets, Download, Trash2, Grid } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: pixel]

const SIZES   = [8, 16, 32];
const PALETTE = [
  '#000000','#ffffff','#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6b7280','#d1d5db',
  '#7c2d12','#15803d','#1e40af','#7e22ce',
];

function makeGrid(sz) { return Array(sz * sz).fill('#000000'); }

const PIXEL_KEY = 'morph_pixel_v1';

export default function PixelArt() {
  const [prefs, setPrefs] = (typeof useCloudStorage !== 'undefined') ? useCloudStorage(PIXEL_KEY, { size: 16, grid: makeGrid(16) }) : useState({ size: 16, grid: makeGrid(16) });
  const size = prefs.size;
  const grid = prefs.grid;
  
  const setSize = (s) => setPrefs(p => ({ ...p, size: s }));
  const setGrid = (g) => setPrefs(p => ({ ...p, grid: typeof g === 'function' ? g(p.grid) : g }));
  const [color,   setColor]   = useState('#ffffff');
  const [tool,    setTool]    = useState('draw');   // draw | erase | fill


  const [drawing, setDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef(null);

  const paint = useCallback((i) => {
    if (tool === 'fill') {
      const target = grid[i];
      if (target === (tool === 'erase' ? '#000000' : color)) return;
      const fill = tool === 'erase' ? '#000000' : color;
      const next = [...grid];
      const stack = [i];
      while (stack.length) {
        const idx = stack.pop();
        if (idx < 0 || idx >= size * size || next[idx] !== target) continue;
        next[idx] = fill;
        const row = Math.floor(idx / size), col = idx % size;
        if (col > 0)      stack.push(idx - 1);
        if (col < size-1) stack.push(idx + 1);
        if (row > 0)      stack.push(idx - size);
        if (row < size-1) stack.push(idx + size);
      }
      setGrid(next);
    } else {
      setGrid(prev => prev.map((c, idx) => idx === i ? (tool === 'erase' ? '#000000' : color) : c));
    }
  }, [grid, color, tool, size]);

  const handleSize = (s) => { setSize(s); setGrid(makeGrid(s)); };

  const download = () => {
    const scale = Math.max(1, Math.floor(512 / size));
    const c = document.createElement('canvas');
    c.width = size * scale; c.height = size * scale;
    const ctx = c.getContext('2d');
    grid.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect((i % size) * scale, Math.floor(i / size) * scale, scale, scale);
    });
    const a = document.createElement('a');
    a.download = 'pixel-art.png';
    a.href = c.toDataURL();
    a.click();
  };

  const cellPx = Math.min(Math.floor(280 / size), 24);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-4 gap-3 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {/* Tools */}
        <div className="flex bg-white/4 border border-white/[0.07] rounded-xl p-0.5 gap-0.5">
          {[{t:'draw',icon:<Paintbrush size={13}/>},{t:'erase',icon:<Eraser size={13}/>},{t:'fill',icon:<Droplets size={13}/>}].map(({t,icon}) => (
            <button key={t} onClick={() => setTool(t)}
              className={`p-1.5 rounded-lg transition-all ${tool===t ? 'bg-white/12 text-white' : 'text-white/30 hover:text-white/60'}`} title={t}>
              {icon}
            </button>
          ))}
        </div>

        {/* Custom color */}
        <div className="flex items-center gap-1.5 bg-white/4 border border-white/[0.07] rounded-xl px-2 py-1">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent" style={{padding:'1px'}} />
          <span className="text-[10px] text-white/30 font-mono">{color}</span>
        </div>

        {/* Grid size */}
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button key={s} onClick={() => handleSize(s)}
              className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${size===s ? 'bg-white/10 border-white/20 text-white' : 'border-white/[0.07] text-white/30 hover:text-white'}`}>
              {s}px
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setShowGrid(g => !g)}
            className={`p-1.5 rounded-xl border transition-all ${showGrid ? 'bg-white/8 border-white/15 text-white' : 'border-white/[0.07] text-white/30'}`}>
            <Grid size={13} />
          </button>
          <button onClick={() => setGrid(makeGrid(size))}
            className="p-1.5 rounded-xl border border-white/[0.07] text-white/30 hover:text-red-400 transition-all" title="Clear">
            <Trash2 size={13} />
          </button>
          <button onClick={download}
            className="p-1.5 rounded-xl bg-purple-600/15 border border-purple-500/25 text-purple-400 hover:bg-purple-600/25 transition-all" title="Download PNG">
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Palette */}
      <div className="flex flex-wrap gap-1 shrink-0">
        {PALETTE.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('draw'); }}
            style={{ background: c }}
            className={`w-5 h-5 rounded-md border-2 transition-all ${color===c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`} />
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          ref={canvasRef}
          className="cursor-crosshair"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
            gap: showGrid ? '1px' : '0px',
            background: showGrid ? 'var(--morph-05)' : 'transparent',
            padding: showGrid ? '1px' : '0',
            borderRadius: '8px',
            userSelect: 'none',
          }}
          onMouseLeave={() => setDrawing(false)}
        >
          {grid.map((c, i) => (
            <div
              key={i}
              style={{ width: cellPx, height: cellPx, background: c }}
              onMouseDown={() => { setDrawing(true); paint(i); }}
              onMouseEnter={() => { if (drawing) paint(i); }}
              onMouseUp={() => setDrawing(false)}
              onTouchStart={e => { e.preventDefault(); paint(i); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
