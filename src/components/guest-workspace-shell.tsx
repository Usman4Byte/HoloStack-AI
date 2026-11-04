import Link from "next/link";
import { CircleHelp, Layers3, LayoutDashboard, Network, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestWorkspaceShell({ children, projectId }: { children: React.ReactNode; projectId?: string }) {
  return <div className="workspace-shell private-shell guest-shell">
    <aside className="sidebar">
      <Link href="/guest" className="brand" aria-label="HoloStack AI guest workspace"><span className="brand-icon"><Layers3 size={24} /></span><span>HoloStack<span className="brand-ai">AI</span></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar"><UserRound size={15} /></span><div>Guest workspace<small>This browser session</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Guest workspace navigation"><Link className={!projectId ? "nav-item active" : "nav-item"} href="/guest"><LayoutDashboard size={18} />Overview</Link><Link className="nav-item" href="/guest#saved-projects"><Network size={18} />Projects</Link><Link className={projectId ? "nav-item active" : "nav-item"} href={projectId ? `/guest/projects/${projectId}` : "/guest#saved-projects"}><Layers3 size={18} />Architecture studio</Link><Link className="nav-item" href="/guest#templates"><CircleHelp size={18} />Templates</Link><Link className="nav-item" href="/guest#workspace-guide"><CircleHelp size={18} />How to use HoloStack</Link></nav>
      <div className="guest-sidebar-note">Your work lives in this tab session. Create an account to keep it in TiDB across sessions.</div>
    </aside>
    <div className="workspace-content"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Guest</strong></div><div className="topbar-right"><Button asChild size="sm"><Link href="/signup">Save with an account</Link></Button><Link href="/login" className="text-link">Sign in</Link></div></header>{children}</div>
  </div>;
}
