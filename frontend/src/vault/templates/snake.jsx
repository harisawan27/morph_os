import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Gamepad2, RotateCcw, Trophy, Zap } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: snake]
const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_FOOD = { x: 5, y: 5 };
const BASE_SPEED = 140;
const SPEED_STEP = 8; // ms faster per level

function randomFood(snake) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeArtifact() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(INITIAL_FOOD);
  const [direction, setDirection] = useState('UP');
  const dirRef = useRef('UP');
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = (typeof useCloudStorage !== 'undefined') ? useCloudStorage('morph_snake_hs_v2', 0) : useState(0);
  const [level, setLevel] = useState(1);
  const [flash, setFlash] = useState(false);
  const touchStart = useRef(null);

  const speed = Math.max(60, BASE_SPEED - (level - 1) * SPEED_STEP);

  const moveSnake = useCallback(() => {
    if (gameOver || !started) return;
    const dir = dirRef.current;

    setSnake((prev) => {
      const newSnake = [...prev];
      const head = { ...newSnake[0] };

      switch (dir) {
        case 'UP':    head.y -= 1; break;
        case 'DOWN':  head.y += 1; break;
        case 'LEFT':  head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      if (
        head.x < 0 || head.x >= GRID_SIZE ||
        head.y < 0 || head.y >= GRID_SIZE ||
        newSnake.some((s, i) => i !== 0 && s.x === head.x && s.y === head.y)
      ) {
        setGameOver(true);
        return prev;
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(s => {
          const next = s + 10;
          const newLevel = Math.floor(next / 50) + 1;
          setLevel(newLevel);
          return next;
        });
        setFood(randomFood(newSnake));
        setFlash(true);
        setTimeout(() => setFlash(false), 120);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameOver, started, food]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':    if (dirRef.current !== 'DOWN')  { dirRef.current = 'UP';    setDirection('UP'); }    break;
        case 'ArrowDown':  if (dirRef.current !== 'UP')    { dirRef.current = 'DOWN';  setDirection('DOWN'); }  break;
        case 'ArrowLeft':  if (dirRef.current !== 'RIGHT') { dirRef.current = 'LEFT';  setDirection('LEFT'); }  break;
        case 'ArrowRight': if (dirRef.current !== 'LEFT')  { dirRef.current = 'RIGHT'; setDirection('RIGHT'); } break;
        case ' ': if (!started && !gameOver) setStarted(true); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, gameOver]);

  // Touch swipe controls
  const handleTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dirRef.current !== 'LEFT')  { dirRef.current = 'RIGHT'; setDirection('RIGHT'); }
      else if (dx < 0 && dirRef.current !== 'RIGHT') { dirRef.current = 'LEFT'; setDirection('LEFT'); }
    } else {
      if (dy > 0 && dirRef.current !== 'UP')   { dirRef.current = 'DOWN'; setDirection('DOWN'); }
      else if (dy < 0 && dirRef.current !== 'DOWN') { dirRef.current = 'UP'; setDirection('UP'); }
    }
    if (!started && !gameOver) setStarted(true);
    touchStart.current = null;
  };

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [moveSnake, speed, started, gameOver]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(INITIAL_FOOD);
    setDirection('UP');
    dirRef.current = 'UP';
    setGameOver(false);
    setStarted(false);
    setScore(0);
    setLevel(1);
  };

  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  const headKey = `${snake[0].x},${snake[0].y}`;

  return (
    <div
      className="flex flex-col h-full bg-[#050505] text-white p-4 justify-center items-center overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">

        {/* Header */}
        <div className="flex justify-between items-center w-full bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Gamepad2 className="text-green-400" size={22} />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-white/30 tracking-widest">Arcade Engine</span>
              <span className="text-sm font-bold tracking-tight">Snake OS</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400/60" />
              <span className="text-[9px] uppercase text-white/30">Lv</span>
              <span className="text-sm font-mono text-yellow-400">{level}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase text-white/20">Score</span>
              <span className="text-base font-mono leading-none text-blue-400">{score}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase text-white/20">Best</span>
              <span className="text-base font-mono leading-none text-yellow-500">{highScore}</span>
            </div>
          </div>
        </div>

        {/* Board */}
        <div
          className={`relative p-1 border rounded-2xl shadow-2xl overflow-hidden aspect-square w-full transition-colors duration-100 ${
            flash ? 'border-green-400/50 bg-green-500/5' : 'border-white/10 bg-white/3'
          }`}
          style={{ maxWidth: 360 }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const key = `${x},${y}`;
              const isHead = key === headKey;
              const isBody = !isHead && snakeSet.has(key);
              const isFood = food.x === x && food.y === y;

              return (
                <div
                  key={i}
                  className={
                    isHead
                      ? 'bg-green-400 rounded-sm z-10 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                      : isBody
                      ? 'bg-green-600/50 rounded-[1px] scale-[0.88]'
                      : isFood
                      ? 'bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                      : 'border-[0.5px] border-white/2'
                  }
                />
              );
            })}
          </div>

          {/* Start overlay */}
          {!started && !gameOver && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
              <Gamepad2 size={40} className="text-white/30 mb-4" />
              <p className="text-lg font-extralight tracking-widest opacity-60">Press Space or Swipe</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 mt-2">To Begin</p>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300 rounded-2xl">
              <Trophy size={44} className="text-white/20 mb-3" />
              <h2 className="text-3xl font-extralight tracking-tighter mb-1">CRASHED</h2>
              <p className="text-white/30 text-xs mb-1">Score: {score} • Level: {level}</p>
              {score === highScore && score > 0 && (
                <p className="text-yellow-400/70 text-[10px] uppercase tracking-widest mb-6">New High Score</p>
              )}
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-all shadow-xl text-sm mt-4"
              >
                <RotateCcw size={16} /> Re-Morph
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 w-full opacity-25">
          <div className="flex-1 text-center py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] uppercase tracking-widest">
            Arrows / Swipe
          </div>
          <div className="flex-1 text-center py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] uppercase tracking-widest">
            +10pts / food • Lv up at 50
          </div>
        </div>
      </div>
    </div>
  );
}
