import { ImageResponse } from "next/og";

export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
        borderRadius: "40px",
      }}
    >
      <svg width="110" height="110" viewBox="0 0 24 24" fill="none"
        stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        <path d="M9 10h.01" strokeWidth="2.5" />
        <path d="M15 10h.01" strokeWidth="2.5" />
      </svg>
    </div>,
    { ...size }
  );
}
