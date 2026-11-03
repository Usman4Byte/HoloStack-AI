import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = { title: "HoloStack AI — Architecture workspace", description: "Design it. Understand it. Stress-test it. Optimize it. Ship it. An intelligent workspace for software architecture." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main-content" className="skip-link">Skip to content</a><div id="main-content">{children}</div></body></html>;
}
