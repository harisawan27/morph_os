import React, { useState, useEffect, useRef, useMemo } from 'react';

// [MORZ_VAULT_TEMPLATE: clock]

const ALL_CITIES = [
  // Americas
  { city: 'New York',       country: 'US', tz: 'America/New_York' },
  { city: 'Los Angeles',    country: 'US', tz: 'America/Los_Angeles' },
  { city: 'Chicago',        country: 'US', tz: 'America/Chicago' },
  { city: 'Denver',         country: 'US', tz: 'America/Denver' },
  { city: 'Phoenix',        country: 'US', tz: 'America/Phoenix' },
  { city: 'Seattle',        country: 'US', tz: 'America/Los_Angeles' },
  { city: 'Miami',          country: 'US', tz: 'America/New_York' },
  { city: 'Dallas',         country: 'US', tz: 'America/Chicago' },
  { city: 'Honolulu',       country: 'US', tz: 'Pacific/Honolulu' },
  { city: 'Anchorage',      country: 'US', tz: 'America/Anchorage' },
  { city: 'Toronto',        country: 'CA', tz: 'America/Toronto' },
  { city: 'Vancouver',      country: 'CA', tz: 'America/Vancouver' },
  { city: 'Montreal',       country: 'CA', tz: 'America/Montreal' },
  { city: 'Mexico City',    country: 'MX', tz: 'America/Mexico_City' },
  { city: 'São Paulo',      country: 'BR', tz: 'America/Sao_Paulo' },
  { city: 'Rio de Janeiro', country: 'BR', tz: 'America/Sao_Paulo' },
  { city: 'Buenos Aires',   country: 'AR', tz: 'America/Argentina/Buenos_Aires' },
  { city: 'Lima',           country: 'PE', tz: 'America/Lima' },
  { city: 'Bogotá',         country: 'CO', tz: 'America/Bogota' },
  { city: 'Santiago',       country: 'CL', tz: 'America/Santiago' },
  { city: 'Caracas',        country: 'VE', tz: 'America/Caracas' },
  { city: 'Havana',         country: 'CU', tz: 'America/Havana' },
  // Europe
  { city: 'London',         country: 'GB', tz: 'Europe/London' },
  { city: 'Paris',          country: 'FR', tz: 'Europe/Paris' },
  { city: 'Berlin',         country: 'DE', tz: 'Europe/Berlin' },
  { city: 'Madrid',         country: 'ES', tz: 'Europe/Madrid' },
  { city: 'Rome',           country: 'IT', tz: 'Europe/Rome' },
  { city: 'Amsterdam',      country: 'NL', tz: 'Europe/Amsterdam' },
  { city: 'Zurich',         country: 'CH', tz: 'Europe/Zurich' },
  { city: 'Vienna',         country: 'AT', tz: 'Europe/Vienna' },
  { city: 'Brussels',       country: 'BE', tz: 'Europe/Brussels' },
  { city: 'Stockholm',      country: 'SE', tz: 'Europe/Stockholm' },
  { city: 'Oslo',           country: 'NO', tz: 'Europe/Oslo' },
  { city: 'Copenhagen',     country: 'DK', tz: 'Europe/Copenhagen' },
  { city: 'Helsinki',       country: 'FI', tz: 'Europe/Helsinki' },
  { city: 'Lisbon',         country: 'PT', tz: 'Europe/Lisbon' },
  { city: 'Athens',         country: 'GR', tz: 'Europe/Athens' },
  { city: 'Warsaw',         country: 'PL', tz: 'Europe/Warsaw' },
  { city: 'Prague',         country: 'CZ', tz: 'Europe/Prague' },
  { city: 'Budapest',       country: 'HU', tz: 'Europe/Budapest' },
  { city: 'Bucharest',      country: 'RO', tz: 'Europe/Bucharest' },
  { city: 'Moscow',         country: 'RU', tz: 'Europe/Moscow' },
  { city: 'Istanbul',       country: 'TR', tz: 'Europe/Istanbul' },
  { city: 'Kyiv',           country: 'UA', tz: 'Europe/Kiev' },
  { city: 'Dublin',         country: 'IE', tz: 'Europe/Dublin' },
  { city: 'Reykjavik',      country: 'IS', tz: 'Atlantic/Reykjavik' },
  // Middle East
  { city: 'Dubai',          country: 'AE', tz: 'Asia/Dubai' },
  { city: 'Abu Dhabi',      country: 'AE', tz: 'Asia/Dubai' },
  { city: 'Riyadh',         country: 'SA', tz: 'Asia/Riyadh' },
  { city: 'Tehran',         country: 'IR', tz: 'Asia/Tehran' },
  { city: 'Doha',           country: 'QA', tz: 'Asia/Qatar' },
  { city: 'Kuwait City',    country: 'KW', tz: 'Asia/Kuwait' },
  { city: 'Beirut',         country: 'LB', tz: 'Asia/Beirut' },
  { city: 'Tel Aviv',       country: 'IL', tz: 'Asia/Jerusalem' },
  { city: 'Baghdad',        country: 'IQ', tz: 'Asia/Baghdad' },
  { city: 'Muscat',         country: 'OM', tz: 'Asia/Muscat' },
  { city: 'Baku',           country: 'AZ', tz: 'Asia/Baku' },
  { city: 'Tbilisi',        country: 'GE', tz: 'Asia/Tbilisi' },
  { city: 'Yerevan',        country: 'AM', tz: 'Asia/Yerevan' },
  // South & Central Asia
  { city: 'Karachi',        country: 'PK', tz: 'Asia/Karachi' },
  { city: 'Islamabad',      country: 'PK', tz: 'Asia/Karachi' },
  { city: 'Mumbai',         country: 'IN', tz: 'Asia/Kolkata' },
  { city: 'Delhi',          country: 'IN', tz: 'Asia/Kolkata' },
  { city: 'Bangalore',      country: 'IN', tz: 'Asia/Kolkata' },
  { city: 'Kolkata',        country: 'IN', tz: 'Asia/Kolkata' },
  { city: 'Colombo',        country: 'LK', tz: 'Asia/Colombo' },
  { city: 'Dhaka',          country: 'BD', tz: 'Asia/Dhaka' },
  { city: 'Kathmandu',      country: 'NP', tz: 'Asia/Kathmandu' },
  { city: 'Tashkent',       country: 'UZ', tz: 'Asia/Tashkent' },
  { city: 'Almaty',         country: 'KZ', tz: 'Asia/Almaty' },
  { city: 'Kabul',          country: 'AF', tz: 'Asia/Kabul' },
  { city: 'Lahore',         country: 'PK', tz: 'Asia/Karachi' },
  // East & Southeast Asia
  { city: 'Tokyo',          country: 'JP', tz: 'Asia/Tokyo' },
  { city: 'Seoul',          country: 'KR', tz: 'Asia/Seoul' },
  { city: 'Beijing',        country: 'CN', tz: 'Asia/Shanghai' },
  { city: 'Shanghai',       country: 'CN', tz: 'Asia/Shanghai' },
  { city: 'Chongqing',      country: 'CN', tz: 'Asia/Shanghai' },
  { city: 'Hong Kong',      country: 'HK', tz: 'Asia/Hong_Kong' },
  { city: 'Taipei',         country: 'TW', tz: 'Asia/Taipei' },
  { city: 'Singapore',      country: 'SG', tz: 'Asia/Singapore' },
  { city: 'Kuala Lumpur',   country: 'MY', tz: 'Asia/Kuala_Lumpur' },
  { city: 'Bangkok',        country: 'TH', tz: 'Asia/Bangkok' },
  { city: 'Ho Chi Minh',    country: 'VN', tz: 'Asia/Ho_Chi_Minh' },
  { city: 'Hanoi',          country: 'VN', tz: 'Asia/Bangkok' },
  { city: 'Manila',         country: 'PH', tz: 'Asia/Manila' },
  { city: 'Jakarta',        country: 'ID', tz: 'Asia/Jakarta' },
  { city: 'Yangon',         country: 'MM', tz: 'Asia/Rangoon' },
  { city: 'Phnom Penh',     country: 'KH', tz: 'Asia/Phnom_Penh' },
  { city: 'Ulaanbaatar',    country: 'MN', tz: 'Asia/Ulaanbaatar' },
  // Africa
  { city: 'Cairo',          country: 'EG', tz: 'Africa/Cairo' },
  { city: 'Lagos',          country: 'NG', tz: 'Africa/Lagos' },
  { city: 'Nairobi',        country: 'KE', tz: 'Africa/Nairobi' },
  { city: 'Johannesburg',   country: 'ZA', tz: 'Africa/Johannesburg' },
  { city: 'Cape Town',      country: 'ZA', tz: 'Africa/Johannesburg' },
  { city: 'Casablanca',     country: 'MA', tz: 'Africa/Casablanca' },
  { city: 'Addis Ababa',    country: 'ET', tz: 'Africa/Addis_Ababa' },
  { city: 'Accra',          country: 'GH', tz: 'Africa/Accra' },
  { city: 'Khartoum',       country: 'SD', tz: 'Africa/Khartoum' },
  { city: 'Dar es Salaam',  country: 'TZ', tz: 'Africa/Dar_es_Salaam' },
  { city: 'Tunis',          country: 'TN', tz: 'Africa/Tunis' },
  { city: 'Kinshasa',       country: 'CD', tz: 'Africa/Kinshasa' },
  { city: 'Algiers',        country: 'DZ', tz: 'Africa/Algiers' },
  // Oceania
  { city: 'Sydney',         country: 'AU', tz: 'Australia/Sydney' },
  { city: 'Melbourne',      country: 'AU', tz: 'Australia/Melbourne' },
  { city: 'Brisbane',       country: 'AU', tz: 'Australia/Brisbane' },
  { city: 'Perth',          country: 'AU', tz: 'Australia/Perth' },
  { city: 'Adelaide',       country: 'AU', tz: 'Australia/Adelaide' },
  { city: 'Auckland',       country: 'NZ', tz: 'Pacific/Auckland' },
  { city: 'Fiji',           country: 'FJ', tz: 'Pacific/Fiji' },
];

