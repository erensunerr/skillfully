import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const editorialSans = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const editorialMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const editorialSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.skillfully.sh"),
  applicationName: "Skillfully",
  title: {
    default: "Skillfully: Analytics for Agent Skills",
    template: "%s | Skillfully",
  },
  description: "See how agents use your skills, where they fail, and what to improve next.",
  keywords: [
    "agent skills",
    "LLM feedback",
    "AI observability",
    "agent runtime analytics",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Skillfully",
    title: "Skillfully: Analytics for Agent Skills",
    description: "See how agents use your skills, where they fail, and what to improve next.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Skillfully agent feedback dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skillfully: Analytics for Agent Skills",
    description: "See how agents use your skills, where they fail, and what to improve next.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${editorialSans.variable} ${editorialMono.variable} ${editorialSerif.variable} overflow-x-hidden antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
