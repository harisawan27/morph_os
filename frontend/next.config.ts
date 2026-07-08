import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  /**
   * Proxy all /api/* requests to the backend EXCEPT /api/auth/*
   * which is handled by NextAuth locally on the frontend.
   *
   * This puts frontend + backend on the SAME origin in production,
   * so the NextAuth session cookie is included on every API call
   * and the backend can authenticate users properly.
   *
   * BACKEND_URL is a build-time arg (not exposed to the client).
   * In local dev BACKEND_URL is unset, so no rewrite is added and
   * NEXT_PUBLIC_API_URL=http://localhost:8000 is used directly.
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) return [];
    // Explicit routes only — /api/auth/** is intentionally absent so
    // NextAuth's route handler handles signin/callback/error undisturbed.
    return [
      { source: "/api/generate",           destination: `${backendUrl}/api/generate` },
      { source: "/api/generate-with-file", destination: `${backendUrl}/api/generate-with-file` },
      { source: "/api/sessions",           destination: `${backendUrl}/api/sessions` },
      { source: "/api/sessions/:path*",    destination: `${backendUrl}/api/sessions/:path*` },
      { source: "/api/artifacts",          destination: `${backendUrl}/api/artifacts` },
      { source: "/api/artifacts/:path*",   destination: `${backendUrl}/api/artifacts/:path*` },
      { source: "/api/youtube/:path*",     destination: `${backendUrl}/api/youtube/:path*` },
      { source: "/api/settings",           destination: `${backendUrl}/api/settings` },
    ];
  },
};

export default nextConfig;