const LOCAL = { city: 'Local', country: '', tz: null };

const DEFAULT_PANEL = [
  LOCAL,
  ALL_CITIES.find(c => c.city === 'New York'),
  ALL_CITIES.find(c => c.city === 'London'),
  ALL_CITIES.find(c => c.city === 'Tokyo'),
  ALL_CITIES.find(c => c.city === 'Sydney'),
];

const PANEL_KEY = 'morph_clock_panel_v1';
function loadPanel() {
  try { const d = localStorage.getItem(PANEL_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}

function nowInZone(tz) {
  if (!tz) return new Date();
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

function getOffset(tz) {
  try {
    if (!tz) {
      const off = -new Date().getTimezoneOffset();
      const s = off >= 0 ? '+' : '-';
      const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
      const m = String(Math.abs(off) % 60).padStart(2, '0');
      return `UTC${s}${h}:${m}`;
    }
    const base = new Date(new Date().toLocaleString('en-US'));
    const zone = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const diff = Math.round((zone - base) / 60000);
    const s = diff >= 0 ? '+' : '-';
    const h = String(Math.floor(Math.abs(diff) / 60)).padStart(2, '0');
    const m = String(Math.abs(diff) % 60).padStart(2, '0');
    return `UTC${s}${h}:${m}`;
  } catch { return ''; }
}

function AnalogClock({ date, size = 168 }) {
  const sec = date.getSeconds();
  const min = date.getMinutes() + sec / 60;
  const hr  = (date.getHours() % 12) + min / 60;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;

  const hand = (deg, len, w, color) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x2: cx + Math.cos(rad) * len, y2: cy + Math.sin(rad) * len, stroke: color, strokeWidth: w, strokeLinecap: 'round' };
  };

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const r1 = major ? r - 13 : r - 7;
    const rad = (i * 6 - 90) * Math.PI / 180;
    return { x1: cx + Math.cos(rad) * r1, y1: cy + Math.sin(rad) * r1, x2: cx + Math.cos(rad) * (r - 3), y2: cy + Math.sin(rad) * (r - 3), major };
  });

  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      {ticks.map((t, i) => (
        <line key={i} {...t} stroke={t.major ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.06)'} strokeWidth={t.major ? 1.5 : 0.8} strokeLinecap="round" />
      ))}
      <line x1={cx} y1={cy} {...hand(hr * 30,  r * 0.50, 3.5, 'rgba(255,255,255,0.9)')} />
      <line x1={cx} y1={cy} {...hand(min * 6,  r * 0.70, 2.5, 'rgba(255,255,255,0.6)')} />
      <line x1={cx} y1={cy} {...hand(sec * 6,  r * 0.82, 1.5, '#3b82f6')} />
      <circle cx={cx} cy={cy} r={4} fill="white" />
      <circle cx={cx} cy={cy} r={2} fill="#3b82f6" />
    </svg>
  );
}

