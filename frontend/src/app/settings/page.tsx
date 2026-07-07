"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Trash2, Check, User, Mail, Loader2, MapPin,
  Briefcase, MessageSquare, Pencil, Sun, Moon, Brain,
  Palette, ShieldAlert, UserCircle, ChevronRight,
} from "lucide-react";
import { useTheme } from "../../../components/ThemeProvider";

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── User context ─────────────────────────────────────────────────────────────
type UserContext = {
  name: string; role: string; about: string; location: string;
  tone: "casual" | "professional" | "creative";
};
const DEFAULT_CONTEXT: UserContext = { name: "", role: "", about: "", location: "", tone: "casual" };
const CTX_KEY = "morph_user_context";

function loadContext(): UserContext {
  if (typeof window === "undefined") return DEFAULT_CONTEXT;
  try {
    const raw = localStorage.getItem(CTX_KEY);
    if (raw) return { ...DEFAULT_CONTEXT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONTEXT;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",    label: "Profile",    icon: <UserCircle size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette    size={14} /> },
  { id: "account",    label: "Account",    icon: <User       size={14} /> },
  { id: "danger",     label: "Danger Zone",icon: <ShieldAlert size={14} /> },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Small shared components ──────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-medium mb-1" style={{ color: "var(--t1)" }}>{children}</h2>
  );
}
function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--t4)" }}>{children}</p>
  );
}

function FieldLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {icon && <span style={{ color: "var(--t4)" }}>{icon}</span>}
      <label className="text-xs font-medium" style={{ color: "var(--t3)" }}>{children}</label>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, hint }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; hint?: string;
}) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t1)" }}
        onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--border-hi)"; (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--brand-purple-bg)"; }}
        onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
      />
      {hint && <p className="text-[10px] mt-1.5 ml-0.5" style={{ color: "var(--t5)" }}>{hint}</p>}
    </div>
  );
}

function Divider() {
  return <div className="my-6" style={{ borderTop: "1px solid var(--border)" }} />;
}

