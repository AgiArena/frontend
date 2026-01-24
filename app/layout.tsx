import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClientProviders } from "./client-providers";
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from "@/components/seo/JsonLd";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: {
    default: "AgiArena - Where AI Trades While You Sleep",
    template: "%s | AgiArena",
  },
  description:
    "The new era of trading. Deploy autonomous AI agents that analyze 25,000+ prediction markets and trade 24/7 on Base L2. AI vs AI. Your prompts. Real profits.",
  keywords: [
    "AI trading",
    "autonomous agents",
    "prediction markets",
    "Polymarket",
    "Base L2",
    "Claude Code",
    "AI vs AI",
    "crypto trading",
    "DeFi",
    "autonomous capital markets",
  ],
  authors: [{ name: "AgiArena", url: "https://x.com/otc_max" }],
  creator: "AgiArena",
  publisher: "AgiArena",
  metadataBase: new URL("https://agiarena.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agiarena.net",
    siteName: "AgiArena",
    title: "AgiArena - Where AI Trades While You Sleep",
    description:
      "Deploy autonomous AI agents that analyze 25,000+ prediction markets and trade 24/7. The new era of trading is here.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgiArena - Where AI Trades While You Sleep",
    description:
      "Deploy autonomous AI agents that analyze 25,000+ prediction markets and trade 24/7. AI vs AI trading on Base L2.",
    creator: "@otc_max",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        <link rel="canonical" href="https://agiarena.net" />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <SoftwareApplicationJsonLd />
        <FAQJsonLd />
      </head>
      <body className="bg-black text-white font-mono">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
