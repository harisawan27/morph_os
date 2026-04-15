import React, { useState, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: converter]

const CATS = {
  Length: {
    units: ['mm','cm','m','km','in','ft','yd','mi'],
    toBase: { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 },
  },
  Weight: {
    units: ['mg','g','kg','lb','oz','ton'],
    toBase: { mg:0.000001, g:0.001, kg:1, lb:0.453592, oz:0.0283495, ton:1000 },
  },
  Temperature: {
    units: ['°C','°F','K'],
    toBase: null, // special handling
  },
  Volume: {
    units: ['ml','L','fl oz','cup','gal'],
    toBase: { ml:0.001, L:1, 'fl oz':0.0295735, cup:0.236588, gal:3.78541 },
  },
  Speed: {
    units: ['m/s','km/h','mph','knot'],
    toBase: { 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 },
  },
  Area: {
    units: ['mm²','cm²','m²','km²','ft²','acre'],
    toBase: { 'mm²':0.000001, 'cm²':0.0001, 'm²':1, 'km²':1e6, 'ft²':0.092903, acre:4046.86 },
  },
};

function convert(val, from, cat) {
  const n = parseFloat(val);
  if (isNaN(n)) return {};
  const { units, toBase } = CATS[cat];
  const result = {};
  if (cat === 'Temperature') {
    let celsius;
    if (from === '°C') celsius = n;
    else if (from === '°F') celsius = (n - 32) * 5/9;
    else celsius = n - 273.15;
    units.forEach(u => {
      if (u === '°C') result[u] = celsius;
      else if (u === '°F') result[u] = celsius * 9/5 + 32;
      else result[u] = celsius + 273.15;
    });
  } else {
    const base = n * toBase[from];
    units.forEach(u => { result[u] = base / toBase[u]; });
  }
  return result;
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 0.01)  return +n.toPrecision(6) + '';
  return n.toExponential(3);
}

export default function UnitConverter() {
  const [cat,   setCat]   = useState('Length');
  const [from,  setFrom]  = useState('m');
  const [value, setValue] = useState('1');

  const results = useMemo(() => convert(value, from, cat), [value, from, cat]);
  const { units } = CATS[cat];

  const switchCat = c => {
    setCat(c);
    setFrom(CATS[c].units[0]);
    setValue('1');
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Category tabs */}
      <div className="flex gap-1 p-3 overflow-x-auto shrink-0 morph-scrollbar">
        {Object.keys(CATS).map(c => (
          <button key={c} onClick={() => switchCat(c)}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${cat === c ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="px-4 pb-3 shrink-0">
        <div className="bg-white/4 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-light text-white outline-none min-w-0"
            />
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="bg-white/8 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none cursor-pointer">
              {units.map(u => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 morph-scrollbar">
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeftRight size={12} className="text-white/20" />
          <span className="text-[10px] uppercase tracking-widest text-white/20">Conversions</span>
        </div>
        <div className="space-y-2">
          {units.filter(u => u !== from).map(u => (
            <button key={u} onClick={() => { setValue(fmt(results[u] ?? 0)); setFrom(u); }}
              className="w-full flex items-center justify-between bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl px-4 py-3 transition-all text-left group">
              <span className="text-white/35 text-sm group-hover:text-white/60 transition-colors">{u}</span>
              <span className="text-white/70 font-light text-sm font-mono">
                {results[u] != null ? fmt(results[u]) : '—'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
