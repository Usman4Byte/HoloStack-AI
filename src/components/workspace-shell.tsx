import Link from "next/link";
import { ArrowUpRight, Boxes, CircleHelp, Database, FlaskConical, Layers3, LayoutDashboard, Map, Network, Settings, Sparkles } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

export function WorkspaceShell({ children, active = "studio", user }: { children: React.ReactNode; active?: "studio" | "setup" | "dashboard" | "project" | "settings"; user?: { name: string; email: string; workspaceName: string } }) {
  return <div className="workspace-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="HoloStack AI home"><span className="brand-icon"><Layers3 size={24} /></span><span>HoloStack<span className="brand-ai">AI</span></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">{user ? user.name.charAt(0).toUpperCase() : "H"}</span><div>{user?.workspaceName ?? "Explore workspace"}<small>{user ? "Private · Database-backed" : "Local sample environment"}</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Workspace navigation">
        <Link className={active === "dashboard" || active === "studio" ? "nav-item active" : "nav-item"} href={user ? "/dashboard" : "/"}><LayoutDashboard size={18} />{user ? "Your projects" : "Overview"}<span className="nav-dot" /></Link>
        <Link className="nav-item" href="/#canvas"><Network size={18} />HoloCanvas<span className="small-tag">Sample</span></Link>
        <Link className="nav-item" href="/#templates"><Boxes size={18} />Template library<span className="nav-count">7</span></Link>
        <Link className={active === "setup" ? "nav-item active" : "nav-item"} href="/setup"><Database size={18} />Setup & connection</Link>
        {user && <Link className={active === "settings" ? "nav-item active" : "nav-item"} href="/settings"><Settings size={18} />Account settings</Link>}
      </nav>
      <div className="nav-label roadmap-label">ON THE ROADMAP</div>
      <div className="nav-item future"><FlaskConical size={18} />ScaleLab<span className="small-tag">M5</span></div>
      <Link className="nav-item" href={active === "project" ? "#ai-workbench" : user ? "/dashboard" : "/signup"}><Sparkles size={18} />AI Workbench<span className="small-tag">M4</span></Link>
      <div className="nav-item future"><Map size={18} />RepoLens<span className="small-tag">P1</span></div>
      <div className="sidebar-bottom"><div className="build-card"><span className="eyebrow">BUILD WITH INTENT</span><strong>Every great system<br />starts with a clear design.</strong><Link href={user ? "/dashboard" : "/signup"}>{user ? "Your workspace" : "Create your workspace"} <ArrowUpRight size={14} /></Link></div><div className="sidebar-footer"><CircleHelp size={16} /><span>Milestone 4 · Development</span></div></div>
    </aside>
    <div className="workspace-content"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{{ studio: "Overview", setup: "Setup", dashboard: "Projects", project: "HoloCanvas", settings: "Settings" }[active]}</strong></div><div className="topbar-right"><span className="environment"><span />{user ? "PRIVATE WORKSPACE" : "PUBLIC SAMPLE"}</span>{user ? <><Link href="/settings" className="profile-mark" aria-label="Account settings">{user.name.charAt(0).toUpperCase()}</Link><LogoutButton /></> : <><Link className="text-link" href="/login">Sign in</Link><Link className="button button-primary button-sm" href="/signup">Get started</Link></>}</div></header>{children}</div>
  </div>;
}
