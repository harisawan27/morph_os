"use client";

import { useEffect } from "react";

/**
 * Registers the Morph OS service worker for PWA install support.
 * Renders nothing — side-effect only.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration failure is non-critical — app still works
      });
  }, []);

  return null;
}
