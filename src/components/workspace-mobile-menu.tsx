"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function WorkspaceMobileMenu({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return <div className="workspace-navigation">
    <button className="workspace-menu-toggle" type="button" aria-expanded={open} aria-controls="workspace-menu-links" onClick={() => setOpen(value => !value)}>
      <span className="workspace-menu-icon" aria-hidden="true">{open ? <X size={18} /> : <Menu size={18} />}</span>
      <span>{open ? "Close menu" : "Menu"}</span>
    </button>
    <nav id="workspace-menu-links" aria-label={label} className={open ? "workspace-menu-links open" : "workspace-menu-links"} onClick={() => setOpen(false)}>
      {children}
    </nav>
  </div>;
}
