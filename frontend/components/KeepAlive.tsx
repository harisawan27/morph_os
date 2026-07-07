"use client";
import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Pings the backend health endpoint every 10 minutes to prevent
 * HuggingFace Spaces from sleeping after inactivity.
 */
export default function KeepAlive() {
  useEffect(() => {
    if (!API) return;
    const ping = setInterval(() => {
      fetch(`${API}/api/health`).catch(() => {});
    }, PING_INTERVAL);
    // Ping immediately on mount too
    fetch(`${API}/api/health`).catch(() => {});
    return () => clearInterval(ping);
  }, []);

  return null;
}
