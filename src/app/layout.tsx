import type { Metadata } from "next";
import { Inter, Schibsted_Grotesk, Noto_Sans, Fustat } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hushcut",
  description:
    "Remove silence from audio online for free. No sign-up, no limits, no upload — Hushcut trims the silent gaps right in your browser and gives you a clean file to download.",
  keywords: [
    "remove silence from audio",
    "audio silence remover",
    "trim silence online",
    "cut silence from audio",
    "free audio editor",
    "remove dead air podcast",
  ],
  openGraph: {
    title: "Hushcut — Remove Silence From Audio Online, Free",
    description:
      "Free, unlimited, no sign-up. Trim silent gaps from any audio file right in your browser.",
    siteName: "Hushcut",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hushcut — Remove Silence From Audio Online, Free",
    description:
      "Free, unlimited, no sign-up. Trim silent gaps from any audio file right in your browser.",
  },
  verification: {
    google: "gl00VMLHzYI-WRl3KmlBlzihIDWoss-tMIS1qzhx2CM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${schibstedGrotesk.variable} ${notoSans.variable} ${fustat.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
