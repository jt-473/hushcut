import { ImageResponse } from "next/og";

export const alt = "Hushcut — Remove Silence From Audio Online, Free";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0e1311",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 600, opacity: 0.85 }}>
          Hushcut
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.05, marginTop: 28 }}>
          Remove silence from audio
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 28, color: "#b7f0ad" }}>
          Free · No sign-up · Unlimited · Runs in your browser
        </div>
      </div>
    ),
    { ...size }
  );
}
