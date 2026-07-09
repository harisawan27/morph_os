import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Trash2, Download, Pencil, Minus, Plus } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: draw]

const DRAW_KEY = 'morph_draw_v1';

const PALETTE = [
  '#ffffff','#a8a8a8','#ff6b6b','#ff9f43','#ffd43b',
  '#69db7c','#4dabf7','#9775fa','#f783ac','#000000',
];

export default function DrawingCanvas() {
  const canvasRef  = useRef(null);
  const ctxRef     = useRef(null);
  const drawing    = useRef(false);
  const lastPos    = useRef(null);

  const [color,    setColor]    = useState('#ffffff');
  const [size,     setSize]     = useState(4);
  const [tool,     setTool]     = useState('pen'); // 'pen' | 'eraser'
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctxRef.current = ctx;

    const saved = null;
    if (saved && typeof saved === 'string') {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); setHasDrawn(true); };
      img.src = saved;
    }
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? size * 3 : size) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#0a0a0a' : color;
    ctx.fill();
    setHasDrawn(true);
  }, [color, size, tool, getPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const pos = getPos(e);
    const ctx = ctxRef.current;
    const s   = tool === 'eraser' ? size * 3 : size;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#0a0a0a' : color;
    ctx.lineWidth   = s;
    ctx.stroke();
    lastPos.current = pos;
  }, [color, size, tool, getPos]);

  const stopDraw = useCallback(() => {
    drawing.current = false;
    lastPos.current = null;
    if (typeof morphSaveState !== 'undefined') morphSaveState(canvasRef.current.toDataURL());

  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (typeof morphSaveState !== 'undefined') morphSaveState(null);

  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'morph-drawing.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden select-none">

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/10 text-sm">Start drawing...</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/6 px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap justify-center">

          {/* Color palette */}
          <div className="flex gap-1.5">
            {PALETTE.map(c => (
              <button key={c} onClick={() => { setColor(c); setTool('pen'); }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${color === c && tool === 'pen' ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
                style={{ background: c }} />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />

          {/* Tool toggle */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-0.5">
            <button onClick={() => setTool('pen')}
              className={`p-1.5 rounded-lg transition-all ${tool === 'pen' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <Pencil size={14} />
            </button>
            <button onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <Eraser size={14} />
            </button>
          </div>

          {/* Size */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSize(s => Math.max(1, s - 2))} className="text-white/30 hover:text-white transition-colors">
              <Minus size={13} />
            </button>
            <div className="w-8 flex items-center justify-center">
              <span className="text-white/40 text-xs font-mono">{size}</span>
            </div>
            <button onClick={() => setSize(s => Math.min(40, s + 2))} className="text-white/30 hover:text-white transition-colors">
              <Plus size={13} />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />

          {/* Actions */}
          <button onClick={clear} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} />
          </button>
          <button onClick={download} className="p-1.5 rounded-lg text-white/25 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
