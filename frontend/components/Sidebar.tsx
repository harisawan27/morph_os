"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Ghost, Plus, Settings, Menu, X, Trash2, User, LogIn, Vault, Pencil, Library, Search,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type ChatSession = { id: string; title: string };

export default function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [expanded,   setExpanded]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions,       setSessions]       = useState<ChatSession[]>([]);
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId,     setRenamingId]     = useState<string | null>(null);
  const [renameVal,      setRenameVal]      = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");

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

  const startRename = (e: React.MouseEvent, s: ChatSession) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(s.id);
    setRenameVal(s.title);
  };

  const handleRename = async (id: string) => {
    const trimmed = renameVal.trim();
    setRenamingId(null);
    if (!trimmed) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s));
    try {
      await fetch(`${API}/api/sessions/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
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

  const toggle = () => {
    if (mobileOpen) setMobileOpen(false);
    else setExpanded(v => !v);
  };

  const navItem = (href: string, icon: React.ReactNode, label: string, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} onClick={() => setMobileOpen(false)}>
        <div
          className={`flex items-center rounded-xl py-2.5 cursor-pointer transition-all ${isOpen ? "gap-3 px-3" : "justify-center"}`}
          style={{
            background: active ? "var(--bg-active)" : "transparent",
            color: active ? "var(--t1)" : "var(--t3)",
          }}
          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; } }}
          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; } }}
        >
          <span className="shrink-0">{icon}</span>
          {isOpen && <span className="text-sm font-light whitespace-nowrap">{label}</span>}
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger — outside sidebar */}
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
        animate={{ width: isOpen ? 256 : 68 }}
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
        {/* Top: logo + hamburger */}
        {isOpen ? (
          <div className="flex items-center shrink-0 h-14 px-3 gap-2">
            {/* Ghost icon */}
            <div
              className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(79,70,229,0.18))",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              <Ghost size={11} className="text-purple-400" />
            </div>
            {/* Name */}
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="leading-none flex-1 min-w-0 overflow-hidden"
            >
              <p className="text-sm font-semibold tracking-tight whitespace-nowrap" style={{ color: "var(--t1)" }}>Morph OS</p>
            </motion.div>
            {/* Hamburger */}
            <button
              onClick={toggle}
              className="w-7 h-7 flex items-center justify-center rounded-xl shrink-0 transition-all"
              style={{ color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            >
              <Menu size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center shrink-0 pt-3 pb-1 gap-1.5">
            {/* Ghost icon */}
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(79,70,229,0.18))",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              <Ghost size={13} className="text-purple-400" />
            </div>
            {/* Hamburger */}
            <button
              onClick={toggle}
              className="w-7 h-7 flex items-center justify-center rounded-xl transition-all"
              style={{ color: "var(--t4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t4)"; }}
            >
              <Menu size={15} />
            </button>
          </div>
        )}

        {/* New Chat */}
        <div className="px-2 mb-1 shrink-0">
          {navItem("/", <Plus size={17} />, "New Chat", true)}
        </div>

        {/* The Vault */}
        <div className="px-2 mb-1 shrink-0">
          {navItem("/artifacts", <Vault size={17} />, "The Vault")}
        </div>

        {/* My Library */}
        <div className="px-2 mb-1 shrink-0">
          {navItem("/library", <Library size={17} />, "My Library")}
        </div>

        {/* Search + recent label */}
        {isOpen && sessions.length > 0 && (
          <div className="px-3 mb-1 shrink-0 space-y-2">
            <div className="relative">
              <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--t5)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats…"
                className="w-full text-xs rounded-xl pl-8 pr-3 py-2 outline-none transition-colors"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--t2)",
                }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
              />
              <style>{`input::placeholder { color: var(--placeholder); }`}</style>
            </div>
            <p className="text-[9px] uppercase tracking-widest px-1" style={{ color: "var(--t5)" }}>Recent</p>
          </div>
        )}

        {/* Session list */}
        {isOpen ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 morph-scrollbar">
            {sessions.filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(s => {
              const isActive   = s.id === activeSessionId;
              const isRenaming = renamingId === s.id;

              if (isRenaming) {
                return (
                  <div key={s.id} className="flex items-center rounded-xl px-3 py-2" style={{ background: "var(--bg-active)" }}>
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleRename(s.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => handleRename(s.id)}
                      className="flex-1 min-w-0 text-xs font-light bg-transparent outline-none"
                      style={{ color: "var(--t1)" }}
                    />
                  </div>
                );
              }

              if (confirmDeleteId === s.id) {
                return (
                  <div
                    key={s.id}
                    className="rounded-xl px-3 py-2.5 space-y-2"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}
                  >
                    <p className="text-[11px] font-medium" style={{ color: "var(--t2)" }}>Delete this chat?</p>
                    <p className="text-[10px] leading-relaxed truncate" style={{ color: "var(--t4)" }}>
                      {s.title.length > 32 ? s.title.slice(0, 32) + "…" : s.title}
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-1 text-[11px] rounded-lg transition-all"
                        style={{ background: "var(--bg-card)", color: "var(--t3)", border: "1px solid var(--border)" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="flex-1 py-1 text-[11px] rounded-lg transition-all font-medium"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
                      >
                        {deleting === s.id
                          ? <span className="w-2.5 h-2.5 rounded-full border border-red-400/30 border-t-red-400 animate-spin block mx-auto" />
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <Link key={s.id} href={`/session/${s.id}`}>
                  <div
                    className="relative flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all cursor-pointer"
                    style={{
                      background: isActive ? "var(--bg-active)" : "transparent",
                      color: isActive ? "var(--t1)" : "var(--t3)",
                    }}
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; } }}
                  >
                    <span className="text-xs font-light truncate flex-1 min-w-0">
                      {s.title.length > 22 ? s.title.slice(0, 22) + "…" : s.title}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => startRename(e, s)}
                        className="p-1 rounded-lg transition-all"
                        style={{ color: "var(--t5)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(s.id); }}
                        className="p-1 rounded-lg transition-all"
                        style={{ color: "var(--t5)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}

            {sessions.length === 0 && (
              <p className="text-center text-[10px] uppercase tracking-widest py-4" style={{ color: "var(--t5)" }}>
                No chats yet
              </p>
            )}
            {sessions.length > 0 && searchQuery && sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-center text-[10px] py-4" style={{ color: "var(--t5)" }}>
                No results for &ldquo;{searchQuery}&rdquo;
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
                className={`flex items-center rounded-xl py-2.5 cursor-pointer transition-all ${isOpen ? "gap-3 px-3" : "justify-center"}`}
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
              className={`w-full flex items-center rounded-xl py-2.5 transition-all ${isOpen ? "gap-3 px-3" : "justify-center"}`}
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
