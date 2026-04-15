import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Search, X, Wind, Droplets, Eye, Gauge,
  Thermometer, Sun, Cloud, CloudRain, CloudSnow,
  CloudLightning, CloudDrizzle, CloudFog, Umbrella,
  Navigation,
} from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: weather]

const seedData = {{DATA_JSON}};

// ── WMO weather code helpers ──────────────────────────────────────────────────
function wmoMeta(code) {
  if (code === 0)  return { label: 'Clear Sky',     type: 'sun'     };
  if (code <= 2)   return { label: 'Partly Cloudy', type: 'pcloudy' };
  if (code === 3)  return { label: 'Overcast',      type: 'cloud'   };
  if (code <= 48)  return { label: 'Foggy',         type: 'fog'     };
  if (code <= 55)  return { label: 'Drizzle',       type: 'drizzle' };
  if (code <= 65)  return { label: code <= 63 ? 'Light Rain' : 'Heavy Rain', type: 'rain' };
  if (code <= 77)  return { label: 'Snowfall',      type: 'snow'    };
  if (code <= 82)  return { label: 'Rain Showers',  type: 'shower'  };
  if (code <= 86)  return { label: 'Snow Showers',  type: 'snow'    };
  if (code >= 95)  return { label: 'Thunderstorm',  type: 'thunder' };
  return                   { label: 'Cloudy',       type: 'cloud'   };
}

function WIcon({ type, size = 18, className = '' }) {
  const p = { size, className };
  if (type === 'sun')     return <Sun {...p} />;
  if (type === 'fog')     return <CloudFog {...p} />;
  if (type === 'drizzle') return <CloudDrizzle {...p} />;
  if (type === 'rain')    return <CloudRain {...p} />;
  if (type === 'shower')  return <CloudRain {...p} />;
  if (type === 'snow')    return <CloudSnow {...p} />;
  if (type === 'thunder') return <CloudLightning {...p} />;
  return <Cloud {...p} />;
}

function iconColor(type) {
  if (type === 'sun')    return 'text-amber-300';
  if (type === 'pcloudy')return 'text-sky-300';
  if (type === 'fog')    return 'text-slate-400';
  if (type === 'drizzle')return 'text-cyan-400';
  if (type === 'rain' || type === 'shower') return 'text-blue-400';
  if (type === 'snow')   return 'text-blue-200';
  if (type === 'thunder')return 'text-yellow-300';
  return 'text-slate-400';
}

function bgTheme(type) {
  if (type === 'sun')    return { from: '#0a1628', mid: '#0d1f3e', accent: 'rgba(251,191,36,0.18)', bar: '#f59e0b' };
  if (type === 'rain' || type === 'shower') return { from: '#060d1a', mid: '#0a1628', accent: 'rgba(56,189,248,0.14)', bar: '#38bdf8' };
  if (type === 'snow')   return { from: '#080f1f', mid: '#0e1c38', accent: 'rgba(186,230,253,0.14)', bar: '#bae6fd' };
  if (type === 'thunder')return { from: '#07030f', mid: '#0f0820', accent: 'rgba(234,179,8,0.18)',  bar: '#fbbf24' };
  if (type === 'fog')    return { from: '#0c1120', mid: '#111827', accent: 'rgba(148,163,184,0.1)',  bar: '#94a3b8' };
  return                        { from: '#080f1f', mid: '#0d1830', accent: 'rgba(96,165,250,0.12)',  bar: '#60a5fa' };
}

