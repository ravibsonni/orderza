import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Orderza — From menu to WhatsApp orders in minutes",
  description:
    "UAE restaurants: upload your menu, connect WhatsApp, start receiving orders. Powered by Meta Cloud API and AI.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "Orderza",
    description: "From menu upload to WhatsApp orders — in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
       * ── 36BLOCKS AUTH INTEGRATION ──────────────────────────────────────
       * When 36blocks provides the JS embed script, add it here as a
       * <Script src="..." strategy="beforeInteractive" /> tag.
       * Set DUMMY_AUTH_ENABLED=false in .env to activate.
       * The script exposes window.blocks36 which handles login/logout/session.
       * ─────────────────────────────────────────────────────────────────
       */}
      <body className={inter.variable}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