export default function ClockArtifact() {
  const [now,        setNow]        = useState(new Date());
  const [active,     setActive]     = useState(LOCAL);
  const [panel,      setPanel]      = useState(() => loadPanel() || DEFAULT_PANEL);
  const [search,     setSearch]     = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PANEL_KEY, JSON.stringify(panel)); } catch {}
  }, [panel]);

  const displayTime = nowInZone(active.tz);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_CITIES
      .filter(c => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 7);
  }, [search]);

  const addCity = (c) => {
    if (!panel.find(p => p.city === c.city)) {
      setPanel(prev => [...prev, c].slice(0, 9));
    }
    setSearch('');
    setSearchOpen(false);
  };

  const removeCity = (c, e) => {
    e.stopPropagation();
    setPanel(prev => prev.filter(p => p.city !== c.city));
    if (active.city === c.city) setActive(LOCAL);
  };

  const fmtShort = (tz) =>
    nowInZone(tz).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col items-center pt-5 px-4 pb-4">

        {/* Analog clock */}
        <div className="p-4 bg-white/[0.018] border border-white/[0.055] rounded-full shadow-[0_0_60px_rgba(59,130,246,0.06)] mb-4 shrink-0">
          <AnalogClock date={displayTime} size={168} />
        </div>

        {/* Digital readout */}
        <div className="text-center mb-5 shrink-0">
          <p className="text-[2.8rem] font-extralight font-mono tracking-[-0.04em] tabular-nums leading-none">
            {displayTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </p>
          <p className="text-white/35 text-sm mt-2 font-light">
            {displayTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-white/65 text-sm">
              {active.city === 'Local' ? 'Local Time' : active.city}
            </span>
            {active.country && (
              <span className="text-white/20 text-[10px] uppercase tracking-wider">{active.country}</span>
            )}
            <span className="text-white/18 text-[10px]">{getOffset(active.tz)}</span>
          </div>
        </div>

        {/* World clocks */}
        <div className="w-full max-w-xs space-y-1.5 mb-3">
          {panel.map((c, i) => {
            const isActive = active.city === c.city;
            return (
              <button
                key={`${c.city}-${i}`}
                onClick={() => setActive(c)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all group
                  ${isActive
                    ? 'bg-blue-600/10 border-blue-500/22 text-white'
                    : 'bg-white/[0.022] border-white/[0.045] text-white/45 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-light truncate">{c.city}</span>
                  {c.country && (
                    <span className="text-[9px] text-white/20 uppercase tracking-wider shrink-0">{c.country}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-sm font-mono tabular-nums ${isActive ? 'text-white' : ''}`}>
                    {fmtShort(c.tz)}
                  </span>
                  {c.city !== 'Local' && (
                    <span
                      onClick={e => removeCity(c, e)}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-white/20 hover:text-red-400 text-base leading-none transition-all"
                    >
                      ×
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Add city */}
        <div className="w-full max-w-xs">
          {!searchOpen ? (
            <button
              onClick={openSearch}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-white/[0.08] text-white/18 hover:text-white/45 hover:border-white/15 transition-all text-xs"
            >
              + Add city
            </button>
          ) : (
            <div className="relative">
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => { if (!search) { setSearchOpen(false); } }}
                onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                placeholder="Search city or country..."
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-2xl px-4 py-2.5 text-sm text-white/80 placeholder-white/18 outline-none focus:border-blue-500/30 transition-colors"
              />
              {results.length > 0 && (
                <div className="absolute top-full mt-1.5 w-full bg-[#101010] border border-white/[0.07] rounded-2xl overflow-hidden z-10 shadow-2xl">
                  {results.map((c, i) => (
                    <button
                      key={i}
                      onMouseDown={() => addCity(c)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-all text-left"
                    >
                      <span className="text-sm text-white/65">{c.city}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] text-white/22 uppercase">{c.country}</span>
                        <span className="text-[9px] text-white/18 font-mono">{getOffset(c.tz)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
