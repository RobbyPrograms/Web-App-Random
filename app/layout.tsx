import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "BOXED", template: "%s · BOXED" },
  description: "A daily sports guessing game. One anonymous season stat line. Six guesses. Same puzzle for everyone.",
  applicationName: "BOXED",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BOXED", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "BOXED",
    description: "Name the athlete from a single season stat line.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[#0A0A0F]">
          Skip to content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
