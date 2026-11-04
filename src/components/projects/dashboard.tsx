"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, Copy, FolderKanban, Plus, Search, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { templates } from "@/domain/architecture/templates";
import type { ProjectSummary, ProjectDocument } from "@/domain/projects/schema";
import { requestJson } from "@/lib/api-client";

export function Dashboard({ name, listing, status, query }: { name: string; listing: { projects: ProjectSummary[]; total: number; page: number; pageSize: number }; status: string; query: string }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false), [templateId, setTemplateId] = useState("ai-saas");
  const [busy, setBusy] = useState<string | null>(null), [message, setMessage] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await requestJson<{ project: ProjectDocument }>("/api/projects", "POST", { name: data.get("name"), description: data.get("description"), templateId });
      router.push(`/projects/${result.project.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create project."); setBusy(null); }
  }
  async function action(project: ProjectSummary, kind: "duplicate" | "archived" | "deleted" | "active") {
    if (kind === "deleted" && !window.confirm(`Move “${project.name}” to Trash? You can restore it later.`)) return;
    setBusy(project.id); setMessage("");
    try {
      if (kind === "duplicate") {
        const result = await requestJson<{ project: ProjectDocument }>(`/api/projects/${project.id}/duplicate`, "POST", {});
        router.push(`/projects/${result.project.id}`);
      } else {
        await requestJson(`/api/projects/${project.id}`, kind === "deleted" ? "DELETE" : "PATCH", { revision: project.revision, ...(kind === "deleted" ? {} : { status: kind }) });
        setMessage(kind === "deleted" ? "Project moved to Trash." : kind === "archived" ? "Project archived." : "Project restored."); router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed."); }
    finally { setBusy(null); }
  }
  const pageUrl = (page: number) => `/dashboard?${new URLSearchParams({ status, q: query, page: String(page) })}`;
  return <main className="overview-main dashboard-main"><div className="page-heading"><div><span className="eyebrow">PERSONAL WORKSPACE</span><h1>Welcome back, <span>{name.split(" ")[0]}.</span></h1><p>Your systems, your decisions, one connected workspace.</p></div><Button onClick={() => setCreateOpen(value => !value)}><Plus size={16} />New project</Button></div>
    <section className="dashboard-banner"><div><span className="pill"><Sparkles size={13} /> FROM IDEA TO ARCHITECTURE</span><h2>Start with structure.<br /><span>Make it your own.</span></h2><p>Choose a blueprint, refine your design, and save it to your private workspace.</p></div><div className="banner-mark" aria-hidden="true"><FolderKanban size={84} strokeWidth={.7} /></div></section>
    {createOpen && <section className="create-panel" aria-label="New project"><div className="section-heading"><h2>Create a project</h2><button className="text-link" onClick={() => setCreateOpen(false)}>Cancel</button></div><form onSubmit={create} className="stack-form"><div className="two-fields"><label>Project name<input name="name" required maxLength={120} placeholder="My next great system" disabled={busy !== null} /></label><label>Starter blueprint<select value={templateId} onChange={event => setTemplateId(event.target.value)} disabled={busy !== null}>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label></div><label>Description<textarea name="description" maxLength={4000} rows={2} placeholder="What are you building?" disabled={busy !== null} /></label><p className="form-hint">Blueprints are locally authored and use zero AI requests. Open the project to explicitly request generation or architectural reasoning.</p><Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create project"}<ArrowRight size={15} /></Button></form></section>}
    <section className="saved-projects"><div className="section-heading"><div><h2>Your projects <span>{listing.total}</span></h2><p>Private to your workspace. Changes persist after you save.</p></div><form className="project-search" action="/dashboard"><input type="hidden" name="status" value={status} /><Search size={15} /><input aria-label="Search projects" name="q" defaultValue={query} maxLength={100} placeholder="Search projects…" /><button type="submit">Search</button></form></div><nav className="project-tabs" aria-label="Project status">{[["active", "Active"], ["archived", "Archived"], ["deleted", "Trash"]].map(([value, label]) => <Link key={value} href={`/dashboard?status=${value}`} aria-current={status === value ? "page" : undefined} className={status === value ? "selected" : ""}>{label}</Link>)}</nav>
    {message && <p className="action-message" role="status">{message}</p>}
    {listing.projects.length ? <div className="project-grid">{listing.projects.map(project => <article className="project-card" key={project.id}><Link href={`/projects/${project.id}`} className="project-card-main"><span className="project-symbol"><FolderKanban size={24} /></span><div className="project-card-label">{project.templateId.replaceAll("-", " ")} <span>v{project.revision}</span></div><h3>{project.name}</h3><p>{project.description || "A new system, ready for your ideas."}</p><span className="project-date">Updated {new Date(project.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</span></Link><div className="project-card-actions"><Link href={`/projects/${project.id}`}>Open project<ArrowRight size={13} /></Link>{project.status !== "deleted" && <button disabled={busy !== null} title="Duplicate project" aria-label={`Duplicate ${project.name}`} onClick={() => action(project, "duplicate")}><Copy size={15} /></button>}{project.status === "active" ? <button disabled={busy !== null} title="Archive project" aria-label={`Archive ${project.name}`} onClick={() => action(project, "archived")}><Archive size={15} /></button> : <button disabled={busy !== null} title="Restore project" aria-label={`Restore ${project.name}`} onClick={() => action(project, "active")}><Undo2 size={15} /></button>}{project.status !== "deleted" && <button disabled={busy !== null} title="Move to Trash" aria-label={`Move ${project.name} to Trash`} onClick={() => action(project, "deleted")}><Trash2 size={15} /></button>}</div></article>)}</div> : <div className="empty-projects"><FolderKanban size={36} /><h3>{query ? "No matching projects." : status === "deleted" ? "Your Trash is empty." : status === "archived" ? "Nothing archived yet." : "Your first system starts here."}</h3><p>{status === "active" ? "Create a project from a template, then shape it into your own design." : "Projects you move here remain private to your workspace."}</p>{status === "active" && <Button onClick={() => setCreateOpen(true)}><Plus size={15} />Create your first project</Button>}</div>}
    {listing.total > listing.pageSize && <div className="pagination">{listing.page > 1 ? <Link href={pageUrl(listing.page - 1)}>← Previous</Link> : <span />}<span>Page {listing.page} of {Math.ceil(listing.total / listing.pageSize)}</span>{listing.page * listing.pageSize < listing.total ? <Link href={pageUrl(listing.page + 1)}>Next →</Link> : <span />}</div>}
    </section><section className="dashboard-blueprints"><div className="section-heading"><div><h2>A head start for your next idea.</h2><p>Seven architecture patterns, with explicit assumptions.</p></div><Link href="/#templates" className="text-link">Explore samples<ArrowRight size={14} /></Link></div><div className="blueprint-strip">{templates.map(template => <button key={template.id} onClick={() => { setTemplateId(template.id); setCreateOpen(true); window.scrollTo({ top: 250, behavior: "smooth" }); }}><Sparkles size={16} /><span>{template.name}</span><Plus size={13} /></button>)}</div></section></main>;
}
