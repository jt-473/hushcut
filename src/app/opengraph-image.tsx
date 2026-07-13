import { ImageResponse } from "next/og";

export const alt = "Hushcut — Remove Silence From Audio Online, Free";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40' viewBox='0 0 100 40' fill='#000'>" +
  "<rect x='6' y='14' width='4' height='12' rx='2'/><rect x='13' y='9' width='4' height='22' rx='2'/>" +
  "<rect x='20' y='4' width='4' height='32' rx='2'/><rect x='27' y='1' width='4' height='38' rx='2'/>" +
  "<rect x='34' y='8' width='4' height='24' rx='2'/><rect x='41' y='13' width='4' height='14' rx='2'/>" +
  "<rect x='48' y='3' width='4' height='34' rx='2'/><circle cx='60' cy='20' r='2.5'/><circle cx='68' cy='20' r='2.5'/>" +
  "<circle cx='76' cy='20' r='2.5'/><circle cx='84' cy='20' r='2.5'/><circle cx='92' cy='20' r='2.5'/></svg>";
const MARK_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 70,
          background: "linear-gradient(150deg, #ffffff 0%, #f3f7f1 55%, #e7f0e4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK_URI} width={80} height={32} alt="" />
            <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-2px", color: "#000" }}>Hushcut</span>
          </div>
          <span
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              color: "#fff",
              background: "#000",
              padding: "12px 22px",
              borderRadius: 12,
            }}
          >
            Buy me a coffee
          </span>
        </div>

        {/* Center content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 22,
              color: "#0e1311",
              background: "#fff",
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid #e3e3e3",
            }}
          >
            New — trim silence in seconds
          </span>
          <span style={{ fontSize: 82, fontWeight: 800, letterSpacing: "-4px", lineHeight: 1, color: "#000" }}>
            Remove silence from audio
          </span>
          <span style={{ fontSize: 30, color: "#505050", letterSpacing: "-0.5px" }}>
            Upload or record, and get a clean track back in seconds.
          </span>
        </div>

        {/* Value props */}
        <div style={{ display: "flex", gap: 14 }}>
          {["100% free", "No sign-up required", "Unlimited"].map((f) => (
            <span
              key={f}
              style={{
                display: "flex",
                fontSize: 24,
                color: "#000",
                background: "#fff",
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid #e3e3e3",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
