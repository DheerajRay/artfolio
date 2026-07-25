import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope, Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const display = Newsreader({ variable: "--font-display", subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"] });
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: "Artfolio — Dheeraj Ray",
  description: "A full-screen presentation of artworks by Dheeraj Ray.",
  manifest: "/manifest.webmanifest",
  applicationName: "Artfolio",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Artfolio" },
  icons: {
    icon: [
      { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#11110f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        {children}
        <Script id="register-sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}</Script>
      </body>
    </html>
  );
}
