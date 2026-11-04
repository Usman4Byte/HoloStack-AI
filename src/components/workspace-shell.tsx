import Link from "next/link";
import { CircleHelp, Layers3, LayoutDashboard, Network, Settings } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

type WorkspaceSection = "setup" | "dashboard" | "project" | "settings";
type WorkspaceUser = { name: string; workspaceName: string };

export function WorkspaceShell({ children, active, user, projectId }: { children: React.ReactNode; active: WorkspaceSection; user: WorkspaceUser; projectId?: string }) {
  const projectsActive = active === "dashboard" || active === "project";
  const studioHref = projectId ? `/projects/${projectId}` : "/dashboard#saved-projects";
  return <div className="workspace-shell private-shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" aria-label="HoloStack AI workspace">
        <span className="brand-icon"><Layers3 size={24} /></span><span>HoloStack<span className="brand-ai">AI</span></span>
      </Link>
      <div className="workspace-switch"><span className="workspace-avatar">{user.name.charAt(0).toUpperCase()}</span><div>{user.workspaceName}<small>Private workspace</small></div></div>
      <div className="nav-label">DESIGN WORKSPACE</div>
      <nav aria-label="Workspace navigation">
        <Link className={active === "dashboard" ? "nav-item active" : "nav-item"} aria-current={active === "dashboard" ? "page" : undefined} href="/dashboard"><LayoutDashboard size={18} />Overview</Link>
        <Link className={active === "dashboard" ? "nav-item" : projectsActive ? "nav-item active" : "nav-item"} href="/dashboard#saved-projects"><Network size={18} />Projects</Link>
        <Link className={active === "project" ? "nav-item active" : "nav-item"} aria-current={active === "project" ? "page" : undefined} href={studioHref}><Layers3 size={18} />Architecture studio</Link>
        <Link className="nav-item" href="/dashboard#templates"><CircleHelp size={18} />Templates</Link>
        <Link className="nav-item" href="/dashboard#workspace-guide"><CircleHelp size={18} />How to use HoloStack</Link>
        <Link className={active === "settings" ? "nav-item active" : "nav-item"} aria-current={active === "settings" ? "page" : undefined} href="/settings"><Settings size={18} />Account settings</Link>
      </nav>
    </aside>
    <div className="workspace-content">
      <header className="topbar">
        <div className="breadcrumb">Workspace <span>/</span> <strong>{{ setup: "Setup", dashboard: "Projects", project: "Project", settings: "Settings" }[active]}</strong></div>
        <div className="topbar-right"><LogoutButton /></div>
      </header>
      {children}
    </div>
  </div>;
}
