import React, { useState } from 'react';
import { Check, X, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [MORZ_VAULT_TEMPLATE: quiz]

const seedData = {{DATA_JSON}};

const DEFAULT_QUESTIONS = [
  { question: 'What is the largest planet in our solar system?', options: ['Earth','Saturn','Jupiter','Uranus'], correct: 2 },
  { question: 'Which element has the chemical symbol "Au"?',     options: ['Silver','Gold','Copper','Aluminum'], correct: 1 },
  { question: 'How many continents are there on Earth?',         options: ['5','6','7','8'], correct: 2 },
  { question: 'What year did the first iPhone launch?',          options: ['2005','2006','2007','2008'], correct: 2 },
  { question: 'Who painted the Mona Lisa?',                      options: ['Michelangelo','Van Gogh','Picasso','Leonardo da Vinci'], correct: 3 },
];

export default function Quiz() {
  const topic     = seedData.topic || 'General Knowledge';
  const questions = (seedData.questions && seedData.questions.length) ? seedData.questions : DEFAULT_QUESTIONS;

  const [current,  setCurrent]  = useState(0);
  const [selected, setSelected] = useState(null);
  const [score,    setScore]    = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const answered = selected !== null;

  const pick = (i) => {
    if (answered) return;
    setSelected(i);
    if (i === q.correct) setScore(s => s + 1);
  };

  const next = () => {
    if (current + 1 >= questions.length) { setFinished(true); return; }
    setCurrent(c => c + 1);
    setSelected(null);
  };

  const reset = () => { setCurrent(0); setSelected(null); setScore(0); setFinished(false); };

  const pct = Math.round((score / questions.length) * 100);

  if (finished) return (
    <div className="h-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 text-white p-8">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${pct >= 70 ? 'bg-yellow-500/15 border-yellow-500/25' : 'bg-white/5 border-white/10'}`}>
        <Trophy size={28} className={pct >= 70 ? 'text-yellow-400' : 'text-white/30'} />
      </div>
      <div className="text-center">
        <p className="text-3xl font-light text-white">{score}<span className="text-white/30 text-lg">/{questions.length}</span></p>
        <p className="text-white/40 text-sm mt-1">{topic}</p>
        <p className={`text-sm mt-2 ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
        </p>
      </div>
      {/* Score bar */}
      <div className="w-full max-w-xs bg-white/5 rounded-full h-2">
        <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-white/6 border border-white/10 rounded-2xl text-sm text-white/60 hover:text-white transition-all">
        <RotateCcw size={13} /> Try again
      </button>
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col p-5 gap-5 overflow-hidden">

      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-2 text-xs text-white/25">
          <span>{topic}</span>
          <span>{current + 1} / {questions.length} · {score} pts</span>
        </div>
        <div className="w-full h-1 bg-white/6 rounded-full">
          <div className="h-full bg-white/30 rounded-full transition-all duration-300"
            style={{ width: `${((current + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col gap-4">

          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex-1 flex items-center">
            <p className="text-white/85 text-base font-light leading-relaxed text-center w-full">{q.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let style = 'bg-white/3 border-white/8 text-white/65 hover:bg-white/6 hover:text-white';
              if (answered) {
                if (i === q.correct) style = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
                else if (i === selected) style = 'bg-red-500/12 border-red-500/25 text-red-300';
                else style = 'bg-white/2 border-white/5 text-white/25';
              }
              return (
                <button key={i} onClick={() => pick(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-sm text-left transition-all ${style} ${!answered ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span className="w-5 h-5 rounded-lg border border-current/30 flex items-center justify-center text-[10px] shrink-0">
                    {answered && i === q.correct ? <Check size={11} /> : answered && i === selected ? <X size={11} /> : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <button onClick={next}
              className="w-full py-3 bg-white/6 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all">
              {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
