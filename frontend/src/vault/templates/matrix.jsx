import React, { useEffect, useRef, useState } from 'react';

// [MORZ_VAULT_TEMPLATE: matrix]

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function MatrixRain() {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const [speed,    setSpeed]    = useState(40);   // ms per frame
  const [density,  setDensity]  = useState(0.975);
  const [running,  setRunning]  = useState(true);
  const [color,    setColor]    = useState('#00ff41');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cols = Math.floor(canvas.width / 14);
      stateRef.current = Array(cols).fill(1).map(() => Math.random() * canvas.height / 14);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = 0;
    const draw = (ts) => {
      if (!stateRef.current) return;
      rafRef.current = requestAnimationFrame(draw);
      if (ts - last < speed) return;
      last = ts;

      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color;
      ctx.font      = '14px monospace';

      stateRef.current.forEach((y, i) => {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillText(ch, i * 14, y * 14);

        // Brighter head
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * 14, y * 14);
        ctx.globalAlpha = 1;

        if (y * 14 > canvas.height && Math.random() > density) {
          stateRef.current[i] = 0;
        } else {
          stateRef.current[i] = y + 1;
        }
      });
    };

    if (running) rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [speed, density, color, running]);

  const togglePause = () => {
    setRunning(r => {
      if (r) cancelAnimationFrame(rafRef.current);
      return !r;
    });
  };

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden relative">
      <canvas ref={canvasRef} className="flex-1 w-full" />

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5">

        <button onClick={togglePause}
          className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/8">
          {running ? '⏸ Pause' : '▶ Play'}
        </button>

        <div className="w-px h-3 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/25 uppercase tracking-widest">Speed</span>
          <input type="range" min="10" max="120" value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className="w-16 h-1 accent-green-500" />
        </div>

        <div className="w-px h-3 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/25 uppercase tracking-widest">Density</span>
          <input type="range" min="0.92" max="0.999" step="0.001" value={density}
            onChange={e => setDensity(+e.target.value)}
            className="w-16 h-1 accent-green-500" />
        </div>

        <div className="w-px h-3 bg-white/10" />

        <div className="flex gap-1.5">
          {['#00ff41','#00cfff','#ff0066','#ffff00'].map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ background: c }}
              className={`w-4 h-4 rounded-full border-2 transition-all ${color===c ? 'border-white scale-110' : 'border-transparent'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
