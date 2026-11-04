import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import "./workspace.css";
import { SiteFooter, SiteHeader } from "@/components/site-footer";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = { title: "HoloStack AI — Architecture workspace", description: "Design it. Understand it. Stress-test it. Optimize it. Ship it. An intelligent workspace for software architecture." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}><body><a href="#main-content" className="skip-link">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></body></html>;
}
