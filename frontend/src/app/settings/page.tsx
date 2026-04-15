"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Trash2, Check, User, Sparkles, Brain,
  History, Cloud, Shield, Mail, AtSign, Loader2,
  MapPin, Briefcase, MessageSquare, Pencil, Sun, Moon,
} from "lucide-react";
import { useTheme } from "../../../components/ThemeProvider";

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Shared Card ──────────────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-5 sm:p-6 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", ...style }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span style={{ color: "var(--t4)" }}>{icon}</span>}
      <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t4)" }}>{label}</p>
    </div>
  );
}

// ─── User context type ────────────────────────────────────────────────────────
type UserContext = {
  name: string; role: string; about: string; location: string;
  tone: "casual" | "professional" | "creative";
};
const DEFAULT_CONTEXT: UserContext = { name: "", role: "", about: "", location: "", tone: "casual" };
const CTX_KEY = "morph_user_context";

function loadContext(): UserContext {
  try {
    const raw = localStorage.getItem(CTX_KEY);
    if (raw) return { ...DEFAULT_CONTEXT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONTEXT;
}

// ─── About You card ───────────────────────────────────────────────────────────
function AboutYouCard({ googleName }: { googleName?: string | null }) {
  const [ctx,     setCtx]     = useState<UserContext>(DEFAULT_CONTEXT);
  const [flashed, setFlashed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loaded = loadContext();
    if (!loaded.name && googleName) loaded.name = googleName;
    setCtx(loaded);
  }, [googleName]);

  const update = useCallback((patch: Partial<UserContext>) => {
    setCtx(prev => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try { localStorage.setItem(CTX_KEY, JSON.stringify(next)); } catch {}
        setFlashed(true);
        setTimeout(() => setFlashed(false), 1800);
      }, 600);
      return next;
    });
  }, []);

  const tones: { key: UserContext["tone"]; label: string; desc: string }[] = [
    { key: "casual",       label: "Casual",       desc: "Friendly & conversational" },
    { key: "professional", label: "Professional",  desc: "Formal & precise"          },
    { key: "creative",     label: "Creative",      desc: "Expressive & imaginative"  },
  ];

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionLabel label="About You" icon={<Brain size={13} />} />
        <AnimatePresence>
          {flashed && (
            <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-[9px] uppercase tracking-widest text-emerald-400/60 flex items-center gap-1">
              <Check size={9} /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--t4)" }}>
        Morph OS uses this to personalize every response — how it talks to you, what it suggests, and how it understands your requests.
      </p>

      <div className="space-y-4">
        <CtxField icon={<User size={13} />}      label="What should Morph OS call you?"  placeholder="e.g. Raj, Alex, Dev..."                           value={ctx.name}     onChange={v => update({ name: v })} />
        <CtxField icon={<Briefcase size={13} />} label="What do you do?"                 placeholder="e.g. Software engineer, Student, Designer..."    value={ctx.role}     onChange={v => update({ role: v })} />
        <CtxField icon={<MapPin size={13} />}    label="Your city"                       placeholder="e.g. Mumbai, New York, London..."                  value={ctx.location} onChange={v => update({ location: v })} hint="Used to auto-fill weather and location-aware prompts" />

        {/* About textarea */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Pencil size={13} style={{ color: "var(--t4)" }} />
            <label className="text-[11px]" style={{ color: "var(--t3)" }}>Tell Morph OS about yourself</label>
          </div>
          <textarea
            value={ctx.about}
            onChange={e => update({ about: e.target.value })}
            placeholder="e.g. I'm building a SaaS startup, love hip-hop, usually want concise answers..."
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none transition-colors leading-relaxed"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--t1)",
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--border-hi)"; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }}
          />
          <style>{`textarea::placeholder, input::placeholder { color: var(--placeholder); }`}</style>
          <p className="text-[9px] mt-1.5 ml-1" style={{ color: "var(--t5)" }}>The more context you give, the smarter Morph OS gets with you.</p>
        </div>

        {/* Tone */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <MessageSquare size={13} style={{ color: "var(--t4)" }} />
            <label className="text-[11px]" style={{ color: "var(--t3)" }}>Preferred response tone</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tones.map(t => (
              <button key={t.key} onClick={() => update({ tone: t.key })}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-center transition-all"
                style={ctx.tone === t.key
                  ? { background: "rgba(147,51,234,0.1)", borderColor: "rgba(147,51,234,0.25)", color: "var(--t1)" }
                  : { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--t3)" }
                }
                onMouseEnter={e => { if (ctx.tone !== t.key) { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; } }}
                onMouseLeave={e => { if (ctx.tone !== t.key) { (e.currentTarget as HTMLElement).style.color = "var(--t3)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; } }}
              >
                <span className="text-xs font-medium">{t.label}</span>
                <span className="text-[9px] leading-tight" style={{ color: "var(--t4)" }}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CtxField({ icon, label, placeholder, value, onChange, hint }: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: "var(--t4)" }}>{icon}</span>
        <label className="text-[11px]" style={{ color: "var(--t3)" }}>{label}</label>
      </div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition-colors"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t1)" }}
        onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--border-hi)"; }}
        onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }}
      />
      {hint && <p className="text-[9px] mt-1.5 ml-1" style={{ color: "var(--t5)" }}>{hint}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [clearing,   setClearing]   = useState(false);
  const [cleared,    setCleared]    = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  const clearStorage = () => {
    setClearing(true);
    Object.keys(localStorage)
      .filter(k => k.startsWith("morph_"))
      .forEach(k => localStorage.removeItem(k));
    setTimeout(() => {
      setClearing(false); setCleared(true);
      setTimeout(() => setCleared(false), 2500);
    }, 500);
  };

  // Theme toggle card — shown in both guest and auth
  const ThemeCard = (
    <Card>
      <SectionLabel label="Appearance" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-light" style={{ color: "var(--t1)" }}>
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t4)" }}>
            {theme === "dark" ? "Easy on the eyes at night" : "Clean and bright"}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1"
          style={{
            background: theme === "dark" ? "rgba(147,51,234,0.25)" : "rgba(251,191,36,0.25)",
            border: `1px solid ${theme === "dark" ? "rgba(147,51,234,0.35)" : "rgba(251,191,36,0.4)"}`,
          }}
          aria-label="Toggle theme"
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
            style={{
              background: theme === "dark" ? "#7c3aed" : "#f59e0b",
              marginLeft: theme === "dark" ? 0 : "auto",
            }}
          >
            {theme === "dark"
              ? <Moon size={10} className="text-white" />
              : <Sun  size={10} className="text-white" />}
          </motion.div>
        </button>
      </div>
    </Card>
  );

  if (status === "loading") {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--t4)" }} />
      </div>
    );
  }

  // ── GUEST ─────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
        <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 md:pt-12 pb-12 space-y-4">

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 pb-2 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <User size={26} style={{ color: "var(--t4)" }} />
            </div>
            <div>
              <p className="text-lg font-light" style={{ color: "var(--t1)" }}>Guest Mode</p>
              <p className="text-sm mt-1" style={{ color: "var(--t4)" }}>Nothing is saved in this session</p>
            </div>
          </motion.div>

          <AboutYouCard />

          {ThemeCard}

          <Card>
            <SectionLabel label="Sign in to unlock" />
            <div className="space-y-4 mb-5">
              {[
                { icon: <History  size={14} className="text-blue-400/70"   />, title: "Session history",  desc: "Every morph saved and resumable across devices."          },
                { icon: <Cloud    size={14} className="text-purple-400/70" />, title: "Cloud sync",       desc: "Todo, notes, timer state — persisted forever."            },
                { icon: <Sparkles size={14} className="text-yellow-400/70" />, title: "Semantic memory",  desc: "Morph OS remembers context and gets faster over time."     },
                { icon: <Shield   size={14} className="text-green-400/70"  />, title: "Private & secure", desc: "All sessions are scoped to your account only."            },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <p className="text-sm font-light" style={{ color: "var(--t2)" }}>{title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--t4)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-sm transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <GoogleIcon /> Continue with Google
            </button>
          </Card>

          <Card style={{ borderColor: "rgba(239,68,68,0.1)" }}>
            <SectionLabel label="Local cache" />
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--t4)" }}>Clear artifact state stored in this browser.</p>
            <ClearBtn clearing={clearing} cleared={cleared} onClick={clearStorage} />
          </Card>

        </div>
      </div>
    );
  }

  // ── AUTHENTICATED ─────────────────────────────────────────────────────────
  const user = session.user;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 md:pt-12 pb-12 space-y-4">

        {/* Avatar hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 pb-2">
          <div className="relative">
            {user?.image ? (
              <img src={user.image} alt={user.name ?? ""}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
                style={{ border: "2px solid var(--border-md)" }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <User size={32} style={{ color: "var(--t4)" }} />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
              <GoogleIcon />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-light tracking-tight" style={{ color: "var(--t1)" }}>{user?.name ?? "—"}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--t4)" }}>Signed in with Google</p>
          </div>
        </motion.div>

        {/* About You */}
        <AboutYouCard googleName={user?.name} />

        {/* Appearance / Theme */}
        {ThemeCard}

        {/* Account */}
        <Card>
          <SectionLabel label="Account" />
          <div className="space-y-1">
            <ProfileRow icon={<AtSign size={13} style={{ color: "var(--t3)" }} />} label="Name"   value={user?.name  ?? "—"} />
            <ProfileRow icon={<Mail   size={13} style={{ color: "var(--t3)" }} />} label="Email"  value={user?.email ?? "—"} />
            <ProfileRow icon={<div className="w-3 h-3 rounded-full bg-emerald-500/60" />}  label="Status" value="Active" valueColor="#34d399" />
          </div>
        </Card>

        {/* Active features */}
        <Card>
          <SectionLabel label="Active features" />
          <div className="space-y-3">
            {[
              { icon: <History  size={13} className="text-blue-400/60"    />, label: "Session history"  },
              { icon: <Cloud    size={13} className="text-purple-400/60"  />, label: "Cloud sync"       },
              { icon: <Sparkles size={13} className="text-yellow-400/60"  />, label: "Semantic memory"  },
              { icon: <Shield   size={13} className="text-emerald-400/60" />, label: "Private sessions" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                {icon}
                <span className="text-sm" style={{ color: "var(--t2)" }}>{label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-emerald-400/60 bg-emerald-500/8 border border-emerald-500/15 px-2 py-0.5 rounded-full">On</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Sign out */}
        <Card>
          <SectionLabel label="Session" />
          <AnimatePresence mode="wait">
            {signingOut ? (
              <motion.div key="out" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 py-3 text-sm" style={{ color: "var(--t4)" }}>
                <Loader2 size={14} className="animate-spin" /> Signing out...
              </motion.div>
            ) : (
              <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm transition-all active:scale-[0.98]"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t3)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
              >
                <LogOut size={14} /> Sign out
              </motion.button>
            )}
          </AnimatePresence>
        </Card>

        {/* Danger zone */}
        <Card style={{ borderColor: "rgba(239,68,68,0.08)" }}>
          <SectionLabel label="Danger zone" />
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--t4)" }}>
            Clear locally cached artifact state (todo, notes, timer). This also clears your About You context. Cloud history is unaffected.
          </p>
          <ClearBtn clearing={clearing} cleared={cleared} onClick={clearStorage} />
        </Card>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProfileRow({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 last:border-0" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="shrink-0">{icon}</div>
      <span className="text-xs w-10 shrink-0" style={{ color: "var(--t4)" }}>{label}</span>
      <span className="text-sm font-light truncate" style={{ color: valueColor ?? "var(--t2)" }}>{value}</span>
    </div>
  );
}

function ClearBtn({ clearing, cleared, onClick }: { clearing: boolean; cleared: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={clearing || cleared}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider border transition-all active:scale-[0.97] ${
        cleared
          ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-400"
          : "bg-red-500/8 border-red-500/15 text-red-400/60 hover:bg-red-500/15 hover:text-red-400"
      }`}
    >
      {clearing ? <><span className="w-3 h-3 rounded-full border border-red-400/30 border-t-red-400 animate-spin" /> Clearing...</> :
       cleared   ? <><Check size={11} /> Cleared</> :
                   <><Trash2 size={11} /> Clear Local Cache</>}
    </button>
  );
}
