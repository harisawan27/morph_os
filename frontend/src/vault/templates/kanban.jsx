import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: kanban]

const COLS = [
  { id: 'todo',  label: 'To Do',       accent: 'border-white/10',         dot: 'bg-white/30' },
  { id: 'doing', label: 'In Progress',  accent: 'border-blue-500/30',      dot: 'bg-blue-400' },
  { id: 'done',  label: 'Done',         accent: 'border-emerald-500/25',   dot: 'bg-emerald-400' },
];

const STORAGE_KEY = 'morph_kanban_v1';
const DEFAULT_COLS = {
  todo:  [{ id: 1, text: 'Design landing page' }, { id: 2, text: 'Write API docs' }],
  doing: [{ id: 3, text: 'Build auth flow' }],
  done:  [{ id: 4, text: 'Setup repo' }],
};
function loadCols() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}

let _id = Date.now();
const uid = () => ++_id;

export default function KanbanBoard() {
  const [cols, setCols] = useState(() => loadCols() || DEFAULT_COLS);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)); } catch {}
  }, [cols]);
  const [drafts, setDrafts] = useState({ todo: '', doing: '', done: '' });
  const [adding, setAdding] = useState(null); // which col is open for adding
  const [dragCard, setDragCard] = useState(null); // {id, fromCol}

  const addCard = colId => {
    if (!drafts[colId].trim()) { setAdding(null); return; }
    setCols(prev => ({ ...prev, [colId]: [...prev[colId], { id: uid(), text: drafts[colId].trim() }] }));
    setDrafts(prev => ({ ...prev, [colId]: '' }));
    setAdding(null);
  };

  const removeCard = (colId, cardId) =>
    setCols(prev => ({ ...prev, [colId]: prev[colId].filter(c => c.id !== cardId) }));

  const onDragStart = (e, cardId, colId) => {
    setDragCard({ id: cardId, fromCol: colId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e, toCol) => {
    e.preventDefault();
    if (!dragCard || dragCard.fromCol === toCol) return;
    const card = cols[dragCard.fromCol].find(c => c.id === dragCard.id);
    if (!card) return;
    setCols(prev => ({
      ...prev,
      [dragCard.fromCol]: prev[dragCard.fromCol].filter(c => c.id !== dragCard.id),
      [toCol]: [...prev[toCol], card],
    }));
    setDragCard(null);
  };

  const onDragOver = e => e.preventDefault();

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-white/70 text-base font-light">Board</h2>
      </div>

      <div className="flex-1 flex gap-3 px-4 pb-4 overflow-hidden">
        {COLS.map(col => (
          <div
            key={col.id}
            onDrop={e => onDrop(e, col.id)}
            onDragOver={onDragOver}
            className={`flex-1 flex flex-col bg-white/2.5 border ${col.accent} rounded-2xl overflow-hidden min-w-0`}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5 shrink-0">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider flex-1">{col.label}</span>
              <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                {cols[col.id].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 morph-scrollbar">
              {cols[col.id].map(card => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={e => onDragStart(e, card.id, col.id)}
                  className="group flex items-start gap-2 bg-white/4 hover:bg-white/7 border border-white/6 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all"
                >
                  <GripVertical size={13} className="text-white/15 shrink-0 mt-0.5 group-hover:text-white/30" />
                  <p className="flex-1 text-sm text-white/75 leading-relaxed min-w-0">{card.text}</p>
                  <button onClick={() => removeCard(col.id, card.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400 transition-all shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* Inline add card */}
              {adding === col.id ? (
                <div className="bg-white/4 border border-white/10 rounded-xl p-2.5">
                  <textarea
                    autoFocus rows={2}
                    value={drafts[col.id]}
                    onChange={e => setDrafts(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(col.id); } if (e.key === 'Escape') setAdding(null); }}
                    placeholder="Card title..."
                    className="w-full bg-transparent text-sm text-white placeholder-white/20 outline-none resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => addCard(col.id)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-xs text-white/70 transition-all">Add</button>
                    <button onClick={() => setAdding(null)}
                      className="px-3 py-1 text-xs text-white/30 hover:text-white/60 transition-all">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(col.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/4 transition-all text-sm">
                  <Plus size={13} /> Add card
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