function fmtHour(isoStr) {
  const h = parseInt(isoStr.slice(11, 13), 10);
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtDay(isoDate, idx) {
  if (idx === 0) return 'Today';
  if (idx === 1) return 'Tomorrow';
  const d = new Date(isoDate + 'T12:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

// ── New helpers ───────────────────────────────────────────────────────────────
function degToCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function uvMeta(uv) {
  if (uv == null || isNaN(uv)) return { text: '—', color: '#6b7280', pct: 0 };
  const pct = Math.min((uv / 11) * 100, 100);
  if (uv <= 2)  return { text: 'Low',       color: '#22c55e', pct };
  if (uv <= 5)  return { text: 'Moderate',  color: '#eab308', pct };
  if (uv <= 7)  return { text: 'High',      color: '#f97316', pct };
  if (uv <= 10) return { text: 'Very High', color: '#ef4444', pct };
  return              { text: 'Extreme',   color: '#a855f7', pct };
}

function fmtTime12(isoStr) {
  if (!isoStr) return '—';
  try {
    const [, time] = isoStr.split('T');
    let [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return '—'; }
}

function cloudText(pct) {
  if (pct <= 10) return 'Clear sky';
  if (pct <= 30) return 'Mostly clear';
  if (pct <= 60) return 'Partly cloudy';
  if (pct <= 85) return 'Mostly cloudy';
  return 'Overcast';
}

function dayLength(sunrise, sunset) {
  if (!sunrise || !sunset) return null;
  const diff = new Date(sunset) - new Date(sunrise);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m daylight`;
}

// ── Sun arc visualization ─────────────────────────────────────────────────────
function SunArc({ sunrise, sunset }) {
  if (!sunrise || !sunset) return null;
  const now = new Date();
  const sr = new Date(sunrise);
  const ss = new Date(sunset);
  const total = ss - sr;
  const elapsed = now - sr;
  const pct = Math.max(0, Math.min(1, elapsed / total));
  const isDaytime = now >= sr && now <= ss;

  const W = 220, H = 80, cx = W / 2, cy = H + 4, r = 78;
  const angle = Math.PI * (1 - pct); // π → 0 (left to right)
  const sunX = cx + r * Math.cos(angle);
  const sunY = cy - r * Math.sin(angle);

  return (
    <div className="w-full flex justify-center my-1">
      <svg width="100%" viewBox={`0 0 ${W} ${H + 12}`} style={{ maxWidth: W, overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeDasharray="4 3"
        />
        {/* Progress */}
        {isDaytime && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
            fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5"
          />
        )}
        {/* Horizon */}
        <line x1={cx - r - 12} y1={cy} x2={cx + r + 12} y2={cy}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        {/* Sun */}
        {isDaytime ? (
          <>
            <circle cx={sunX} cy={sunY} r={10} fill="rgba(251,191,36,0.12)" />
            <circle cx={sunX} cy={sunY} r={5} fill="#fbbf24" />
          </>
        ) : (
          <circle cx={now < sr ? cx - r : cx + r} cy={cy} r={3.5} fill="rgba(251,191,36,0.25)" />
        )}
      </svg>
    </div>
  );
}

// ── API ───────────────────────────────────────────────────────────────────────
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WX_URL  = 'https://api.open-meteo.com/v1/forecast';
const WX_PARAMS = [
  'current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,dew_point_2m,precipitation,surface_pressure,visibility,cloud_cover,is_day',
  'hourly=temperature_2m,weather_code,precipitation_probability,precipitation',
  'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max',
  'wind_speed_unit=kmh&timezone=auto&forecast_days=7',
].join('&');

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeatherApp() {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [location,    setLocation]    = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [searchFocus, setSearchFocus] = useState(false);
  const debounce = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const city = (typeof seedData === 'object' && seedData?.city && !String(seedData.city).includes('{{'))
      ? seedData.city : null;
    if (city) autoLoad(city);
  }, []);

  async function autoLoad(cityName) {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      const d = await r.json();
      if (d.results?.length) selectLocation(d.results[0]);
      else { setError('City not found.'); setLoading(false); }
    } catch { setError('Could not load weather.'); setLoading(false); }
  }

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
        const d = await r.json();
        setSuggestions(d.results || []);
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 350);
  }, [query]);

  async function selectLocation(loc) {
    setLocation({ name: loc.name, lat: loc.latitude, lon: loc.longitude, country: loc.country, admin1: loc.admin1 });
    setSuggestions([]); setQuery(''); setSearchFocus(false);
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${WX_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}&${WX_PARAMS}`);
      const d = await r.json();
      setWeather(d);
    } catch { setError('Failed to load weather data.'); }
    setLoading(false);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const cur     = weather?.current;
  const curMeta = cur ? wmoMeta(cur.weather_code) : null;
  const theme   = curMeta ? bgTheme(curMeta.type) : bgTheme('cloud');

  const hourlySlice = (() => {
    if (!weather?.hourly || !cur) return [];
    const prefix = cur.time.slice(0, 13);
    let idx = weather.hourly.time.findIndex(t => t.slice(0, 13) === prefix);
    if (idx < 0) idx = 0;
    return Array.from({ length: 24 }, (_, i) => {
      const j = idx + i;
      return {
        time:   weather.hourly.time[j] ?? null,
        temp:   weather.hourly.temperature_2m[j],
        code:   weather.hourly.weather_code[j],
        rain:   weather.hourly.precipitation_probability[j],
        precip: weather.hourly.precipitation[j] ?? 0,
      };
    }).filter(h => h.time);
  })();

  const daily = weather?.daily ? Array.from({ length: 7 }, (_, i) => ({
    date:    weather.daily.time[i],
    code:    weather.daily.weather_code[i],
    max:     weather.daily.temperature_2m_max[i],
    min:     weather.daily.temperature_2m_min[i],
    rain:    weather.daily.precipitation_probability_max[i],
    wind:    weather.daily.wind_speed_10m_max[i],
    sunrise: weather.daily.sunrise?.[i],
    sunset:  weather.daily.sunset?.[i],
    uv:      weather.daily.uv_index_max?.[i],
  })) : [];

  const weekMin = daily.length ? Math.min(...daily.map(d => d.min)) : 0;
  const weekMax = daily.length ? Math.max(...daily.map(d => d.max)) : 40;
  const weekRange = weekMax - weekMin || 1;

  const maxPrecip = Math.max(...hourlySlice.map(h => h.precip), 0.1);
  const today     = daily[0];
  const uvInfo    = uvMeta(today?.uv);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col overflow-hidden text-white relative"
      style={{ background: `radial-gradient(ellipse at 60% 0%, ${theme.accent} 0%, transparent 55%), linear-gradient(180deg, ${theme.from} 0%, ${theme.mid} 100%)` }}
    >

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="relative z-20 px-4 pt-4 pb-2 shrink-0">
        <div className={`flex items-center gap-2.5 bg-white/[0.07] border rounded-2xl px-3.5 py-2.5 transition-all ${searchFocus ? 'border-white/20 bg-white/10' : 'border-white/[0.07]'}`}>
          <Search size={14} className="text-white/35 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setTimeout(() => { setSearchFocus(false); setSuggestions([]); }, 180)}
            placeholder="Search any city in the world…"
            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/22 outline-none"
          />
          {(query || searching) && (
            <button onClick={() => { setQuery(''); setSuggestions([]); }} className="text-white/20 hover:text-white/60 transition-colors">
              {searching
                ? <span className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin block" />
                : <X size={13} />}
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-[#0d1626]/95 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-30">
            {suggestions.map((s, i) => (
              <button key={s.id || i} onMouseDown={() => selectLocation(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-all text-left border-b border-white/[0.04] last:border-0">
                <MapPin size={13} className="text-white/25 shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm text-white/75">{s.name}</span>
                  {(s.admin1 || s.country) && (
                    <span className="text-[11px] text-white/28 ml-1.5">{[s.admin1, s.country].filter(Boolean).join(', ')}</span>
                  )}
                </div>
                <span className="ml-auto text-[9px] text-white/18 uppercase tracking-wider shrink-0">{s.country_code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && !weather && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-10">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Cloud size={28} className="text-white/20" />
          </div>
          <p className="text-white/28 text-sm text-center leading-relaxed">
            Search for any city to see live weather,<br />forecasts, UV, sunrise & more
          </p>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-44 rounded-3xl bg-white/[0.04] border border-white/[0.05]" />
            <div className="h-44 rounded-3xl bg-white/[0.04] border border-white/[0.05]" />
          </div>
          <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
            <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
          </div>
          <div className="h-52 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
          <div className="h-36 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400/60 text-sm">{error}</p>
        </div>
      )}

      {/* ══ Main content ════════════════════════════════════════════════════════ */}
      {!loading && weather && cur && (
        <div className="flex-1 overflow-y-auto px-4 pb-5 morph-scrollbar">
          <div className="space-y-3 max-w-3xl mx-auto">

            {/* ── Row 1: Hero + Sunrise/Sunset ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

              {/* Hero */}
              <div className="relative overflow-hidden bg-white/[0.05] border border-white/[0.07] rounded-3xl p-5">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -mr-16 -mt-16 opacity-40" style={{ background: theme.accent }} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin size={11} className="text-white/35 shrink-0" />
                        <span className="text-[11px] text-white/40 tracking-wide truncate">
                          {location?.name}{location?.admin1 ? `, ${location.admin1}` : ''}{location?.country ? ` · ${location.country}` : ''}
                        </span>
                      </div>
                      <div className="flex items-end gap-1.5 leading-none">
                        <span className="text-6xl font-extralight tracking-[-0.04em] tabular-nums">
                          {Math.round(cur.temperature_2m)}
                        </span>
                        <span className="text-2xl text-white/35 font-extralight mb-2">°C</span>
                      </div>
                      <p className="text-white/55 text-sm mt-1 font-light">{curMeta.label}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                        <span className="text-xs text-white/32">Feels {Math.round(cur.apparent_temperature)}°</span>
                        <span className="text-xs text-white/32">H:{Math.round(today?.max ?? cur.temperature_2m)}° L:{Math.round(today?.min ?? cur.temperature_2m)}°</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/[0.04] rounded-2xl border border-white/[0.07] shrink-0">
                      <WIcon type={curMeta.type} size={42} className={iconColor(curMeta.type)} />
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/[0.05]">
                    {[
                      { Icon: Wind,     val: `${Math.round(cur.wind_speed_10m)} km/h`, label: 'Wind'     },
                      { Icon: Droplets, val: `${cur.relative_humidity_2m}%`,           label: 'Humidity' },
                      { Icon: Umbrella, val: `${hourlySlice[0]?.rain ?? 0}%`,          label: 'Rain now' },
                    ].map(({ Icon, val, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1 py-1">
                        <Icon size={12} className="text-white/28" />
                        <span className="text-[9px] text-white/25 uppercase tracking-widest text-center">{label}</span>
                        <span className="text-xs font-light">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sunrise / Sunset */}
              {today && (
                <div className="bg-white/[0.035] border border-white/[0.055] rounded-3xl p-4 flex flex-col justify-between">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mb-1">Sun & Daylight</p>

                  <SunArc sunrise={today.sunrise} sunset={today.sunset} />

                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <Sun size={13} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">Sunrise</p>
                        <p className="text-sm font-light text-white/80">{fmtTime12(today.sunrise)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">Sunset</p>
                        <p className="text-sm font-light text-white/80">{fmtTime12(today.sunset)}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                        <Sun size={13} className="text-orange-400" />
                      </div>
                    </div>
                  </div>

                  {dayLength(today.sunrise, today.sunset) && (
                    <p className="text-center text-[10px] text-white/28 mt-2 pt-2 border-t border-white/[0.05]">
                      {dayLength(today.sunrise, today.sunset)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Hourly forecast ── */}
            <div className="bg-white/[0.035] border border-white/[0.055] rounded-3xl overflow-hidden">
              <div className="px-4 pt-3.5 pb-0.5">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">Hourly Forecast · 24h</p>
              </div>
              <div className="overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                <div className="flex min-w-max px-3 gap-0.5">
                  {hourlySlice.map((h, i) => {
                    const meta  = wmoMeta(h.code);
                    const isNow = i === 0;
                    const barH  = h.precip > 0 ? Math.max(4, Math.round((h.precip / maxPrecip) * 28)) : 0;
                    return (
                      <div key={i} className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl min-w-[52px] transition-all ${isNow ? 'bg-white/[0.06] border border-white/[0.09]' : ''}`}>
                        <span className="text-[10px] text-white/35 whitespace-nowrap">{isNow ? 'Now' : fmtHour(h.time)}</span>
                        <WIcon type={meta.type} size={13} className={iconColor(meta.type)} />
                        <span className="text-sm font-light tabular-nums">{Math.round(h.temp)}°</span>
                        <span className={`text-[9px] ${h.rain > 0 ? 'text-sky-400/70' : 'text-transparent'} tabular-nums`}>{h.rain}%</span>
                        {/* Precipitation bar */}
                        <div className="flex items-end justify-center w-full" style={{ height: 32 }}>
                          {barH > 0 ? (
                            <div
                              className="w-4 rounded-t-sm"
                              style={{ height: barH, background: `rgba(56,189,248,${0.25 + (h.precip / maxPrecip) * 0.55})` }}
                            />
                          ) : (
                            <div className="w-4 h-px bg-white/[0.04] rounded" />
                          )}
                        </div>
                        {h.precip > 0 ? (
                          <span className="text-[8px] text-sky-400/50 tabular-nums">{h.precip.toFixed(1)}<span className="text-[7px]">mm</span></span>
                        ) : (
                          <span className="text-[8px] text-transparent">0</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── UV Index + Cloud Cover ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* UV Index */}
              <div className="bg-white/[0.035] border border-white/[0.055] rounded-3xl p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mb-3">UV Index</p>
                <div className="flex items-end gap-2 mb-2.5">
                  <span className="text-3xl font-extralight tabular-nums" style={{ color: uvInfo.color }}>
                    {today?.uv != null ? Math.round(today.uv) : '—'}
                  </span>
                  <span className="text-xs font-light mb-1" style={{ color: uvInfo.color }}>{uvInfo.text}</span>
                </div>
                {/* Gradient bar */}
                <div className="w-full h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${uvInfo.pct}%`,
                      background: 'linear-gradient(90deg, #22c55e 0%, #eab308 35%, #f97316 60%, #ef4444 80%, #a855f7 100%)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-white/20">
                  <span>Low</span><span>High</span><span>Extreme</span>
                </div>
              </div>

              {/* Cloud Cover */}
              <div className="bg-white/[0.035] border border-white/[0.055] rounded-3xl p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mb-3">Cloud Cover</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-extralight tabular-nums">{cur.cloud_cover}%</span>
                </div>
                <p className="text-xs text-white/35 mb-2.5">{cloudText(cur.cloud_cover)}</p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full bg-sky-400/40 transition-all duration-1000"
                    style={{ width: `${cur.cloud_cover}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── 7-Day Forecast ── */}
            <div className="bg-white/[0.035] border border-white/[0.055] rounded-3xl p-4">
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mb-3">7-Day Forecast</p>
              <div className="space-y-0.5">
                {daily.map((d, i) => {
                  const meta = wmoMeta(d.code);
                  const barL = ((d.min - weekMin) / weekRange) * 100;
                  const barW = ((d.max - d.min) / weekRange) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 py-2 border-b border-white/[0.03] last:border-0">
                      <span className="text-xs text-white/50 w-14 sm:w-16 shrink-0">{fmtDay(d.date, i)}</span>
                      <WIcon type={meta.type} size={14} className={`${iconColor(meta.type)} shrink-0`} />
                      <span className={`text-[10px] w-8 shrink-0 ${d.rain > 0 ? 'text-sky-400/60' : 'text-transparent'}`}>
                        {d.rain}%
                      </span>
                      <span className="text-[11px] text-white/30 w-7 sm:w-8 text-right shrink-0">{Math.round(d.min)}°</span>
                      <div className="flex-1 relative h-1.5 bg-white/[0.07] rounded-full overflow-hidden mx-1">
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            left: `${barL}%`,
                            width: `${Math.max(barW, 5)}%`,
                            background: `linear-gradient(90deg, ${theme.bar}66, ${theme.bar})`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-white/65 w-7 sm:w-8 shrink-0">{Math.round(d.max)}°</span>
                      {/* UV badge on wider screens */}
                      {d.uv != null && (
                        <span className="hidden sm:block text-[9px] w-8 text-center shrink-0 rounded-full px-1.5 py-0.5"
                          style={{ color: uvMeta(d.uv).color, background: `${uvMeta(d.uv).color}18` }}>
                          UV{Math.round(d.uv)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Details Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                {
                  key: 'wind_speed',
                  Icon: Wind,
                  label: 'Wind Speed',
                  val: `${Math.round(cur.wind_speed_10m)} km/h`,
                  sub: `Max today: ${today ? Math.round(today.wind) : '—'} km/h`,
                },
                {
                  key: 'wind_dir',
                  Icon: Navigation,
                  label: 'Wind Direction',
                  val: degToCardinal(cur.wind_direction_10m),
                  sub: `${Math.round(cur.wind_direction_10m)}° from north`,
                  rotate: cur.wind_direction_10m,
                },
                {
                  key: 'humidity',
                  Icon: Droplets,
                  label: 'Humidity',
                  val: `${cur.relative_humidity_2m}%`,
                  sub: cur.relative_humidity_2m > 70 ? 'High — feels muggy'
                    : cur.relative_humidity_2m < 30 ? 'Low — feels dry'
                    : 'Comfortable',
                },
                {
                  key: 'dew',
                  Icon: Thermometer,
                  label: 'Dew Point',
                  val: `${Math.round(cur.dew_point_2m)}°C`,
                  sub: cur.dew_point_2m > 18 ? 'Humid and sticky'
                    : cur.dew_point_2m > 10 ? 'Comfortable'
                    : 'Dry air',
                },
                {
                  key: 'visibility',
                  Icon: Eye,
                  label: 'Visibility',
                  val: cur.visibility >= 1000
                    ? `${(cur.visibility / 1000).toFixed(0)} km`
                    : `${cur.visibility} m`,
                  sub: cur.visibility >= 10000 ? 'Excellent'
                    : cur.visibility >= 5000 ? 'Good'
                    : 'Reduced visibility',
                },
                {
                  key: 'pressure',
                  Icon: Gauge,
                  label: 'Pressure',
                  val: `${Math.round(cur.surface_pressure)} hPa`,
                  sub: cur.surface_pressure > 1013 ? 'High — fair weather'
                    : 'Low — unsettled',
                },
                {
                  key: 'feels',
                  Icon: Thermometer,
                  label: 'Feels Like',
                  val: `${Math.round(cur.apparent_temperature)}°C`,
                  sub: `Actual: ${Math.round(cur.temperature_2m)}°C`,
                },
                {
                  key: 'precip',
                  Icon: Umbrella,
                  label: 'Precipitation',
                  val: `${cur.precipitation} mm`,
                  sub: `Chance now: ${hourlySlice[0]?.rain ?? 0}%`,
                },
              ].map(({ key, Icon, label, val, sub, rotate }) => (
                <div key={key} className="bg-white/[0.035] border border-white/[0.05] rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="shrink-0"
                      style={rotate != null ? { transform: `rotate(${rotate}deg)` } : undefined}
                    >
                      <Icon size={13} className="text-white/28" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-white/28 leading-tight">{label}</span>
                  </div>
                  <p className="text-xl font-extralight tracking-tight">{val}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <p className="text-center text-[9px] text-white/12 pb-1">
              Live · open-meteo.com · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
