import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Delete } from 'lucide-react';
import { motion } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: calculator]

const CALC_STORAGE = 'morph_calc_history_v1';

function safeEval(expr) {
  try {
    // replace display operators with JS operators
    const clean = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + clean + ')')();
    if (!isFinite(result)) return 'Error';
    // trim floating point noise
    return parseFloat(result.toPrecision(12)).toString();
  } catch { return 'Error'; }
}

export default function CalculatorArtifact() {
  const [display, setDisplay]       = useState('0');
  const [expr, setExpr]             = useState('');
  const [history, setHistory]       = (typeof useCloudStorage !== 'undefined') ? useCloudStorage('morph_calc_history_v2', []) : useState([]);
  const [justEvaled, setJustEvaled] = useState(false);

  const appendChar = useCallback((ch) => {
    setJustEvaled(false);
    setDisplay(prev => {
      if (justEvaled && /[\d.]/.test(ch)) return ch;
      if (prev === '0' && /\d/.test(ch)) return ch;
      if (prev === 'Error') return ch;
      if (ch === '.' && prev.split(/[+\-×÷]/).pop().includes('.')) return prev;
      return prev + ch;
    });
  }, [justEvaled]);

  const inputOp = (op) => {
    setJustEvaled(false);
    setDisplay(prev => {
      const last = prev.slice(-1);
      if (['+','−','×','÷'].includes(last)) return prev.slice(0,-1) + op;
      if (prev === 'Error') return '0' + op;
      return prev + op;
    });
  };

  const evaluate = () => {
    const result = safeEval(display);
    if (result !== 'Error') {
      setHistory(h => [`${display} = ${result}`, ...h].slice(0, 6));
    }
    setExpr(display);
    setDisplay(result);
    setJustEvaled(true);
  };

  const clear = () => { setDisplay('0'); setExpr(''); setJustEvaled(false); };
  const backspace = () => {
    if (justEvaled) { clear(); return; }
    setDisplay(d => d.length > 1 ? d.slice(0,-1) : '0');
  };
  const negate   = () => setDisplay(d => d.startsWith('-') ? d.slice(1) : '-' + d);
  const percent  = () => { try { setDisplay(d => String(parseFloat(d) / 100)); } catch {} };

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') appendChar(e.key);
      else if (e.key === '.') appendChar('.');
      else if (e.key === '+') inputOp('+');
      else if (e.key === '-') inputOp('−');
      else if (e.key === '*') inputOp('×');
      else if (e.key === '/') { e.preventDefault(); inputOp('÷'); }
      else if (e.key === 'Enter' || e.key === '=') evaluate();
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [display, justEvaled]);

  const displayLen = display.length;
  const textSize = displayLen > 14 ? 'text-2xl' : displayLen > 9 ? 'text-3xl' : 'text-5xl';

  const Btn = ({ label, onPress, variant = 'num' }) => {
    const variants = {
      num:    'bg-white/7 hover:bg-white/12 text-white/90 border-white/7',
      op:     'bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-600/20',
      fn:     'bg-white/4 hover:bg-white/8 text-white/50 border-white/5',
      equals: 'bg-green-600 hover:bg-green-500 text-white border-green-500/50 shadow-[0_0_30px_rgba(22,163,74,0.35)]',
    };
    return (
      <motion.button
        whileTap={{ scale: 0.91 }}
        onClick={onPress}
        className={`py-4.5 rounded-2xl text-xl font-light border transition-all select-none ${variants[variant]}`}
      >
        {label}
      </motion.button>
    );
  };

  return (
    <div className="flex h-full bg-[#050505] text-white items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-75 flex flex-col gap-3">

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-0.5 mb-1">
            {history.slice(0,3).map((h,i) => (
              <p key={i} className="text-right text-[10px] font-mono text-white/15 truncate">{h}</p>
            ))}
          </div>
        )}

        {/* Display */}
        <div className="bg-white/4 border border-white/7 rounded-3xl px-6 pt-5 pb-4 backdrop-blur-xl">
          {expr && <p className="text-right text-xs text-white/20 font-mono mb-1 truncate">{expr}</p>}
          <p className={`text-right font-extralight tracking-tight font-mono transition-all duration-150 ${textSize} ${display === 'Error' ? 'text-red-400' : ''}`}>
            {display}
          </p>
        </div>

        {/* Buttons grid */}
        <div className="grid grid-cols-4 gap-2.5">
          <Btn label="AC"  onPress={clear}           variant="fn" />
          <Btn label="+/-" onPress={negate}          variant="fn" />
          <Btn label="%"   onPress={percent}         variant="fn" />
          <Btn label="÷"   onPress={() => inputOp('÷')} variant="op" />

          <Btn label="7"   onPress={() => appendChar('7')} />
          <Btn label="8"   onPress={() => appendChar('8')} />
          <Btn label="9"   onPress={() => appendChar('9')} />
          <Btn label="×"   onPress={() => inputOp('×')}   variant="op" />

          <Btn label="4"   onPress={() => appendChar('4')} />
          <Btn label="5"   onPress={() => appendChar('5')} />
          <Btn label="6"   onPress={() => appendChar('6')} />
          <Btn label="−"   onPress={() => inputOp('−')}   variant="op" />

          <Btn label="1"   onPress={() => appendChar('1')} />
          <Btn label="2"   onPress={() => appendChar('2')} />
          <Btn label="3"   onPress={() => appendChar('3')} />
          <Btn label="+"   onPress={() => inputOp('+')}   variant="op" />

          {/* Wide delete */}
          <motion.button
            whileTap={{ scale: 0.91 }}
            onClick={backspace}
            className="py-4.5 rounded-2xl text-sm border bg-white/7 hover:bg-white/12 text-white/40 border-white/7 transition-all flex items-center justify-center"
          >
            <Delete size={18} />
          </motion.button>
          <Btn label="0"   onPress={() => appendChar('0')} />
          <Btn label="."   onPress={() => appendChar('.')} />
          <Btn label="="   onPress={evaluate}              variant="equals" />
        </div>

        <p className="text-center text-[8px] uppercase tracking-[0.3em] text-white/10 mt-1">Keyboard Supported</p>
      </div>
    </div>
  );
}
