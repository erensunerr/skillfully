import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const TITLE = "Skillfully";
const SUBTITLE = "See how agents use your skills, where they fail, and what to improve next.";

async function loadGoogleFont(font: string, text: string, weight?: number) {
  const family = font.replaceAll(" ", "+");
  const variant = weight ? `:wght@${weight}` : "";
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${family}${variant}&text=` +
    encodeURIComponent(text);
  const css = await fetch(cssUrl).then((response) => response.text());
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype|woff)'\)/);

  if (!resource) {
    throw new Error(`Failed to resolve font source for ${font}.`);
  }

  const fontResponse = await fetch(resource[1]);

  if (!fontResponse.ok) {
    throw new Error(`Failed to download font data for ${font}.`);
  }

  return fontResponse.arrayBuffer();
}

export default async function Image() {
  const [titleFont, subtitleFont] = await Promise.all([
    loadGoogleFont("Instrument Serif", TITLE),
    loadGoogleFont("Space Grotesk", SUBTITLE, 500),
  ]);

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
          padding: "78px",
          background: "#000000",
          color: "#f4eddf",
          boxSizing: "border-box",
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: "Instrument Serif",
            fontSize: 228,
            lineHeight: 0.9,
            letterSpacing: "-0.05em",
          }}
        >
          {TITLE}
        </div>

        <div
          style={{
            maxWidth: 940,
            fontFamily: "Space Grotesk",
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
          }}
        >
          {SUBTITLE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: titleFont,
          weight: 400,
          style: "normal",
        },
        {
          name: "Space Grotesk",
          data: subtitleFont,
          weight: 500,
          style: "normal",
        },
      ],
    }
  );
}
