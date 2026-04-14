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
  title: "Skillfully - Agent Skills Analytics",
  description: "Know which of your agent skills work and which don't.",
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
