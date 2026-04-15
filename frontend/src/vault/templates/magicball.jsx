import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: magicball]

const ANSWERS = [
  // Positive
  { text: 'It is certain',        type: 'positive' },
  { text: 'It is decidedly so',   type: 'positive' },
  { text: 'Without a doubt',      type: 'positive' },
  { text: 'Yes, definitely',      type: 'positive' },
  { text: 'You may rely on it',   type: 'positive' },
  { text: 'As I see it, yes',     type: 'positive' },
  { text: 'Most likely',          type: 'positive' },
  { text: 'Outlook good',         type: 'positive' },
  { text: 'Yes',                  type: 'positive' },
  { text: 'Signs point to yes',   type: 'positive' },
  // Neutral
  { text: 'Reply hazy, try again',    type: 'neutral' },
  { text: 'Ask again later',          type: 'neutral' },
  { text: 'Better not tell you now',  type: 'neutral' },
  { text: 'Cannot predict now',       type: 'neutral' },
  { text: 'Concentrate and ask again',type: 'neutral' },
  // Negative
  { text: "Don't count on it",   type: 'negative' },
  { text: 'My reply is no',      type: 'negative' },
  { text: 'My sources say no',   type: 'negative' },
  { text: 'Outlook not so good', type: 'negative' },
  { text: 'Very doubtful',       type: 'negative' },
];

const TYPE_COLORS = {
  positive: { text: 'text-emerald-400', glow: 'rgba(52,211,153,0.3)', bg: 'from-emerald-500/10 to-emerald-500/5' },
  neutral:  { text: 'text-yellow-400',  glow: 'rgba(251,191,36,0.3)',  bg: 'from-yellow-500/10 to-yellow-500/5' },
  negative: { text: 'text-red-400',     glow: 'rgba(248,113,113,0.3)', bg: 'from-red-500/10 to-red-500/5' },
};

export default function MagicBall() {
  const [answer,   setAnswer]   = useState(null);
  const [shaking,  setShaking]  = useState(false);
  const [question, setQuestion] = useState('');
  const [history,  setHistory]  = useState([]);

  const shake = useCallback(() => {
    if (shaking) return;
    setShaking(true);
    setAnswer(null);
    setTimeout(() => {
      const ans = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
      setAnswer(ans);
      setShaking(false);
      if (question.trim()) {
        setHistory(h => [{ q: question.trim(), a: ans }, ...h].slice(0, 5));
      }
    }, 1000);
  }, [shaking, question]);

  const colors = answer ? TYPE_COLORS[answer.type] : TYPE_COLORS.neutral;

  return (
    <div className="h-full bg-[#050505] text-white flex flex-col items-center justify-between p-6 overflow-hidden select-none">

      {/* Question input */}
      <div className="w-full max-w-xs">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && shake()}
          placeholder="Ask a yes/no question…"
          className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-white/15 rounded-2xl px-4 py-3 text-sm text-white/65 placeholder-white/18 outline-none text-center transition-colors"
        />
      </div>

      {/* Ball */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <motion.button
          onClick={shake}
          whileTap={{ scale: 0.95 }}
          animate={shaking ? {
            x: [-8, 8, -6, 6, -4, 4, 0],
            y: [0, -4, 4, -3, 3, 0],
            transition: { duration: 0.6, repeat: 0 }
          } : {}}
          className="relative cursor-pointer"
          style={{ filter: answer ? `drop-shadow(0 0 30px ${colors.glow})` : 'drop-shadow(0 0 20px rgba(124,58,237,0.2))' }}
        >
          {/* Ball SVG */}
          <svg width={200} height={200} viewBox="0 0 200 200">
            <defs>
              <radialGradient id="ball" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#2a2a3e" />
                <stop offset="60%" stopColor="#0d0d1a" />
                <stop offset="100%" stopColor="#000008" />
              </radialGradient>
              <radialGradient id="shine" cx="30%" cy="25%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="inner" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
                <stop offset="100%" stopColor="rgba(37,99,235,0.3)" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="95" fill="url(#ball)" />
            <circle cx="100" cy="100" r="95" fill="url(#shine)" />
            <circle cx="100" cy="100" r="40" fill="url(#inner)" opacity="0.8" />
            <text x="100" y="107" textAnchor="middle" dominantBaseline="middle"
              fontSize="32" fontWeight="bold" fill="rgba(255,255,255,0.9)">8</text>
          </svg>

          {/* Answer inside */}
          <AnimatePresence>
            {answer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center p-6"
              >
                <p className={`text-[11px] text-center font-medium leading-snug ${colors.text}`}>
                  {answer.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <p className="text-white/20 text-xs">
          {shaking ? 'The spirits are consulting…' : answer ? 'Click to ask again' : 'Click the ball to reveal your fate'}
        </p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-xs space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest text-white/15 mb-2">Recent</p>
          {history.map((item, i) => (
            <div key={i} className={`flex items-start justify-between gap-3 bg-gradient-to-r ${TYPE_COLORS[item.a.type].bg} border border-white/[0.05] rounded-xl px-3 py-2`}>
              <p className="text-white/40 text-xs truncate flex-1">{item.q}</p>
              <p className={`text-[11px] font-medium shrink-0 ${TYPE_COLORS[item.a.type].text}`}>{item.a.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
