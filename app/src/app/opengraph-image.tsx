import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "74px",
          background: "#080808",
          color: "#f6f4ec",
          fontFamily: "Space Grotesk, Arial, sans-serif",
          boxSizing: "border-box",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 44,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Skillfully
        </div>

        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            maxWidth: 1000,
          }}
        >
          Analytics for Agent Skills
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 34,
            lineHeight: 1.28,
            maxWidth: 1040,
          }}
        >
          See how agents use your skills, where they fail, and what to improve next.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
