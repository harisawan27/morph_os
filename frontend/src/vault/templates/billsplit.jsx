import React, { useState, useMemo } from 'react';
import { Plus, X, DollarSign, Users, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: billsplit]

const TIP_OPTIONS = [0, 10, 15, 18, 20, 25];

export default function BillSplitter() {
  const [total,   setTotal]   = useState('');
  const [tip,     setTip]     = useState(15);
  const [customTip, setCustomTip] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [names,   setNames]   = useState(['', '']);
  const [newName, setNewName] = useState('');

  const tipPct   = useCustom ? (parseFloat(customTip) || 0) : tip;
  const bill     = parseFloat(total) || 0;
  const tipAmt   = bill * (tipPct / 100);
  const grandTotal = bill + tipAmt;
  const perPerson  = names.length > 0 ? grandTotal / names.length : 0;

  const addPerson = () => {
    const name = newName.trim() || `Person ${names.length + 1}`;
    setNames(n => [...n, name]);
    setNewName('');
  };

  const removePerson = (i) => {
    if (names.length <= 1) return;
    setNames(n => n.filter((_, idx) => idx !== i));
  };

  const updateName = (i, val) => {
    setNames(prev => prev.map((n, idx) => idx === i ? val : n));
  };

  const fmt = (n) => n.toFixed(2);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-5 gap-4 overflow-y-auto morph-scrollbar">

      {/* Bill amount */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/25 mb-2 block">Total Bill</label>
        <div className="relative">
          <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="number" value={total} onChange={e => setTotal(e.target.value)}
            placeholder="0.00" min="0" step="0.01"
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/20 rounded-2xl pl-9 pr-4 py-3 text-xl text-white/85 placeholder-white/18 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Tip */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/25 mb-2 block flex items-center gap-1.5">
          <Percent size={10} /> Tip
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TIP_OPTIONS.map(t => (
            <button key={t} onClick={() => { setTip(t); setUseCustom(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${!useCustom && tip === t ? 'bg-purple-600/20 border-purple-500/30 text-purple-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70'}`}>
              {t === 0 ? 'No tip' : `${t}%`}
            </button>
          ))}
          <button onClick={() => setUseCustom(true)}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${useCustom ? 'bg-purple-600/20 border-purple-500/30 text-purple-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70'}`}>
            Custom
          </button>
        </div>
        {useCustom && (
          <div className="relative">
            <input type="number" value={customTip} onChange={e => setCustomTip(e.target.value)}
              placeholder="Enter tip %" min="0" max="100"
              className="w-32 bg-white/[0.03] border border-white/[0.08] focus:border-white/15 rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/18 outline-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
        )}
      </div>

      {/* People */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/25 mb-2 flex items-center gap-1.5">
          <Users size={10} /> People ({names.length})
        </label>
        <div className="space-y-1.5 mb-2">
          <AnimatePresence>
            {names.map((name, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-purple-600/20 border border-purple-500/25 flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-purple-400">{i+1}</span>
                </div>
                <input value={name} onChange={e => updateName(i, e.target.value)}
                  placeholder={`Person ${i+1}`}
                  className="flex-1 bg-transparent text-sm text-white/65 placeholder-white/20 outline-none" />
                {bill > 0 && (
                  <span className="text-xs text-emerald-400/70 font-medium shrink-0">${fmt(perPerson)}</span>
                )}
                {names.length > 1 && (
                  <button onClick={() => removePerson(i)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                    <X size={12} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
            placeholder="Add person…"
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white/60 placeholder-white/18 outline-none" />
          <button onClick={addPerson}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {bill > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 mt-auto shrink-0">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm text-white/40">
              <span>Subtotal</span><span>${fmt(bill)}</span>
            </div>
            <div className="flex justify-between text-sm text-white/40">
              <span>Tip ({tipPct}%)</span><span>${fmt(tipAmt)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-white/[0.06] pt-2 text-white/70">
              <span>Total</span><span>${fmt(grandTotal)}</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-emerald-400 text-xl font-light">${fmt(perPerson)}</p>
            <p className="text-white/30 text-xs mt-0.5">per person</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