// ─── Save indicator ───────────────────────────────────────────────────────────
function SavedBadge({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "var(--brand-green-bg)", border: "1px solid var(--brand-green-border)", color: "var(--brand-green)" }}
        >
          <Check size={9} strokeWidth={2.5} /> Saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label, desc }: {
  on: boolean; onToggle: () => void; label: string; desc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div>
        <p className="text-sm" style={{ color: "var(--t1)" }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: "var(--t4)" }}>{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className="relative w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0 ml-4"
        style={{
          background: on ? "var(--brand-purple-bg)" : "var(--bg-input)",
          border: `1px solid ${on ? "var(--brand-purple-border)" : "var(--border)"}`,
        }}
        aria-label={label}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
          className="w-5 h-5 rounded-full shadow-sm"
          style={{
            background: on ? "var(--brand-purple)" : "var(--t5)",
            marginLeft: on ? "auto" : 0,
          }}
        />
      </button>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon, mono = false }: {
  label: string; value: string; icon?: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2.5">
        {icon && <span style={{ color: "var(--t4)" }}>{icon}</span>}
        <span className="text-sm" style={{ color: "var(--t3)" }}>{label}</span>
      </div>
      <span
        className={`text-sm ${mono ? "font-mono" : ""} truncate max-w-50`}
        style={{ color: "var(--t2)" }}
      >{value}</span>
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab({ googleName }: { googleName?: string | null }) {
  const { data: session } = useSession();
  // ✅ Fix: lazy initializer loads localStorage synchronously on first render — no double-refresh
  const [ctx,     setCtx]     = useState<UserContext>(() => {
    const loaded = loadContext();
    if (!loaded.name && googleName) return { ...loaded, name: googleName };
    return loaded;
  });
  const [flashed, setFlashed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB on mount if authenticated
  useEffect(() => {
    if (!session) return;
    let active = true;
    const loadDbSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            setCtx(data);
            try { localStorage.setItem(CTX_KEY, JSON.stringify(data)); } catch {}
          }
        }
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
      }
    };
    loadDbSettings();
    return () => { active = false; };
  }, [session]);

  const update = useCallback((patch: Partial<UserContext>) => {
    setCtx(prev => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        // Save to local storage
        try { localStorage.setItem(CTX_KEY, JSON.stringify(next)); } catch {}
        
        // Save to DB if signed in
        if (session) {
          try {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(next),
            });
          } catch (err) {
            console.error("Failed to save settings to DB:", err);
          }
        }
        
        setFlashed(true);
        setTimeout(() => setFlashed(false), 2000);
      }, 500);
      return next;
    });
  }, [session]);

  const tones: { key: UserContext["tone"]; label: string; desc: string }[] = [
    { key: "casual",       label: "Casual",       desc: "Friendly & conversational" },
    { key: "professional", label: "Professional",  desc: "Formal & precise"          },
    { key: "creative",     label: "Creative",      desc: "Expressive & imaginative"  },
  ];

  return (
    <div>
      {/* Morph persona */}
      <div className="flex items-start justify-between mb-1">
        <SectionTitle>Morph Persona</SectionTitle>
        <SavedBadge show={flashed} />
      </div>
      <SectionDesc>
        Morph uses this to personalize every reply — how it talks to you, what it suggests, and how it reads your requests.
      </SectionDesc>

      <div className="space-y-4">
        <div>
          <FieldLabel icon={<User size={12} />}>What should Morph call you?</FieldLabel>
          <TextInput
            value={ctx.name}
            onChange={v => update({ name: v })}
            placeholder={googleName ? `e.g. ${googleName.split(" ")[0]}` : "e.g. Raj, Alex, Dev…"}
          />
        </div>
        <div>
          <FieldLabel icon={<Briefcase size={12} />}>What do you do?</FieldLabel>
          <TextInput
            value={ctx.role}
            onChange={v => update({ role: v })}
            placeholder="e.g. Software engineer, Student, Designer…"
          />
        </div>
        <div>
          <FieldLabel icon={<MapPin size={12} />}>Your city</FieldLabel>
          <TextInput
            value={ctx.location}
            onChange={v => update({ location: v })}
            placeholder="e.g. Mumbai, New York, London…"
            hint="Used for weather and location-aware context"
          />
        </div>
        <div>
          <FieldLabel icon={<Pencil size={12} />}>Anything else Morph should know?</FieldLabel>
          <textarea
            value={ctx.about}
            onChange={e => update({ about: e.target.value })}
            placeholder="e.g. I'm building a SaaS startup, love hip-hop, usually want concise answers…"
            rows={3}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none transition-all leading-relaxed"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t1)" }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--border-hi)"; (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--brand-purple-bg)"; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
          />
          <p className="text-[10px] mt-1.5 ml-0.5" style={{ color: "var(--t5)" }}>The more you share, the smarter Morph gets with you.</p>
        </div>
      </div>

      <Divider />

      {/* Response tone */}
      <SectionTitle>Response Style</SectionTitle>
      <SectionDesc>How Morph phrases its answers.</SectionDesc>

      <div className="grid grid-cols-3 gap-2.5">
        {tones.map(t => (
          <button
            key={t.key}
            onClick={() => update({ tone: t.key })}
            className="flex flex-col items-start gap-0.5 p-3.5 rounded-xl border text-left transition-all"
            style={ctx.tone === t.key
              ? { background: "var(--brand-purple-bg)", borderColor: "var(--brand-purple-border)", color: "var(--t1)" }
              : { background: "transparent", borderColor: "var(--border)", color: "var(--t3)" }
            }
            onMouseEnter={e => { if (ctx.tone !== t.key) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; }}
            onMouseLeave={e => { if (ctx.tone !== t.key) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <span className="text-xs font-medium" style={{ color: ctx.tone === t.key ? "var(--brand-purple)" : "var(--t2)" }}>{t.label}</span>
            <span className="text-[10px] leading-snug" style={{ color: "var(--t4)" }}>{t.desc}</span>
            {ctx.tone === t.key && (
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand-purple)" }} />
            )}
          </button>
        ))}
      </div>

      <style>{`textarea::placeholder, input::placeholder { color: var(--placeholder); }`}</style>
    </div>
  );
}

