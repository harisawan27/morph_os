import React, { useState, useCallback } from 'react';
import { RefreshCw, Copy, Check, Shield, Eye, EyeOff } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: password]

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function strength(pwd) {
  if (!pwd) return { label: '—', score: 0, color: 'bg-white/10' };
  let s = 0;
  if (pwd.length >= 12) s++;
  if (pwd.length >= 20) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 2) return { label: 'Weak',   score: s, color: 'bg-red-500' };
  if (s <= 4) return { label: 'Fair',   score: s, color: 'bg-yellow-500' };
  if (s <= 5) return { label: 'Strong', score: s, color: 'bg-emerald-500' };
  return           { label: 'Elite',   score: s, color: 'bg-purple-500' };
}

export default function PasswordGenerator() {
  const [length,  setLength]  = useState(16);
  const [opts,    setOpts]    = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [pwd,     setPwd]     = useState('');
  const [copied,  setCopied]  = useState(false);
  const [visible, setVisible] = useState(false);

  const generate = useCallback(() => {
    const pool = Object.entries(opts).filter(([,v]) => v).map(([k]) => CHARS[k]).join('');
    if (!pool) return;
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    setPwd(Array.from(arr, n => pool[n % pool.length]).join(''));
    setCopied(false);
  }, [length, opts]);

  const copy = () => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggle = key => setOpts(prev => {
    const next = { ...prev, [key]: !prev[key] };
    if (!Object.values(next).some(Boolean)) return prev; // keep at least one
    return next;
  });

  const str = strength(pwd);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mx-auto mb-3">
            <Shield size={22} className="text-purple-400" />
          </div>
          <h2 className="text-white/80 font-light text-lg">Password Generator</h2>
        </div>

        {/* Password display */}
        <div className="relative bg-white/4 border border-white/10 rounded-2xl px-4 py-4 group">
          <p className={`text-center font-mono text-sm text-white/80 break-all leading-relaxed tracking-wide ${!visible ? 'blur-sm select-none' : ''}`}>
            {pwd || '·'.repeat(length)}
          </p>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button onClick={() => setVisible(v => !v)} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 transition-all">
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Strength bar */}
        {pwd && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] uppercase tracking-wider">
              <span className="text-white/25">Strength</span>
              <span className={str.score >= 5 ? 'text-emerald-400' : str.score >= 3 ? 'text-yellow-400' : 'text-red-400'}>{str.label}</span>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= str.score ? str.color : 'bg-white/8'}`} />
              ))}
            </div>
          </div>
        )}

        {/* Length slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Length</span>
            <span className="text-white/60 font-mono">{length}</span>
          </div>
          <input type="range" min={6} max={64} value={length} onChange={e => setLength(+e.target.value)}
            className="w-full accent-purple-500 cursor-pointer" />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(opts).map(([key, val]) => (
            <button key={key} onClick={() => toggle(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs capitalize transition-all ${
                val ? 'bg-purple-500/12 border-purple-500/25 text-purple-300' : 'bg-white/3 border-white/6 text-white/30 hover:text-white/50'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-purple-400' : 'bg-white/15'}`} />
              {key}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={generate}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/25 rounded-2xl text-purple-300 text-sm transition-all active:scale-95">
            <RefreshCw size={14} /> Generate
          </button>
          <button onClick={copy} disabled={!pwd}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-30 ${
              copied ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' : 'bg-white/5 hover:bg-white/8 border-white/10 text-white/60 hover:text-white'
            }`}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}
