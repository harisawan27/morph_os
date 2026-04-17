import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Trophy, Users, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: chess]

const KEY = 'morph_chess_v1';
const load = () => { try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};
const VALS = { P:1, N:3, B:3, R:5, Q:9, K:0 };

// ── Board init ────────────────────────────────────────────────────────────────

function initBoard() {
  const b = Array(64).fill(null);
  const back = ['R','N','B','Q','K','B','N','R'];
  back.forEach((t,c) => { b[c] = {t, c:'b'}; b[56+c] = {t, c:'w'}; });
  for (let c=0;c<8;c++) { b[8+c]={t:'P',c:'b'}; b[48+c]={t:'P',c:'w'}; }
  return b;
}

function initState() {
  return {
    ep: -1,          // en passant target square
    castling: { wK:true, wQ:true, bK:true, bQ:true },
    turn: 'w',
  };
}

// ── Move generation ───────────────────────────────────────────────────────────

function pseudoMoves(board, from, gs) {
  const p = board[from]; if (!p) return [];
  const {t,c} = p;
  const opp = c==='w'?'b':'w';
  const row = Math.floor(from/8), col = from%8;
  const moves = [];

  const slide = (dr,dc) => {
    let r=row+dr, cc=col+dc;
    while(r>=0&&r<8&&cc>=0&&cc<8) {
      const i=r*8+cc;
      if(board[i]) { if(board[i].c===opp) moves.push(i); break; }
      moves.push(i); r+=dr; cc+=dc;
    }
  };

  if (t==='P') {
    const dir=c==='w'?-1:1, start=c==='w'?6:1;
    const f1=from+dir*8;
    if(f1>=0&&f1<64&&!board[f1]) {
      moves.push(f1);
      if(row===start&&!board[from+dir*16]) moves.push(from+dir*16);
    }
    for(const dc of[-1,1]) {
      const nr=row+dir,nc=col+dc;
      if(nr>=0&&nr<8&&nc>=0&&nc<8) {
        const ti=nr*8+nc;
        if((board[ti]&&board[ti].c===opp)||ti===gs.ep) moves.push(ti);
      }
    }
  } else if (t==='N') {
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr=row+dr,nc=col+dc;
      if(nr>=0&&nr<8&&nc>=0&&nc<8){const i=nr*8+nc;if(!board[i]||board[i].c===opp)moves.push(i);}
    }
  } else if (t==='B') {
    for(const d of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(...d);
  } else if (t==='R') {
    for(const d of [[-1,0],[1,0],[0,-1],[0,1]]) slide(...d);
  } else if (t==='Q') {
    for(const d of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(...d);
  } else if (t==='K') {
    for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr=row+dr,nc=col+dc;
      if(nr>=0&&nr<8&&nc>=0&&nc<8){const i=nr*8+nc;if(!board[i]||board[i].c===opp)moves.push(i);}
    }
    // Castling
    const cr = gs.castling;
    if (c==='w'&&row===7&&col===4) {
      if(cr.wK&&!board[61]&&!board[62]&&board[63]?.t==='R') moves.push(62);
      if(cr.wQ&&!board[57]&&!board[58]&&!board[59]&&board[56]?.t==='R') moves.push(58);
    }
    if (c==='b'&&row===0&&col===4) {
      if(cr.bK&&!board[5]&&!board[6]&&board[7]?.t==='R') moves.push(6);
      if(cr.bQ&&!board[1]&&!board[2]&&!board[3]&&board[0]?.t==='R') moves.push(2);
    }
  }
  return moves;
}

function isAttacked(board, sq, byColor, gs) {
  for(let i=0;i<64;i++) {
    if(!board[i]||board[i].c!==byColor) continue;
    if(pseudoMoves(board,i,{...gs,ep:-1}).includes(sq)) return true;
  }
  return false;
}

function inCheck(board, color, gs) {
  const ki = board.findIndex(p=>p&&p.t==='K'&&p.c===color);
  if(ki===-1) return false;
  return isAttacked(board, ki, color==='w'?'b':'w', gs);
}

