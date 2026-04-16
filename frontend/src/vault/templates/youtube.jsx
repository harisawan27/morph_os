import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2, Music2 } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: youtube]

const API = typeof MORPH_API_URL !== 'undefined' ? MORPH_API_URL : '';

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MorphPlayer() {
  const seedTitle = "{{TITLE}}";

  // Search
  const [videoId,    setVideoId]    = useState('');
  const [trackTitle, setTrackTitle] = useState(seedTitle);
  const [searchDone, setSearchDone] = useState(false);
  const [searchErr,  setSearchErr]  = useState(false);

  // Player
  const [playing,     setPlaying]     = useState(false);
  const [ready,       setReady]       = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(80);
  const [muted,       setMuted]       = useState(false);

  // Progress drag state
  const [dragging,    setDragging]    = useState(false);
  const [dragPct,     setDragPct]     = useState(0);

  const ytRef        = useRef(null);
  const divRef       = useRef(null);
  const tickRef      = useRef(null);
  const containerRef = useRef(null);
  const progressRef  = useRef(null);

  // ── Step 1: search YouTube for real video ID ──────────────────────────────
  useEffect(() => {
    const q = seedTitle.trim();
    if (!q) { setSearchErr(true); return; }

    fetch(`${API}/api/youtube/search?q=${encodeURIComponent(q)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setVideoId(d.videoId); setTrackTitle(d.title); setSearchDone(true); })
      .catch(() => setSearchErr(true));
  }, []);

  // ── Step 2: init YT IFrame API once we have an ID ────────────────────────
  useEffect(() => {
    if (!searchDone || !videoId || !divRef.current) return;

    const build = () => {
      if (!divRef.current) return;
      ytRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: {
          controls:       0,
          modestbranding: 1,
          rel:            0,
          showinfo:       0,
          iv_load_policy: 3,
          disablekb:      1,
          playsinline:    1,
          fs:             0,
          cc_load_policy: 0,
          autohide:       1,
        },
        events: {
          onReady: e => {
            // Kill all pointer events on the actual iframe element —
            // this is the definitive fix; the div style alone doesn't
            // carry over because YT API replaces the div with an iframe.
            const iframe = e.target.getIframe();
            if (iframe) {
              iframe.style.pointerEvents = 'none';
              iframe.style.userSelect    = 'none';
            }
            e.target.setVolume(volume);
            e.target.playVideo();
            setDuration(e.target.getDuration());
            setReady(true);
          },
          onStateChange: e => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              setPlaying(true);
              setDuration(e.target.getDuration());
            } else if (e.data === S.PAUSED || e.data === S.ENDED) {
              setPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      build();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); build(); };
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }

    return () => {
      clearInterval(tickRef.current);
      try { ytRef.current?.destroy(); } catch {}
      ytRef.current = null;
    };
  }, [searchDone, videoId]);

  // ── Poll current time (paused while dragging) ─────────────────────────────
  useEffect(() => {
    clearInterval(tickRef.current);
    if (playing && !dragging) {
      tickRef.current = setInterval(() => {
        const t = ytRef.current?.getCurrentTime?.();
        if (t !== undefined) setCurrentTime(t);
      }, 250);
    }
    return () => clearInterval(tickRef.current);
  }, [playing, dragging]);

  // ── Progress bar drag — attach to document so fast moves don't break ──────
  useEffect(() => {
    if (!dragging) return;

    const getPct = (clientX) => {
      if (!progressRef.current) return 0;
      const r = progressRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    };

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const p = getPct(clientX);
      setDragPct(p);
      setCurrentTime(p * duration); // optimistic display
    };

    const onUp = (e) => {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const p = getPct(clientX);
      if (ytRef.current && duration) {
        ytRef.current.seekTo(p * duration, true);
        setCurrentTime(p * duration);
      }
      setDragging(false);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend',  onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
    };
  }, [dragging, duration]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!ytRef.current || !ready) return;
    playing ? ytRef.current.pauseVideo() : ytRef.current.playVideo();
  }, [playing, ready]);

  const onProgressMouseDown = useCallback((e) => {
    if (!duration) return;
    e.preventDefault();
    const r = progressRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setDragPct(p);
    setCurrentTime(p * duration);
    setDragging(true);
  }, [duration]);

  const onVolumeChange = useCallback(val => {
    setVolume(val);
    setMuted(val === 0);
    ytRef.current?.setVolume(val);
  }, []);

  const toggleMute = useCallback(() => {
    if (!ytRef.current) return;
    if (muted) { ytRef.current.unMute(); ytRef.current.setVolume(volume || 80); setMuted(false); }
    else        { ytRef.current.mute();                                           setMuted(true); }
  }, [muted, volume]);

  const toggleFS = useCallback(() => {
    if (!containerRef.current) return;
    document.fullscreenElement
      ? document.exitFullscreen()
      : containerRef.current.requestFullscreen?.();
  }, []);

  const displayPct = duration ? (currentTime / duration) * 100 : 0;
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  // ── Loading / error screens ───────────────────────────────────────────────
  if (searchErr) return (
    <div className="h-full flex flex-col items-center justify-center bg-black gap-4">
      <Music2 size={32} className="text-white/20" />
      <p className="text-white/30 text-sm">Could not find &ldquo;{seedTitle}&rdquo;</p>
    </div>
  );

  if (!searchDone) return (
    <div className="h-full flex flex-col items-center justify-center bg-black gap-4">
      <Loader2 size={28} className="text-white/30 animate-spin" />
      <p className="text-white/25 text-sm">Finding &ldquo;{seedTitle}&rdquo;...</p>
    </div>
  );

  // ── Main player ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative h-full bg-black flex flex-col overflow-hidden select-none">

      {/* Blurred album-art background */}
      {thumb && (
        <>
          <div className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-25"
               style={{ backgroundImage: `url(${thumb})` }} />
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/20 to-black/90" />
        </>
      )}

      {/* ── YouTube iframe + interaction shield ── */}
      <div className="relative flex-1 flex items-center justify-center p-6 pb-2">
        <div className="yt-shield relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/8">

          {/* iframe mount — pointer-events killed via CSS (.yt-shield iframe) + JS (onReady) */}
          <div
            ref={divRef}
            className="w-full h-full"
          />

          {/* Full interaction shield — sits above the iframe, captures ALL clicks */}
          <div
            className="absolute inset-0 cursor-pointer z-10"
            onClick={togglePlay}
          >
            {/* Loading spinner before player is ready */}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <Loader2 size={36} className="text-white/40 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Track title ── */}
      <div className="relative px-8 py-3 text-center">
        <p className="text-white font-light text-base truncate">{trackTitle}</p>
        <p className="text-white/20 text-[10px] uppercase tracking-widest mt-0.5">Morph Media</p>
      </div>

      {/* ── Control bar ── */}
      <div className="relative px-6 pb-6 space-y-3">

        {/* ── Draggable progress bar ── */}
        <div className="space-y-1">
          <div
            ref={progressRef}
            className="w-full h-3 flex items-center cursor-pointer group"
            onMouseDown={onProgressMouseDown}
            onTouchStart={onProgressMouseDown}
          >
            <div className="relative w-full h-1 bg-white/10 rounded-full">
              {/* Filled portion */}
              <div
                className="absolute left-0 top-0 h-full bg-white/80 rounded-full"
                style={{ width: `${displayPct}%` }}
              />
              {/* Drag thumb — always visible while dragging, hover otherwise */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-opacity"
                style={{
                  left: `${displayPct}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: dragging ? 1 : undefined,
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-white/20 select-none">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* ── Buttons row ── */}
        <div className="flex items-center">

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1">
            <button onClick={toggleMute}
              className="text-white/40 hover:text-white transition-colors p-1">
              {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <input
              type="range" min={0} max={100} value={muted ? 0 : volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="w-20 h-px accent-white cursor-pointer"
            />
          </div>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-transform mx-6"
          >
            {playing
              ? <Pause size={20} fill="black" />
              : <Play  size={20} fill="black" className="ml-0.5" />}
          </button>

          {/* Fullscreen */}
          <div className="flex-1 flex justify-end">
            <button onClick={toggleFS}
              className="text-white/40 hover:text-white transition-colors p-1">
              <Maximize2 size={17} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
