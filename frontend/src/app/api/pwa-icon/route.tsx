import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const s        = Math.min(512, Math.max(16, parseInt(req.nextUrl.searchParams.get("s") ?? "512")));
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";
  // Maskable: full-bleed (no border-radius) — OS clips to its own shape (squircle/circle)
  // Any: rounded corners look good in Chrome install dialog + Windows taskbar
  const r    = maskable ? 0 : Math.round(s * 0.18);
  // Maskable safe zone is center 80%, so icon stays within safe area
  const icon = Math.round(s * (maskable ? 0.46 : 0.58));

  return new ImageResponse(
    <div
      style={{
        width: s, height: s,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
        borderRadius: r,
      }}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none"
        stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        <path d="M9 10h.01" strokeWidth="2.5" />
        <path d="M15 10h.01" strokeWidth="2.5" />
      </svg>
    </div>,
    { width: s, height: s }
  );
}
