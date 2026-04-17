import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Trophy, Users, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: checkers]

const KEY = 'morph_checkers_v1';
const load = () => { try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

// ── Board helpers ─────────────────────────────────────────────────────────────

function initBoard() {
  const b = Array(64).fill(null);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 1) continue;
      const i = r * 8 + c;
      if (r < 3) b[i] = { c: 'b', k: false };
      if (r > 4) b[i] = { c: 'r', k: false };
    }
  }
  return b;
}

// All jump sequences from `from` (returns [{from, to, caps:[squares]}])
function getJumps(board, from, color, visited = []) {
  const piece = board[from];
  if (!piece) return [];
  const row = Math.floor(from / 8), col = from % 8;
  const dirs = piece.k ? [-1, 1] : (color === 'r' ? [-1] : [1]);
  const results = [];

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const mr = row + dr, mc = col + dc;
      const lr = row + 2 * dr, lc = col + 2 * dc;
      if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
      const mi = mr * 8 + mc, li = lr * 8 + lc;
      if (!board[mi] || board[mi].c === color) continue;
      if (board[li] !== null) continue;
      if (visited.includes(mi)) continue;

      // Simulate jump
      const nb = [...board];
      const landed = { ...piece };
      if ((color === 'r' && lr === 0) || (color === 'b' && lr === 7)) landed.k = true;
      nb[li] = landed; nb[mi] = null; nb[from] = null;

      const cont = getJumps(nb, li, color, [...visited, mi]);
      if (cont.length === 0) {
        results.push({ from, to: li, caps: [...visited, mi] });
      } else {
        cont.forEach(c => results.push({ from, to: c.to, caps: [...visited, mi, ...c.caps] }));
      }
    }
  }
  return results;
}

function getAllMoves(board, color) {
  const jumps = [], regulars = [];
  for (let i = 0; i < 64; i++) {
    if (!board[i] || board[i].c !== color) continue;
    const piece = board[i];
    const row = Math.floor(i / 8), col = i % 8;
    jumps.push(...getJumps(board, i, color));
    const dirs = piece.k ? [-1, 1] : (color === 'r' ? [-1] : [1]);
    for (const dr of dirs) for (const dc of [-1, 1]) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const ni = nr * 8 + nc;
      if (!board[ni]) regulars.push({ from: i, to: ni, caps: [] });
    }
  }
  return jumps.length > 0 ? jumps : regulars;
}

function applyMove(board, move) {
  const nb = [...board];
  const piece = { ...nb[move.from] };
  nb[move.to] = piece;
  nb[move.from] = null;
  move.caps.forEach(c => { nb[c] = null; });
  const row = Math.floor(move.to / 8);
  if ((piece.c === 'r' && row === 0) || (piece.c === 'b' && row === 7)) nb[move.to] = { ...piece, k: true };
  return nb;
}