function applyMove(board, from, to, gs) {
  const nb = [...board];
  const p = {...nb[from]};
  const newGs = {...gs, ep:-1, castling:{...gs.castling}};

  // En passant capture
  if(p.t==='P'&&to===gs.ep) { nb[to+(p.c==='w'?8:-8)]=null; }

  // Double pawn push → set ep
  if(p.t==='P'&&Math.abs(to-from)===16) { newGs.ep=(from+to)/2; }

  // Castling move
  if(p.t==='K'&&Math.abs(to-from)===2) {
    if(to>from) { nb[to-1]=nb[to+1]; nb[to+1]=null; } // kingside
    else        { nb[to+1]=nb[to-2]; nb[to-2]=null; } // queenside
  }

  // Update castling rights
  if(p.t==='K') { if(p.c==='w'){newGs.castling.wK=false;newGs.castling.wQ=false;} else{newGs.castling.bK=false;newGs.castling.bQ=false;} }
  if(p.t==='R') {
    if(from===63) newGs.castling.wK=false;
    if(from===56) newGs.castling.wQ=false;
    if(from===7)  newGs.castling.bK=false;
    if(from===0)  newGs.castling.bQ=false;
  }

  nb[to]=p; nb[from]=null;

  // Pawn promotion → auto queen
  if(p.t==='P'&&(Math.floor(to/8)===0||Math.floor(to/8)===7)) nb[to]={...p,t:'Q'};

  return {nb, newGs};
}

function legalMoves(board, from, gs) {
  const p = board[from]; if(!p) return [];
  return pseudoMoves(board,from,gs).filter(to => {
    // Castling: can't castle through check
    if(p.t==='K'&&Math.abs(to-from)===2) {
      const step = to>from?1:-1;
      if(isAttacked(board,from,p.c==='w'?'b':'w',gs)) return false;
      if(isAttacked(board,from+step,p.c==='w'?'b':'w',gs)) return false;
    }
    const {nb,newGs} = applyMove(board,from,to,gs);
    return !inCheck(nb,p.c,newGs);
  });
}

function allLegalMoves(board, color, gs) {
  const moves = [];
  for(let i=0;i<64;i++) {
    if(!board[i]||board[i].c!==color) continue;
    legalMoves(board,i,gs).forEach(to=>moves.push({from:i,to}));
  }
  return moves;
}

// ── AI (greedy material + random) ────────────────────────────────────────────

function evalMove(board, from, to) {
  const captured = board[to];
  return captured ? (VALS[captured.t]||0) : 0;
}

