import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const display = Hanken_Grotesk({ subsets: ["latin", "vietnamese"], weight: "800", variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body", display: "swap" });
export const metadata: Metadata = {
  title: { default: "Card Studio · Discord Github Profile", template: "%s · Discord Github Profile" },
  description: "Your Discord presence, with personality. Create a custom SVG card for your GitHub README or a live card for your website. Powered by Lanyard.",
  authors: [{ name: "LianHarman(LienThuan04)", url: "https://github.com/LienThuan04" }],
  applicationName: "Discord Github Profile",
};
export const viewport: Viewport = { themeColor: "#5865f2", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}