// ─── Appearance tab ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SectionDesc>Customize how Morph OS looks on your device.</SectionDesc>

      <Toggle
        on={theme === "dark"}
        onToggle={toggleTheme}
        label={theme === "dark" ? "Dark mode" : "Light mode"}
        desc={theme === "dark" ? "Easy on the eyes at night" : "Clean and bright"}
      />

      {/* Theme preview swatch */}
      <div className="mt-4 flex gap-3">
        {[
          { id: "dark",  bg: "#0d0d12", border: "#1e1e2e", label: "Dark"  },
          { id: "light", bg: "#f8f8f8", border: "#e2e2ea", label: "Light" },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => { if (s.id !== theme) toggleTheme(); }}
            className="flex flex-col items-start gap-2 p-3 rounded-xl border transition-all"
            style={{
              borderColor: s.id === theme ? "var(--brand-purple-border)" : "var(--border)",
              background: s.id === theme ? "var(--brand-purple-bg)" : "transparent",
              minWidth: 96,
            }}
          >
            {/* Mini preview */}
            <div className="w-full h-12 rounded-lg overflow-hidden" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="h-2 w-2/3 rounded m-2" style={{ background: s.id === "dark" ? "#2d2d3a" : "#e8e8ef" }} />
              <div className="h-1.5 w-1/2 rounded mx-2" style={{ background: s.id === "dark" ? "#1e1e2e" : "#d8d8e2" }} />
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium" style={{ color: "var(--t2)" }}>{s.label}</span>
              {s.id === theme && <Check size={11} style={{ color: "var(--brand-purple)" }} strokeWidth={2.5} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Account tab ─────────────────────────────────────────────────────────────
function AccountTab({ user, onSignOut, signingOut }: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <div>
      {/* Google identity block */}
      <SectionTitle>Google Account</SectionTitle>
      <SectionDesc>Your identity is managed by Google. Sign in once and stay connected across all devices.</SectionDesc>

      <div
        className="flex items-center gap-4 p-4 rounded-xl mb-6"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
      >
        {user.image ? (
          <img src={user.image} alt={user.name ?? ""} className="w-12 h-12 rounded-full shrink-0" style={{ border: "2px solid var(--border-md)" }} />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <User size={20} style={{ color: "var(--t4)" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--t1)" }}>{user.name ?? "—"}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--t4)" }}>{user.email ?? "—"}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GoogleIcon size={11} />
            <span className="text-[10px]" style={{ color: "var(--t5)" }}>Signed in with Google</span>
          </div>
        </div>
      </div>

      <InfoRow icon={<Mail size={13} />}   label="Email"  value={user.email ?? "—"} mono />
      <div className="mb-6" />

      {/* Sign out */}
      <SectionTitle>Session</SectionTitle>
      <SectionDesc>Signing out removes your session from this device only. Your data stays in the cloud.</SectionDesc>

      <AnimatePresence mode="wait">
        {signingOut ? (
          <motion.div key="out" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 py-3 text-sm" style={{ color: "var(--t4)" }}>
            <Loader2 size={14} className="animate-spin" /> Signing out…
          </motion.div>
        ) : (
          <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={onSignOut}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t3)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-hover)"; el.style.color = "var(--t1)"; el.style.borderColor = "var(--border-md)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-input)"; el.style.color = "var(--t3)"; el.style.borderColor = "var(--border)"; }}
          >
            <LogOut size={14} /> Sign out
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Danger zone tab ─────────────────────────────────────────────────────────
function DangerTab() {
  const [clearing, setClearing] = useState(false);
  const [cleared,  setCleared]  = useState(false);

  const clearStorage = () => {
    setClearing(true);
    Object.keys(localStorage)
      .filter(k => k.startsWith("morph_"))
      .forEach(k => localStorage.removeItem(k));
    setTimeout(() => {
      setClearing(false); setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    }, 600);
  };

  return (
    <div>
      <SectionTitle>Danger Zone</SectionTitle>
      <SectionDesc>These actions are irreversible. Proceed with care.</SectionDesc>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(239,68,68,0.15)" }}
      >
        <div className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--t1)" }}>Clear local cache</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t4)" }}>
              Removes your About You preferences and any cached artifact state from this browser. Your cloud history is unaffected.
            </p>
          </div>
          <button
            onClick={clearStorage}
            disabled={clearing || cleared}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
            style={cleared
              ? { background: "var(--brand-green-bg)", border: "1px solid var(--brand-green-border)", color: "var(--brand-green)" }
              : { background: "var(--brand-red-bg)", border: "1px solid var(--brand-red-border)", color: "var(--brand-red)" }
            }
            onMouseEnter={e => { if (!cleared) (e.currentTarget as HTMLElement).style.background = "var(--brand-red-border)"; }}
            onMouseLeave={e => { if (!cleared) (e.currentTarget as HTMLElement).style.background = "var(--brand-red-bg)"; }}
          >
            {clearing ? <><span className="w-3 h-3 rounded-full border border-red-400/30 border-t-red-400 animate-spin" /> Clearing…</> :
             cleared   ? <><Check size={11} /> Cleared!</> :
                         <><Trash2 size={11} /> Clear</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [activeTab,  setActiveTab]  = useState<TabId>("profile");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

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
        <div className="max-w-lg mx-auto px-4 sm:px-6 pt-14 pb-16">

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--t1)" }}>Settings</h1>
            <p className="text-sm" style={{ color: "var(--t4)" }}>Guest mode — sign in to unlock sync and history.</p>
          </div>

          {/* Profile card */}
          <div className="mb-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <ProfileTab />
          </div>

          {/* Appearance card */}
          <div className="mb-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <AppearanceTab />
          </div>

          {/* Sign in to unlock */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <SectionTitle>Sign in to unlock</SectionTitle>
            <SectionDesc>Get session history, cloud sync, and semantic memory — all scoped privately to your account.</SectionDesc>
            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--t2)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-hover)"; el.style.color = "var(--t1)"; el.style.borderColor = "var(--border-md)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-input)"; el.style.color = "var(--t2)"; el.style.borderColor = "var(--border)"; }}
            >
              <GoogleIcon /> Continue with Google
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── AUTHENTICATED ─────────────────────────────────────────────────────────
  const user = session.user!;
  const visibleTabs = TABS;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)", color: "var(--t1)" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-16">

        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-0.5" style={{ color: "var(--t1)" }}>Settings</h1>
            <p className="text-sm" style={{ color: "var(--t4)" }}>Manage your preferences and account.</p>
          </div>
          {/* Avatar pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--bg-hover)" }}>
                <User size={10} style={{ color: "var(--t4)" }} />
              </div>
            )}
            <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--t2)" }}>{user.name?.split(" ")[0] ?? "You"}</span>
          </div>
        </div>

        <div className="flex gap-6 lg:gap-8">

          {/* ── Sidebar nav (desktop) ── */}
          <nav className="hidden sm:flex flex-col gap-0.5 w-40 shrink-0 pt-0.5">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left"
                style={activeTab === tab.id
                  ? { background: "var(--bg-hover)", color: "var(--t1)", fontWeight: 500 }
                  : { color: "var(--t3)" }
                }
                onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
              >
                <span style={{ color: activeTab === tab.id ? "var(--brand-purple)" : "var(--t4)" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Mobile tab strip */}
            <div className="sm:hidden flex gap-1 mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={activeTab === tab.id
                    ? { background: "var(--bg-hover)", color: "var(--t1)", border: "1px solid var(--border-md)" }
                    : { color: "var(--t3)", border: "1px solid transparent" }
                  }
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl p-5 sm:p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                {activeTab === "profile" && <ProfileTab googleName={user.name} />}
                {activeTab === "appearance" && <AppearanceTab />}
                {activeTab === "account" && <AccountTab user={user} onSignOut={handleSignOut} signingOut={signingOut} />}
                {activeTab === "danger" && <DangerTab />}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
