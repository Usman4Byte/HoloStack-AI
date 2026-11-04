"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers3, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  ["Product", "#product-preview"],
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Templates", "#templates"],
  ["FAQ", "#faq"],
] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <header className="public-header">
    <Link href="/" className="brand" aria-label="HoloStack AI home" onClick={close}>
      <Layers3 size={23} strokeWidth={2} /><span>HoloStack<span className="brand-ai">AI</span></span>
    </Link>
    <button type="button" className="public-mobile-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="marketing-navigation" onClick={() => setOpen(value => !value)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
    <nav id="marketing-navigation" aria-label="Public navigation" className={open ? "open" : ""}>
      {links.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}
      <Link href="/login" onClick={close}>Log in</Link>
      <Link className="guest-nav-link" href="/guest" onClick={close}><UserRound size={15} />Continue as guest<ArrowRight size={14} /></Link>
      <Button asChild size="sm"><Link href="/signup" onClick={close}>Get started</Link></Button>
    </nav>
  </header>;
}