function aiMove(board) {
  const moves = getAllMoves(board, 'b');
  if (!moves.length) return null;
  const max = Math.max(...moves.map(m => m.caps.length));
  const best = moves.filter(m => m.caps.length === max);
  // Prefer kinging
  const kinging = best.filter(m => {
    const piece = board[m.from];
    return !piece.k && Math.floor(m.to / 8) === 7;
  });
  const pool = kinging.length ? kinging : best;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Checkers() {
  const [board, setBoard]     = useState(initBoard);
  const [turn, setTurn]       = useState('r');
  const [selected, setSelected] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [moveMap, setMoveMap] = useState({});
  const [vsAI, setVsAI]       = useState(true);
  const [locked, setLocked]   = useState(false);
  const [score, setScore]     = useState(() => load() || { r: 0, b: 0 });
  const [winner, setWinner]   = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const boardRef = useRef(board);
  const turnRef  = useRef(turn);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { turnRef.current = turn; }, [turn]);

  // Cloud persistence
  useEffect(() => {
    if (typeof morphLoadState !== 'undefined') {
      morphLoadState().then(s => { if (s?.score) setScore(s.score); }).catch(()=>{});
    }
  }, []);
  useEffect(() => {
    save(score);
    if (typeof morphSaveState !== 'undefined') morphSaveState({ score });
  }, [score]);

  const checkWinner = useCallback((b, nextTurn) => {
    const moves = getAllMoves(b, nextTurn);
    if (moves.length === 0) {
      const w = nextTurn === 'r' ? 'b' : 'r';
      setWinner(w);
      setScore(s => ({ ...s, [w]: s[w] + 1 }));
      return true;
    }
    return false;
  }, []);

  const doMove = useCallback((board, move, nextTurn) => {
    const nb = applyMove(board, move);
    setBoard(nb);
    setLastMove({ from: move.from, to: move.to });
    setSelected(null);
    setHighlights([]);
    setMoveMap({});
    if (!checkWinner(nb, nextTurn)) setTurn(nextTurn);
  }, [checkWinner]);

  const handleClick = useCallback((idx) => {
    if (locked || winner) return;
    if (vsAI && turn === 'b') return;

    const piece = board[idx];
    const currentMoves = getAllMoves(board, turn);

    // Clicking a valid move destination
    if (selected !== null && moveMap[idx]) {
      const move = moveMap[idx];
      doMove(board, move, turn === 'r' ? 'b' : 'r');
      if (vsAI && !winner) setLocked(true);
      return;
    }

    // Deselect
    if (selected === idx) { setSelected(null); setHighlights([]); setMoveMap({}); return; }

    // Select a piece
    if (piece && piece.c === turn) {
      const pieceMoves = currentMoves.filter(m => m.from === idx);
      if (!pieceMoves.length) return;
      setSelected(idx);
      const mm = {};
      pieceMoves.forEach(m => { mm[m.to] = m; });
      setHighlights(pieceMoves.map(m => m.to));
      setMoveMap(mm);
    } else {
      setSelected(null); setHighlights([]); setMoveMap({});
    }
  }, [board, selected, turn, locked, winner, vsAI, moveMap, doMove, checkWinner]);

  // AI move via useEffect — reads fresh state from refs
  useEffect(() => {
    if (!vsAI || turn !== 'b' || winner) return;
    const t = setTimeout(() => {
      const b = boardRef.current;
      if (turnRef.current !== 'b') { setLocked(false); return; }
      const m = aiMove(b);
      if (m) {
        const after = applyMove(b, m);
        setBoard(after);
        setLastMove({ from: m.from, to: m.to });
        if (!checkWinner(after, 'r')) setTurn('r');
      }
      setLocked(false);
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsAI, turn, winner]);

  const reset = () => {
    setBoard(initBoard());
    setTurn('r');
    setSelected(null);
    setHighlights([]);
    setMoveMap({});
    setLocked(false);
    setWinner(null);
    setLastMove(null);
  };

  const rCount = board.filter(p => p?.c === 'r').length;
  const bCount = board.filter(p => p?.c === 'b').length;

  return (
    <div className="morph-static-dark h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4 p-4 overflow-hidden select-none">

      {/* Mode toggle */}
      <div className="flex bg-white/4 border border-white/[0.07] rounded-full p-0.5 gap-0.5">
        {[{ label: 'vs AI', val: true, icon: <Bot size={11} /> }, { label: '2 Player', val: false, icon: <Users size={11} /> }].map(({ label, val, icon }) => (
          <button key={label} onClick={() => { setVsAI(val); reset(); setScore({ r: 0, b: 0 }); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${vsAI === val ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Score + piece count */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-xl font-light" style={{ color: 'rgba(248,113,113,0.9)' }}>{score.r}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/25 mt-0.5">You ({rCount}♟)</p>
        </div>
        <div>
          <p className="text-white/20 text-xs uppercase tracking-widest">vs</p>
        </div>
        <div>
          <p className="text-xl font-light" style={{ color: 'rgba(96,165,250,0.9)' }}>{score.b}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/25 mt-0.5">{vsAI ? 'AI' : 'P2'} ({bCount}♟)</p>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-8 rounded-xl overflow-hidden" style={{ border: '1px solid var(--morph-06)', width: 'min(320px, 90vw)', height: 'min(320px, 90vw)' }}>
        {Array(64).fill(null).map((_, idx) => {
          const row = Math.floor(idx / 8), col = idx % 8;
          const dark = (row + col) % 2 === 1;
          const piece = board[idx];
          const isSelected = selected === idx;
          const isHighlight = highlights.includes(idx);
          const isLast = lastMove && (lastMove.from === idx || lastMove.to === idx);

          return (
            <div
              key={idx}
              onClick={() => dark ? handleClick(idx) : null}
              className="relative flex items-center justify-center transition-colors"
              style={{
                background: isSelected
                  ? 'rgba(248,113,113,0.25)'
                  : isHighlight
                  ? 'rgba(167,139,250,0.2)'
                  : isLast && dark
                  ? 'var(--morph-06)'
                  : dark
                  ? '#1a1a1a'
                  : '#0e0e0e',
                cursor: dark ? 'pointer' : 'default',
                aspectRatio: '1',
              }}
            >
              {isHighlight && !piece && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(167,139,250,0.5)' }} />
              )}
              {piece && (
                <motion.div
                  layout
                  className="rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    width: '72%', height: '72%',
                    background: piece.c === 'r'
                      ? 'radial-gradient(circle at 35% 35%, rgba(252,165,165,0.9), rgba(220,38,38,0.9))'
                      : 'radial-gradient(circle at 35% 35%, rgba(147,197,253,0.9), rgba(29,78,216,0.9))',
                    border: `2px solid ${piece.c === 'r' ? 'rgba(254,202,202,0.4)' : 'rgba(191,219,254,0.4)'}`,
                    boxShadow: isSelected ? `0 0 0 2px ${piece.c === 'r' ? 'rgba(248,113,113,0.8)' : 'rgba(96,165,250,0.8)'}` : '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                >
                  {piece.k && <span style={{ fontSize: '10px' }}>♛</span>}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          {winner ? (
            <motion.p key="win" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm flex items-center gap-1.5">
              <Trophy size={13} className="text-yellow-400" />
              {winner === 'r' ? 'You win!' : vsAI ? 'AI wins!' : 'Blue wins!'}
            </motion.p>
          ) : (
            <motion.p key={turn} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-white/30">
              {turn === 'r' ? (vsAI ? 'Your turn (red)' : "Red's turn") : vsAI ? 'AI thinking…' : "Blue's turn"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button onClick={reset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white transition-all"
          style={{ background: 'var(--morph-04)', border: '1px solid var(--morph-07)' }}>
          <RotateCcw size={12} /> New game
        </button>
      </div>
    </div>
  );
}
