"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, Copy, FolderKanban, Plus, Search, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { scratchTemplate, templates } from "@/domain/architecture/templates";
import type { ProjectSummary, ProjectDocument } from "@/domain/projects/schema";
import { requestJson } from "@/lib/api-client";
import { createGuestProject, duplicateGuestProject, GuestStorageError, getGuestServerSnapshot, getGuestSnapshot, readGuestWorkspace, subscribeGuest, updateGuestProject } from "@/domain/projects/guest-store";

export function Dashboard({ name, listing, status, query, guestMode = false, defaultTemplateId }: { name: string; listing: { projects: ProjectSummary[]; total: number; page: number; pageSize: number }; status: string; query: string; guestMode?: boolean; defaultTemplateId?: string }) {
  const router = useRouter();
  const guestSnapshot = useSyncExternalStore(subscribeGuest, getGuestSnapshot, getGuestServerSnapshot);
  const [createOpen, setCreateOpen] = useState(Boolean(defaultTemplateId)), [templateId, setTemplateId] = useState(() => defaultTemplateId && [scratchTemplate, ...templates].some(template => template.id === defaultTemplateId) ? defaultTemplateId : templates[0].id);
  const [busy, setBusy] = useState<string | null>(null), [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProjectSummary | null>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const selectedTemplate = [scratchTemplate, ...templates].find(template => template.id === templateId);
  useEffect(() => { if (defaultTemplateId) requestAnimationFrame(() => nameField.current?.focus()); }, [defaultTemplateId]);
  const guestData = useMemo(() => {
    if (!guestMode || guestSnapshot === "__server__" || !guestSnapshot) return { projects: [] as ProjectSummary[], error: "" };
    try {
      const projects = readGuestWorkspace().projects.filter(project => project.status === status && (!query || `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase())));
      return { projects, error: "" };
    } catch (error) { return { projects: [] as ProjectSummary[], error: error instanceof GuestStorageError ? error.message : "Could not load this browser session." }; }
  }, [guestMode, guestSnapshot, query, status]);
  const visibleProjects = guestMode ? guestData.projects : listing.projects;
  const totalProjects = guestMode ? guestData.projects.length : listing.total;

  function openCreate(id = templates[0].id) {
    setTemplateId(id);
    setCreateOpen(true);
    requestAnimationFrame(() => nameField.current?.focus());
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      if (guestMode) {
        const project = createGuestProject({ name: String(data.get("name") ?? ""), description: String(data.get("description") ?? ""), templateId });
        router.push(`/guest/projects/${project.id}`);
      } else {
        const result = await requestJson<{ project: ProjectDocument }>("/api/projects", "POST", { name: data.get("name"), description: data.get("description"), templateId });
        router.push(`/projects/${result.project.id}`);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create project."); setBusy(null); }
  }
  async function action(project: ProjectSummary, kind: "duplicate" | "archived" | "deleted" | "active", confirmed = false) {
    if (kind === "deleted" && !confirmed) { setConfirmDelete(project); return; }
    setBusy(project.id); setMessage("");
    try {
      if (kind === "duplicate") {
        if (guestMode) {
          const result = duplicateGuestProject(project.id);
          router.push(`/guest/projects/${result.id}`);
        } else {
          const result = await requestJson<{ project: ProjectDocument }>(`/api/projects/${project.id}/duplicate`, "POST", {});
          router.push(`/projects/${result.project.id}`);
        }
      } else {
        if (guestMode) updateGuestProject(project.id, project.revision, { status: kind }, kind === "deleted" ? "Moved to Trash" : kind === "archived" ? "Archived project" : "Restored project");
        else await requestJson(`/api/projects/${project.id}`, kind === "deleted" ? "DELETE" : "PATCH", { revision: project.revision, ...(kind === "deleted" ? {} : { status: kind }) });
        setMessage(kind === "deleted" ? "Project moved to Trash." : kind === "archived" ? "Project archived." : "Project restored."); if (!guestMode) router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed."); }
    finally { setBusy(null); }
  }
  const rootPath = guestMode ? "/guest" : "/dashboard";
  const projectPath = (id: string) => guestMode ? `/guest/projects/${id}` : `/projects/${id}`;
  const pageUrl = (page: number) => `${rootPath}?${new URLSearchParams({ status, q: query, page: String(page) })}`;
  return <main className="overview-main dashboard-main"><div className="page-heading"><div><span className="eyebrow">{guestMode ? "GUEST WORKSPACE · THIS BROWSER SESSION" : "YOUR PRIVATE WORKSPACE"}</span><h1>{guestMode ? <>Welcome to your <span>workspace.</span></> : <>Welcome back, <span>{name.split(" ")[0]}.</span></>}</h1><p>{guestMode ? "Your projects save in this browser tab session and are cleared when it ends." : "Create a project to start designing, or open a project to continue."}</p></div><Button aria-expanded={createOpen} onClick={() => openCreate()}><Plus size={16} />New project</Button></div>
    {guestMode && <div className="action-message guest-storage-notice" role="status">Guest data stays in this tab’s browser session. Sign in or create an account to keep projects in your workspace across visits. <Link href="/signup">Create an account</Link></div>}
    {createOpen && <section className="create-panel" aria-label="New project">
      <div className="section-heading"><div><h2>Create a project</h2><p>Give your project a name and choose how to begin.</p></div><button className="text-link" onClick={() => setCreateOpen(false)}>Cancel</button></div>
      <form onSubmit={create} className="stack-form">
        <div className="two-fields"><label>Project name<input ref={nameField} name="name" required maxLength={120} placeholder="My app architecture" disabled={busy !== null} /></label>
          <label>Starting point<select value={templateId} onChange={event => setTemplateId(event.target.value)} disabled={busy !== null}>{[scratchTemplate, ...templates].map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label></div>
        <p className="form-hint">{selectedTemplate?.description}</p>
        <label>Description <small>(optional)</small><textarea aria-label="Description" name="description" maxLength={4000} rows={2} placeholder="What are you building?" disabled={busy !== null} /></label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create project"}<ArrowRight size={15} /></Button>
      </form>
    </section>}
    <section className="saved-projects" id="saved-projects"><div className="section-heading"><div><h2>Your projects <span>{totalProjects}</span></h2><p>{guestMode ? "Saved only in this browser session." : "Private to your workspace. Changes persist after you save."}</p></div><form className="project-search" action={rootPath}><input type="hidden" name="status" value={status} /><Search size={15} /><input aria-label="Search projects" name="q" defaultValue={query} maxLength={100} placeholder="Search projects…" /><button type="submit">Search</button></form></div><nav className="project-tabs" aria-label="Project status">{[["active", "Active"], ["archived", "Archived"], ["deleted", "Trash"]].map(([value, label]) => <Link key={value} href={`${rootPath}?status=${value}`} aria-current={status === value ? "page" : undefined} className={status === value ? "selected" : ""}>{label}</Link>)}</nav>
    {message && !createOpen && <p className="action-message" role="status">{message}</p>}
    {guestData.error && guestMode && <p className="form-error" role="alert">{guestData.error} Reloading will not overwrite the session data.</p>}
    {visibleProjects.length ? <div className="project-grid">{visibleProjects.map(project => <article className="project-card" key={project.id}><Link href={projectPath(project.id)} className="project-card-main"><span className="project-symbol"><FolderKanban size={24} /></span><div className="project-card-label">{project.templateId.replaceAll("-", " ")} <span>v{project.revision}</span></div><h3>{project.name}</h3><p>{project.description || "A new system, ready for your ideas."}</p><span className="project-date">Updated {new Date(project.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</span></Link><div className="project-card-actions"><Link href={projectPath(project.id)}>Open project<ArrowRight size={13} /></Link>{project.status !== "deleted" && <button disabled={busy !== null} title="Duplicate project" aria-label={`Duplicate ${project.name}`} onClick={() => action(project, "duplicate")}><Copy size={15} /></button>}{project.status === "active" ? <button disabled={busy !== null} title="Archive project" aria-label={`Archive ${project.name}`} onClick={() => action(project, "archived")}><Archive size={15} /></button> : <button disabled={busy !== null} title="Restore project" aria-label={`Restore ${project.name}`} onClick={() => action(project, "active")}><Undo2 size={15} /></button>}{project.status !== "deleted" && <button disabled={busy !== null} title="Move to Trash" aria-label={`Move ${project.name} to Trash`} onClick={() => action(project, "deleted")}><Trash2 size={15} /></button>}</div></article>)}</div> : <div className="empty-projects"><FolderKanban size={36} /><h3>{guestData.error ? "Your guest workspace could not be read." : query ? "No matching projects." : status === "deleted" ? "Your Trash is empty." : status === "archived" ? "Nothing archived yet." : "Your first system starts here."}</h3><p>{guestMode ? "Create a project from a template, then shape it into your own design." : status === "active" ? "Create a project from a template, then shape it into your own design." : "Projects you move here remain private to your workspace."}</p>{status === "active" && !guestData.error && <Button onClick={() => setCreateOpen(true)}><Plus size={15} />Create your first project</Button>}</div>}
    {listing.total > listing.pageSize && <div className="pagination">{listing.page > 1 ? <Link href={pageUrl(listing.page - 1)}>← Previous</Link> : <span />}<span>Page {listing.page} of {Math.ceil(listing.total / listing.pageSize)}</span>{listing.page * listing.pageSize < listing.total ? <Link href={pageUrl(listing.page + 1)}>Next →</Link> : <span />}</div>}
    </section>
    <section className="workspace-guide" id="workspace-guide" aria-labelledby="workspace-guide-title">
      <h2 id="workspace-guide-title">How to use HoloStack</h2>
      <ol className="workflow-steps">
        <li><span className="workflow-number">STEP 1</span><h3>Create a project</h3><p>Choose <strong>New project</strong> and pick a template or start from scratch.</p></li>
        <li><span className="workflow-number">STEP 2</span><h3>Customize your canvas</h3><p>Add components and connect them. Select a component to edit its settings. Changes save automatically.</p></li>
        <li><span className="workflow-number">STEP 3</span><h3>Review and improve</h3><p>Use <strong>Scale &amp; review</strong> for traffic estimates, <strong>AI assistant</strong> for suggestions, and <strong>Details &amp; history</strong> for saved versions.</p></li>
      </ol>
    </section>
    <section className="dashboard-blueprints" id="templates"><div className="section-heading"><div><h2>Start with a template</h2><p>Choose a starting design and make it your own.</p></div></div><div className="blueprint-strip">{templates.map(template => <button key={template.id} onClick={() => openCreate(template.id)}><Sparkles size={16} /><span>{template.name}</span><Plus size={13} /></button>)}</div></section>
    <ConfirmDialog open={confirmDelete !== null} title="Move this project to Trash?" description={confirmDelete ? `“${confirmDelete.name}” will leave your active projects. You can restore it from Trash later.` : "The project will leave your active projects."} confirmLabel="Move to Trash" destructive onCancel={() => setConfirmDelete(null)} onConfirm={() => { const project = confirmDelete; setConfirmDelete(null); if (project) void action(project, "deleted", true); }} />
  </main>;
}
