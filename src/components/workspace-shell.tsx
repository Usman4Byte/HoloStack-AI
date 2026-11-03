import Link from "next/link";
import { ArrowUpRight, Boxes, CircleHelp, Database, FlaskConical, Layers3, LayoutDashboard, Map, Network, Sparkles } from "lucide-react";

export function WorkspaceShell({ children, active = "studio" }: { children: React.ReactNode; active?: "studio" | "setup" }) {
  return <div className="workspace-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="HoloStack AI home"><span className="brand-icon"><Layers3 size={24} /></span><span>HoloStack<span className="brand-ai">AI</span></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">H</span><div>Explore workspace<small>Local sample environment</small></div><span className="muted">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Workspace navigation">
        <Link className={active === "studio" ? "nav-item active" : "nav-item"} href="/"><LayoutDashboard size={18} />Overview<span className="nav-dot" /></Link>
        <Link className="nav-item" href="/#canvas"><Network size={18} />HoloCanvas<span className="small-tag">Sample</span></Link>
        <Link className="nav-item" href="/#templates"><Boxes size={18} />Template library<span className="nav-count">7</span></Link>
        <Link className={active === "setup" ? "nav-item active" : "nav-item"} href="/setup"><Database size={18} />Setup & connection</Link>
      </nav>
      <div className="nav-label roadmap-label">ON THE ROADMAP</div>
      <div className="nav-item future"><FlaskConical size={18} />ScaleLab<span className="small-tag">M5</span></div>
      <div className="nav-item future"><Sparkles size={18} />AI Copilot<span className="small-tag">M4</span></div>
      <div className="nav-item future"><Map size={18} />RepoLens<span className="small-tag">P1</span></div>
      <div className="sidebar-bottom"><div className="build-card"><span className="eyebrow">BUILDING THE FOUNDATION</span><strong>Every great system<br />starts with a clear design.</strong><Link href="/setup">View setup guide <ArrowUpRight size={14} /></Link></div><div className="sidebar-footer"><CircleHelp size={16} /><span>Milestone 1 · Development</span></div></div>
    </aside>
    <div className="workspace-content"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{active === "studio" ? "Overview" : "Setup"}</strong></div><div className="topbar-right"><span className="environment"><span />LOCAL SAMPLE</span><a href="/setup" className="icon-link" aria-label="Setup help"><CircleHelp size={18} /></a><span className="profile-mark" aria-label="Sample workspace, not signed in">H</span></div></header>{children}</div>
  </div>;
}
