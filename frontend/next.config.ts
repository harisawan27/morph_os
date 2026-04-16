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
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        // Proxy /api/* to the backend.
        // Next.js rewrites run AFTER filesystem routes, so /api/auth/**
        // is already handled by the NextAuth route handler and never
        // reaches this rewrite.
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
