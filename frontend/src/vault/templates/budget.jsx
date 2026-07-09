import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: budget]

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Health', 'Shopping', 'Entertainment', 'Salary', 'Other'];

const STORAGE_KEY = 'morph_budget_v1';
const DEFAULT_TXN = [
  { id: 1, type: 'income',  label: 'Salary',       amount: 3000, category: 'Salary' },
  { id: 2, type: 'expense', label: 'Rent',          amount: 900,  category: 'Housing' },
  { id: 3, type: 'expense', label: 'Groceries',     amount: 120,  category: 'Food' },
];


export default function BudgetTracker() {
  const [transactions, setTransactions] = (typeof useCloudStorage !== 'undefined') ? useCloudStorage(STORAGE_KEY, DEFAULT_TXN) : useState(DEFAULT_TXN);

  const [label,    setLabel]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('Other');
  const [type,     setType]     = useState('expense');
  const [filter,   setFilter]   = useState('all');

  const stats = useMemo(() => {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const add = () => {
    const amt = parseFloat(amount);
    if (!label.trim() || isNaN(amt) || amt <= 0) return;
    setTransactions(prev => [{ id: Date.now(), type, label: label.trim(), amount: amt, category }, ...prev]);
    setLabel(''); setAmount('');
  };

  const remove = id => setTransactions(prev => prev.filter(t => t.id !== id));

  const visible = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 p-4 shrink-0">
        {[
          { label: 'Balance', value: stats.balance, icon: DollarSign, color: stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400', bg: 'bg-white/4' },
          { label: 'Income',  value: stats.income,  icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
          { label: 'Spent',   value: stats.expense, icon: TrendingDown, color: 'text-red-400',    bg: 'bg-red-500/8' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-white/6 rounded-2xl p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className={color} />
              <span className="text-white/30 text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-lg font-light ${color}`}>{fmt(Math.abs(value))}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="px-4 pb-3 shrink-0">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-3 space-y-2.5">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/8 text-xs">
            {['expense', 'income'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 capitalize transition-all ${type === t ? (t === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400') : 'text-white/30 hover:text-white/60'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Description" className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
            <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              type="number" placeholder="0.00" className="w-20 bg-transparent text-sm text-white text-right placeholder-white/20 outline-none" />
          </div>
          <div className="flex gap-2 items-center">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white/40 outline-none">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
            </select>
            <button onClick={add} className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all">
              <Plus size={14} className="text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pb-3 shrink-0">
        {['all', 'income', 'expense'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 morph-scrollbar">
        {visible.length === 0 && (
          <p className="text-center text-white/15 text-xs pt-8">No transactions yet</p>
        )}
        {visible.map(t => (
          <div key={t.id} className="group flex items-center gap-3 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 transition-all">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/15' : 'bg-red-500/10'}`}>
              {t.type === 'income'
                ? <ArrowUpCircle size={14} className="text-emerald-400" />
                : <ArrowDownCircle size={14} className="text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate">{t.label}</p>
              <p className="text-[10px] text-white/25">{t.category}</p>
            </div>
            <p className={`text-sm font-light shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
            </p>
            <button onClick={() => remove(t.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
