import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Trophy, Users, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: tictactoe]

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWin(board, p) {
  return WINS.find(([a,b,c]) => board[a]===p && board[b]===p && board[c]===p) || null;
}

function bestMove(board) {
  // Win if possible
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const b = [...board]; b[i] = 'O';
      if (checkWin(b, 'O')) return i;
    }
  }
  // Block player win
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const b = [...board]; b[i] = 'X';
      if (checkWin(b, 'X')) return i;
    }
  }
  // Center
  if (!board[4]) return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  // Any
  const avail = board.map((v,i) => !v ? i : -1).filter(i => i !== -1);
  return avail[Math.floor(Math.random() * avail.length)];
}

const SCORE_KEY = 'morph_ttt_v1';
function loadScore() {
  try { const d = localStorage.getItem(SCORE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}

export default function TicTacToe() {
  const [board,  setBoard]  = useState(Array(9).fill(null));
  const [xTurn,  setXTurn]  = useState(true);
  const [score,  setScore]  = useState(() => loadScore() || { X: 0, O: 0, D: 0 });
  const [vsAI,   setVsAI]   = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(score)); } catch {}
  }, [score]);

  const winLine = checkWin(board, 'X') || checkWin(board, 'O');
  const winner  = winLine ? board[winLine[0]] : null;
  const draw    = !winner && board.every(Boolean);
  const over    = winner || draw;

  const play = useCallback((i) => {
    if (locked || board[i] || over) return;
    const next = [...board];
    next[i] = xTurn ? 'X' : 'O';
    setBoard(next);
    const wl = checkWin(next, next[i]);
    if (wl) {
      setScore(s => ({ ...s, [next[i]]: s[next[i]] + 1 }));
      return;
    }
    if (next.every(Boolean)) {
      setScore(s => ({ ...s, D: s.D + 1 }));
      return;
    }
    if (vsAI && xTurn) {
      setLocked(true);
      setTimeout(() => {
        const m = bestMove(next);
        const after = [...next]; after[m] = 'O';
        setBoard(after);
        const wl2 = checkWin(after, 'O');
        if (wl2) setScore(s => ({ ...s, O: s.O + 1 }));
        else if (after.every(Boolean)) setScore(s => ({ ...s, D: s.D + 1 }));
        setLocked(false);
      }, 350);
    } else {
      setXTurn(t => !t);
    }
  }, [board, xTurn, over, vsAI, locked]);

  const reset = () => { setBoard(Array(9).fill(null)); setXTurn(true); setLocked(false); };

  const cellStyle = (i) => {
    const base = 'aspect-square flex items-center justify-center rounded-2xl text-3xl sm:text-4xl font-light border transition-all duration-200 ';
    const isWin = winLine?.includes(i);
    if (board[i] === 'X') return base + (isWin ? 'bg-purple-500/25 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-purple-400');
    if (board[i] === 'O') return base + (isWin ? 'bg-blue-500/25 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-blue-400');
    return base + (over ? 'bg-white/[0.02] border-white/[0.05] cursor-default' : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/8 cursor-pointer');
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-5 p-5 overflow-hidden select-none">

      {/* Mode toggle */}
      <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-full p-0.5 gap-0.5">
        {[{label:'vs AI', val:true, icon:<Bot size={12}/>},{label:'2 Player', val:false, icon:<Users size={12}/>}].map(({label,val,icon}) => (
          <button key={label} onClick={() => { setVsAI(val); reset(); setScore({X:0,O:0,D:0}); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${vsAI===val ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Scores */}
      <div className="flex items-center gap-6 text-center">
        <div><p className="text-purple-400 text-lg font-light">{score.X}</p><p className="text-white/25 text-[9px] uppercase tracking-widest">You</p></div>
        <div><p className="text-white/25 text-lg font-light">{score.D}</p><p className="text-white/15 text-[9px] uppercase tracking-widest">Draw</p></div>
        <div><p className="text-blue-400 text-lg font-light">{score.O}</p><p className="text-white/25 text-[9px] uppercase tracking-widest">{vsAI ? 'AI' : 'Player 2'}</p></div>
      </div>

      {/* Board */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-2">
        {board.map((v, i) => (
          <motion.button key={i} onClick={() => play(i)} whileTap={{ scale: 0.95 }} className={cellStyle(i)}>
            <AnimatePresence>
              {v && (
                <motion.span key={v+i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  {v === 'X' ? '×' : '○'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        <motion.div key={over ? 'over' : xTurn ? 'x' : 'o'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center h-8">
          {winner ? (
            <p className="text-white/70 text-sm flex items-center gap-1.5 justify-center">
              <Trophy size={14} className="text-yellow-400" />
              {winner === 'X' ? 'You win!' : vsAI ? 'AI wins!' : 'Player 2 wins!'}
            </p>
          ) : draw ? (
            <p className="text-white/40 text-sm">Draw!</p>
          ) : (
            <p className="text-white/30 text-xs">{xTurn ? (vsAI ? 'Your turn' : 'Player 1 (×)') : vsAI ? 'AI thinking…' : 'Player 2 (○)'}</p>
          )}
        </motion.div>
      </AnimatePresence>

      {over && (
        <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white text-sm transition-all">
          <RotateCcw size={13} /> Play again
        </button>
      )}
    </div>
  );
}
