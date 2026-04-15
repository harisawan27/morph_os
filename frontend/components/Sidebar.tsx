"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Ghost, Plus, Settings, Menu, X, Trash2, User, LogIn, Vault,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type ChatSession = { id: string; title: string };

export default function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [expanded,   setExpanded]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions,   setSessions]   = useState<ChatSession[]>([]);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const isOpen = expanded || mobileOpen;
  const { data: session } = useSession();

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/sessions`, { credentials: "include" });
      if (res.ok) setSessions(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchSessions();
    window.addEventListener("morph:session-update", fetchSessions);
    return () => window.removeEventListener("morph:session-update", fetchSessions);
  }, [fetchSessions]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`${API}/api/sessions/${id}`, { method: "DELETE", credentials: "include" });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (pathname === `/session/${id}`) router.push("/");
    } catch {}
    setDeleting(null);
  };

  const activeSessionId = pathname.startsWith("/session/")
    ? pathname.split("/session/")[1]
    : null;

  const navItem = (href: string, icon: React.ReactNode, label: string, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} onClick={() => setMobileOpen(false)}>
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
          style={{
            background: active ? "var(--bg-active)" : "transparent",
            color: active ? "var(--t1)" : "var(--t3)",
          }}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
        >
          <span className="shrink-0">{icon}</span>
          {isOpen && <span className="text-sm font-light whitespace-nowrap">{label}</span>}
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-0 left-0 z-50 w-14 h-14 flex items-center justify-center transition-colors active:scale-95"
        style={{ color: "var(--t3)" }}
        onClick={() => setMobileOpen(v => !v)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile dim overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 256 : 60 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          border-r overflow-hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          transition-transform duration-200 md:transition-none
        `}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border)",
        }}
      >
        {/* Top: toggle + logo */}
        <div className="flex items-center shrink-0 h-14 px-3 gap-3">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0"
            style={{ color: "var(--t3)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
            onClick={() => isOpen ? (mobileOpen ? setMobileOpen(false) : setExpanded(false)) : setExpanded(true)}
          >
            <Menu size={17} />
          </button>

          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-white/10 flex items-center justify-center shrink-0">
                <Ghost size={14} className="text-white/60" />
              </div>
              <div className="leading-none">
                <p className="text-sm font-medium tracking-tight whitespace-nowrap" style={{ color: "var(--t1)" }}>Morph OS</p>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t4)" }}>Stealth</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* New Chat */}
        <div className="px-2 mb-1 shrink-0">
          {navItem("/", <Plus size={17} />, "New Chat", true)}
        </div>

        {/* The Vault */}
        <div className="px-2 mb-1 shrink-0">
          {navItem("/artifacts", <Vault size={17} />, "The Vault")}
        </div>

        {/* Divider + recent label */}
        {isOpen && sessions.length > 0 && (
          <div className="px-4 mb-1 shrink-0">
            <p className="text-[9px] uppercase tracking-widest py-1" style={{ color: "var(--t5)" }}>Recent</p>
          </div>
        )}

        {/* Session list */}
        {isOpen ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 morph-scrollbar">
            {sessions.map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <Link key={s.id} href={`/session/${s.id}`}>
                  <div
                    className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer"
                    style={{
                      background: isActive ? "var(--bg-active)" : "transparent",
                      color: isActive ? "var(--t1)" : "var(--t3)",
                    }}
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; } }}
                  >
                    <span className="text-xs font-light truncate flex-1 min-w-0 pr-5">
                      {s.title.length > 28 ? s.title.slice(0, 28) + "…" : s.title}
                    </span>
                    <button
                      onClick={e => handleDelete(e, s.id)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 hover:text-red-400 transition-all"
                      style={{ color: "var(--t4)" }}
                    >
                      {deleting === s.id
                        ? <span className="w-2.5 h-2.5 rounded-full border border-red-400/30 border-t-red-400 animate-spin block" />
                        : <Trash2 size={11} />}
                    </button>
                  </div>
                </Link>
              );
            })}

            {sessions.length === 0 && (
              <p className="text-center text-[10px] uppercase tracking-widest py-4" style={{ color: "var(--t5)" }}>
                No chats yet
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Footer */}
        <div className="px-2 pb-3 shrink-0 space-y-0.5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>

          {navItem("/settings", <Settings size={16} />, "Settings")}

          {session ? (
            <Link href="/settings">
              <div
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
                style={{ color: "var(--t3)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
              >
                <div className="w-5 h-5 shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ border: "1px solid var(--border-md)", background: "var(--bg-card)" }}>
                  {session.user?.image
                    ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                    : <User size={11} />}
                </div>
                {isOpen && (
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-light whitespace-nowrap truncate leading-none">{session.user?.name ?? "Profile"}</p>
                    {session.user?.email && (
                      <p className="text-[9px] truncate mt-0.5" style={{ color: "var(--t4)" }}>{session.user.email}</p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
              style={{ color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            >
              <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center" style={{ border: "1px solid var(--border)" }}>
                <LogIn size={11} />
              </div>
              {isOpen && <span className="text-xs whitespace-nowrap">Sign in</span>}
            </button>
          )}
        </div>

      </motion.aside>
    </>
  );
}
