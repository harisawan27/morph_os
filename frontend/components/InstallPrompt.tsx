"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallState = "idle" | "available" | "ios" | "installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>("idle");

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setState("installed");
      return;
    }

    // iOS detection (no beforeinstallprompt support)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone;
    if (isIOS) {
      setState("ios");
      return;
    }

    // Already have deferred prompt from earlier
    if (deferredPrompt) {
      setState("available");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setState("available");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      setState("installed");
    }
  };

  return { state, install };
}

/* Sidebar button — shown inline in the sidebar footer */
interface InstallButtonProps {
  isOpen: boolean; // sidebar expanded state
}

export default function InstallButton({ isOpen }: InstallButtonProps) {
  const { state, install } = useInstallPrompt();
  const [iosBanner, setIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("morph_install_dismissed")) setDismissed(true);
    } catch {}
  }, []);

  if (dismissed || state === "installed" || state === "idle") return null;

  const dismiss = () => {
    try { localStorage.setItem("morph_install_dismissed", "1"); } catch {}
    setDismissed(true);
    setIosBanner(false);
  };

  if (state === "ios") {
    return (
      <>
        <button
          onClick={() => setIosBanner(v => !v)}
          className={`w-full flex items-center rounded-xl py-2.5 transition-all ${isOpen ? "gap-3 px-3" : "justify-center"}`}
          style={{ color: "var(--t3)" }}
          title="Install Morph OS"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
        >
          <Share size={16} className="shrink-0" />
          {isOpen && <span className="text-sm font-light whitespace-nowrap">Install App</span>}
        </button>

        {iosBanner && isOpen && (
          <div
            className="mx-2 mb-1 px-3 py-3 rounded-2xl text-[11px] leading-relaxed relative"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
          >
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 p-0.5 rounded-lg transition-colors"
              style={{ color: "var(--t5)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--t5)"; }}
            >
              <X size={11} />
            </button>
            <p className="font-medium mb-1" style={{ color: "var(--t1)" }}>Install on iPhone / iPad</p>
            <p style={{ color: "var(--t3)" }}>
              Tap the <strong>Share</strong> button in Safari, then choose <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
      </>
    );
  }

  // Chrome / Edge / Android — native install prompt
  return (
    <button
      onClick={install}
      className={`w-full flex items-center rounded-xl py-2.5 transition-all ${isOpen ? "gap-3 px-3" : "justify-center"}`}
      style={{ color: "var(--t3)" }}
      title="Install Morph OS as an app"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}
    >
      <Download size={16} className="shrink-0" />
      {isOpen && <span className="text-sm font-light whitespace-nowrap">Install App</span>}
    </button>
  );
}
