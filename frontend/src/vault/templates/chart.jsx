import React, { useState } from 'react';
import { BarChart2, TrendingUp, PieChart } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: chart]

const seedData = {{DATA_JSON}};

const DEFAULTS = {
  type:   'bar',
  title:  'Monthly Revenue',
  labels: ['Jan','Feb','Mar','Apr','May','Jun'],
  values: [4200, 6800, 5100, 7900, 6300, 9100],
  color:  'blue',
};

const COLORS = {
  blue:   ['#4dabf7','#1971c2'],
  purple: ['#da77f2','#9c36b5'],
  green:  ['#69db7c','#2f9e44'],
  orange: ['#ffa94d','#e67700'],
  pink:   ['#f783ac','#c2255c'],
};

export default function ChartWidget() {
  const data   = { ...DEFAULTS, ...seedData };
  const [type, setType]    = useState(data.type);
  const [hover, setHover]  = useState(null);

  const max    = Math.max(...data.values, 1);
  const total  = data.values.reduce((a, b) => a + b, 0);
  const [c1, c2] = COLORS[data.color] || COLORS.blue;

  const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : n+'';

  // ── Bar chart ──────────────────────────────────────────────────────────────
  const BarView = () => (
    <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
      <div className="flex items-end gap-2 flex-1 pt-6">
        {data.values.map((v, i) => {
          const h = (v / max) * 100;
          const isHov = hover === i;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {isHov && (
                <div className="text-[10px] text-white/70 bg-white/8 px-2 py-0.5 rounded-lg whitespace-nowrap">
                  {data.labels[i]}: {fmt(v)}
                </div>
              )}
              <div className="flex-1 flex items-end w-full">
                <div
                  className="w-full rounded-t-lg transition-all duration-200"
                  style={{
                    height: `${h}%`,
                    minHeight: '4px',
                    background: isHov ? `linear-gradient(to top, ${c2}, ${c1})` : `linear-gradient(to top, ${c2}88, ${c1}88)`,
                  }}
                />
              </div>
              <p className="text-[9px] text-white/25 truncate w-full text-center">{data.labels[i]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Line chart (SVG) ───────────────────────────────────────────────────────
  const LineView = () => {
    const W = 400, H = 160, PAD = 20;
    const pts = data.values.map((v, i) => ({
      x: PAD + (i / (data.values.length - 1)) * (W - PAD * 2),
      y: PAD + (1 - v / max) * (H - PAD * 2),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`;
    return (
      <div className="flex-1 px-2 pb-4 flex flex-col">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c1} stopOpacity="0.3" />
              <stop offset="100%" stopColor={c1} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#lg)" />
          <path d={path} fill="none" stroke={c1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill={c1}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer" />
          ))}
        </svg>
        <div className="flex justify-between px-4">
          {data.labels.map((l, i) => (
            <span key={i} className="text-[9px] text-white/25">{l}</span>
          ))}
        </div>
      </div>
    );
  };

  // ── Pie chart (SVG) ────────────────────────────────────────────────────────
  const PieView = () => {
    let cumAngle = -Math.PI / 2;
    const slices = data.values.map((v, i) => {
      const angle = (v / total) * Math.PI * 2;
      const x1 = 80 + 65 * Math.cos(cumAngle);
      const y1 = 80 + 65 * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = 80 + 65 * Math.cos(cumAngle);
      const y2 = 80 + 65 * Math.sin(cumAngle);
      const large = angle > Math.PI ? 1 : 0;
      const d = `M 80 80 L ${x1} ${y1} A 65 65 0 ${large} 1 ${x2} ${y2} Z`;
      const alpha = Math.round(50 + (i / data.values.length) * 200).toString(16).padStart(2,'0');
      return { d, color: c1 + alpha, i, v };
    });
    return (
      <div className="flex-1 flex items-center justify-center gap-6 pb-4">
        <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
          {slices.map(s => (
            <path key={s.i} d={s.d} fill={hover === s.i ? c1 : s.color}
              onMouseEnter={() => setHover(s.i)} onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-all" stroke="#0a0a0a" strokeWidth="1" />
          ))}
          <circle cx="80" cy="80" r="30" fill="#0a0a0a" />
          {hover !== null && (
            <text x="80" y="84" textAnchor="middle" fill="white" fontSize="11" fontWeight="300">
              {Math.round((data.values[hover]/total)*100)}%
            </text>
          )}
        </svg>
        <div className="space-y-1.5">
          {data.labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-xs cursor-pointer"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: slices[i]?.color }} />
              <span className={`${hover === i ? 'text-white' : 'text-white/40'} transition-colors`}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <h2 className="text-white/80 font-light text-base">{data.title}</h2>
          {hover !== null && (
            <p className="text-white/35 text-xs mt-0.5">{data.labels[hover]}: {fmt(data.values[hover])}</p>
          )}
        </div>
        <div className="flex gap-1 bg-white/4 rounded-xl p-0.5">
          {[['bar', BarChart2], ['line', TrendingUp], ['pie', PieChart]].map(([t, Icon]) => (
            <button key={t} onClick={() => setType(t)}
              className={`p-1.5 rounded-lg transition-all ${type === t ? 'bg-white/12 text-white' : 'text-white/25 hover:text-white/50'}`}>
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {type === 'bar'  && <BarView />}
      {type === 'line' && <LineView />}
      {type === 'pie'  && <PieView />}

      {/* Footer summary */}
      <div className="flex justify-around px-4 py-3 border-t border-white/5 shrink-0">
        <div className="text-center">
          <p className="text-white/60 text-sm font-light">{fmt(Math.max(...data.values))}</p>
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Peak</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm font-light">{fmt(Math.round(total / data.values.length))}</p>
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Avg</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm font-light">{fmt(total)}</p>
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Total</p>
        </div>
      </div>
    </div>
  );
}