function aiPick(board, gs) {
  const moves = allLegalMoves(board,'b',gs);
  if(!moves.length) return null;
  const scored = moves.map(m=>({...m, score:evalMove(board,m.from,m.to)}));
  const max = Math.max(...scored.map(m=>m.score));
  const best = scored.filter(m=>m.score===max);
  return best[Math.floor(Math.random()*best.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

export default function Chess() {
  const [board, setBoard]       = useState(initBoard);
  const [gs, setGs]             = useState(initState);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [vsAI, setVsAI]         = useState(true);
  const [locked, setLocked]     = useState(false);
  const [status, setStatus]     = useState(null);
  const [score, setScore]       = useState(()=>load()||{w:0,b:0,d:0});
  const [lastMove, setLastMove] = useState(null);
  const [captured, setCaptured] = useState({w:[],b:[]});

  // Refs so AI timeout always reads latest state
  const boardRef = useRef(board);
  const gsRef    = useRef(gs);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { gsRef.current = gs; }, [gs]);

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

  const updateStatus = useCallback((b, color, g) => {
    const moves = allLegalMoves(b,color,g);
    if(!moves.length) {
      if(inCheck(b,color,g)) {
        setStatus('checkmate');
        const winner = color==='w'?'b':'w';
        setScore(s=>({...s,[winner]:s[winner]+1}));
      } else {
        setStatus('stalemate');
        setScore(s=>({...s,d:s.d+1}));
      }
    } else if(inCheck(b,color,g)) {
      setStatus('check');
    } else {
      setStatus(null);
    }
  }, []);

  const doMove = useCallback((board, from, to, gs, nextTurn) => {
    const cap = board[to];
    const {nb, newGs} = applyMove(board,from,to,gs);
    newGs.turn = nextTurn;
    setBoard(nb);
    setGs(newGs);
    setLastMove({from,to});
    setSelected(null);
    setValidMoves([]);
    if(cap) setCaptured(prev=>({...prev,[cap.c]:[...prev[cap.c],cap.t]}));
    updateStatus(nb,nextTurn,newGs);
    return nb;
  }, [updateStatus]);

  const handleClick = useCallback((idx)=>{
    if(locked||status==='checkmate'||status==='stalemate') return;
    if(vsAI&&gs.turn==='b') return;

    const piece = board[idx];

    // Move to highlighted square
    if(selected!==null&&validMoves.includes(idx)) {
      doMove(board,selected,idx,gs,gs.turn==='w'?'b':'w');
      if(vsAI) setLocked(true);
      return;
    }

    // Select own piece
    if(piece&&piece.c===gs.turn&&(!vsAI||gs.turn==='w')) {
      if(selected===idx){setSelected(null);setValidMoves([]);return;}
      const vm = legalMoves(board,idx,gs);
      setSelected(idx);
      setValidMoves(vm);
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  },[board,gs,selected,validMoves,locked,status,vsAI,doMove,updateStatus]);

  // AI move via useEffect — reads fresh state from refs, no stale closures
  useEffect(() => {
    if (!vsAI || gs.turn !== 'b' || status === 'checkmate' || status === 'stalemate') return;
    const t = setTimeout(() => {
      const b = boardRef.current;
      const g = gsRef.current;
      if (g.turn !== 'b') { setLocked(false); return; }
      const m = aiPick(b, g);
      if (m) {
        const cap = b[m.to];
        const { nb: after, newGs } = applyMove(b, m.from, m.to, g);
        newGs.turn = 'w';
        setBoard(after);
        setGs(newGs);
        setLastMove({ from: m.from, to: m.to });
        if (cap) setCaptured(c => ({ ...c, [cap.c]: [...c[cap.c], cap.t] }));
        updateStatus(after, 'w', newGs);
      }
      setLocked(false);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsAI, gs.turn, status]);

  const reset = () => {
    setBoard(initBoard());
    setGs(initState());
    setSelected(null);
    setValidMoves([]);
    setLocked(false);
    setStatus(null);
    setLastMove(null);
    setCaptured({w:[],b:[]});
  };

  const capturedStr = (color) => captured[color].map(t=>PIECES[color[0]+t]||'').join('');

  return (
    <div className="morph-static-dark h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3 p-3 overflow-hidden select-none">

      {/* Mode */}
      <div className="flex bg-white/4 border border-white/[0.07] rounded-full p-0.5 gap-0.5">
        {[{label:'vs AI',val:true,icon:<Bot size={11}/>},{label:'2 Player',val:false,icon:<Users size={11}/>}].map(({label,val,icon})=>(
          <button key={label} onClick={()=>{setVsAI(val);reset();setScore({w:0,b:0,d:0});}}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${vsAI===val?'bg-white/10 text-white':'text-white/30 hover:text-white/50'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Score */}
      <div className="flex items-center gap-6 text-center">
        <div><p className="text-lg font-light text-white/70">{score.w}</p><p className="text-[9px] uppercase tracking-widest text-white/20">White</p></div>
        <div><p className="text-white/20 text-xs">{score.d}</p><p className="text-[9px] uppercase tracking-widest text-white/10">Draw</p></div>
        <div><p className="text-lg font-light text-white/70">{score.b}</p><p className="text-[9px] uppercase tracking-widest text-white/20">{vsAI?'AI':'Black'}</p></div>
      </div>

      {/* Captured by black */}
      <div className="text-xs text-white/30 h-4">{capturedStr('w')}</div>

      {/* Board */}
      <div className="relative rounded-lg overflow-hidden" style={{ border:'1px solid var(--morph-08)' }}>
        <div className="grid grid-cols-8" style={{ width:'min(312px,88vw)', height:'min(312px,88vw)' }}>
          {Array(64).fill(null).map((_,idx)=>{
            const row=Math.floor(idx/8), col=idx%8;
            const light = (row+col)%2===0;
            const piece = board[idx];
            const isSel = selected===idx;
            const isVM  = validMoves.includes(idx);
            const isLast= lastMove&&(lastMove.from===idx||lastMove.to===idx);
            const isCheck= piece?.t==='K'&&piece.c===gs.turn&&status==='check';

            return (
              <div key={idx} onClick={()=>handleClick(idx)}
                className="relative flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: isSel
                    ? 'rgba(167,139,250,0.35)'
                    : isVM&&piece
                    ? (light?'rgba(248,113,113,0.3)':'rgba(248,113,113,0.2)')
                    : isCheck
                    ? 'rgba(239,68,68,0.3)'
                    : isLast
                    ? (light?'rgba(167,139,250,0.18)':'rgba(167,139,250,0.12)')
                    : light
                    ? '#d4c5a0'
                    : '#7a5c3a',
                  aspectRatio:'1',
                }}>

                {/* Move dot */}
                {isVM&&!piece&&(
                  <div className="w-[30%] h-[30%] rounded-full" style={{background:'rgba(0,0,0,0.25)'}}/>
                )}
                {/* Capture ring */}
                {isVM&&piece&&(
                  <div className="absolute inset-0 rounded-sm" style={{border:'3px solid rgba(0,0,0,0.3)'}}/>
                )}

                {/* Piece */}
                {piece&&(
                  <motion.span layout
                    className="font-normal leading-none z-10"
                    style={{
                      fontSize:'min(32px,8.5vw)',
                      filter: piece.c==='w'
                        ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                        : 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))',
                      color: piece.c==='w'?'#f5f0e8':'#1a1008',
                    }}>
                    {PIECES[piece.c+piece.t]}
                  </motion.span>
                )}

                {/* Rank label */}
                {col===0&&<span className="absolute top-0.5 left-0.5 text-[7px] font-bold opacity-40" style={{color:light?'#7a5c3a':'#d4c5a0'}}>{RANKS[row]}</span>}
                {/* File label */}
                {row===7&&<span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold opacity-40" style={{color:light?'#7a5c3a':'#d4c5a0'}}>{FILES[col]}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Captured by white */}
      <div className="text-xs text-white/30 h-4">{capturedStr('b')}</div>

      {/* Status */}
      <div className="h-7 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div key={status+gs.turn} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="text-center">
            {status==='checkmate'?(
              <p className="text-sm flex items-center gap-1.5">
                <Trophy size={13} className="text-yellow-400"/>
                {gs.turn==='w'?(vsAI?'AI wins!':'Black wins!'):(vsAI?'You win!':'White wins!')}
              </p>
            ):status==='stalemate'?(
              <p className="text-sm text-white/40">Stalemate — Draw</p>
            ):status==='check'?(
              <p className="text-sm" style={{color:'rgba(248,113,113,0.9)'}}>
                {gs.turn==='w'?'White':'Black'} is in check!
              </p>
            ):(
              <p className="text-xs text-white/25">
                {gs.turn==='w'?vsAI?'Your turn (white)':'White to move':vsAI?'AI thinking…':'Black to move'}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={reset}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white transition-all"
        style={{background:'var(--morph-04)',border:'1px solid var(--morph-07)'}}>
        <RotateCcw size={11}/> New game
      </button>
    </div>
  );
}
