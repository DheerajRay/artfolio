import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope, Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const display = Newsreader({ variable: "--font-display", subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"] });
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: "NOA KLINE® — Visual Artist",
  description: "A dynamic personal portfolio for visual artist and image maker NOA KLINE.",
  manifest: "/manifest.webmanifest",
  applicationName: "NOA KLINE",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NOA KLINE" },
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
