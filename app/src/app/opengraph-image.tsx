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
          justifyContent: "space-between",
          alignItems: "stretch",
          padding: "44px",
          backgroundColor: "#e3e3e3",
          color: "#080808",
          fontFamily: "Space Grotesk, Arial, sans-serif",
          boxSizing: "border-box",
          border: "4px solid #080808",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            gap: 20,
          }}
        >
          <div>SKILLFULLY</div>
          <div>ANALYTICS FOR AGENT SKILLS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 84,
              lineHeight: 0.95,
              fontWeight: 700,
              maxWidth: 950,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
            }}
          >
            SEE HOW YOUR
            <br />
            AGENTS PERFORM
          </div>

          <div
            style={{
              maxWidth: 760,
              fontSize: 32,
              lineHeight: 1.28,
            }}
          >
            See how agents use your skills, where they fail, and what to improve next.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 20,
            }}
          >
            <div
              style={{
                border: "3px solid #080808",
                background: "#ffffff",
                padding: "16px 18px",
                minHeight: 130,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 20, letterSpacing: "0.08em" }}>AGENT RUNS</div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>1,284</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 24 }}>total</span>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, fontSize: 22 }}>
                <span>PASS 82%</span>
                <span>WARN 11%</span>
                <span>FAIL 7%</span>
              </div>
            </div>

            <div
              style={{
                border: "3px solid #080808",
                background: "#ffffff",
                padding: "16px 18px",
                minHeight: 130,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 20, letterSpacing: "0.08em" }}>IMPROVEMENT LOOP</div>
              <div style={{ fontSize: 18, fontFamily: "JetBrains Mono, monospace" }}>1) Identify failures</div>
              <div style={{ fontSize: 18, fontFamily: "JetBrains Mono, monospace" }}>2) Pinpoint patterns</div>
              <div style={{ fontSize: 18, fontFamily: "JetBrains Mono, monospace" }}>3) Ship better prompts</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "4px solid #080808",
            paddingTop: "20px",
            fontSize: 26,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
          }}
        >
          <span>skillfully.sh</span>
          <span>skillfully.sh/dashboard</span>
        </div>

        <div
          style={{
            position: "absolute",
            right: 44,
            top: "48%",
            transform: "translateY(-50%)",
            width: 160,
            height: 160,
            border: "3px solid #080808",
            background: "#f2f2f2",
            padding: 16,
            boxShadow: "12px 12px 0 #080808",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              borderBottom: "2px solid #080808",
              paddingBottom: 8,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Failure heatmap
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 36, height: 68, background: "#080808" }} />
            <div style={{ width: 36, height: 44, background: "#4b4b4b" }} />
            <div style={{ width: 36, height: 58, background: "#9a9a9a" }} />
          </div>
          <div
            style={{
              width: "100%",
              height: 18,
              background: "#ffffff",
              border: "2px solid #080808",
            }}
          />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>Improve loop in 2 days</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
