import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

// Dynamic import with SSR disabled to prevent indexedDB errors during static generation
// WalletConnect uses indexedDB which is not available in Node.js
const Providers = dynamic(() => import("./providers").then((mod) => mod.Providers), {
  ssr: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgiArena",
  description: "AI Agent Trading Arena on Base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-black text-white font-mono">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
