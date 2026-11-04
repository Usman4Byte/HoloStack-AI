"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, RotateCcw } from "lucide-react";
import { Canvas } from "@/components/studio/sample-studio";
import { Button } from "@/components/ui/button";
import type { ProjectDocument } from "@/domain/projects/schema";
import type { Architecture } from "@/domain/architecture/schema";
import { RequestError, requestJson } from "@/lib/api-client";

export function ProjectEditor({ initial }: { initial: ProjectDocument }) {
  const [project, setProject] = useState(initial), [name, setName] = useState(initial.name), [description, setDescription] = useState(initial.description), [notes, setNotes] = useState(initial.notes);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false), [history, setHistory] = useState<{ revision: number; change: string; createdAt: string }[] | null>(null);
  const readOnly = project.status !== "active";
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest("a[href]");
      if (target && !target.getAttribute("href")?.startsWith("#") && !window.confirm("Leave without saving your project changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [dirty]);
  async function save(graph: Architecture) {
    setBusy(true); setMessage(""); setConflict(false);
    try {
      const result = await requestJson<{ project: ProjectDocument }>(`/api/projects/${project.id}`, "PATCH", { revision: project.revision, graph, name, description, notes });
      setProject(result.project); setDirty(false); setHistory(null); setMessage(`Saved to your workspace · Version ${result.project.revision}`);
    } catch (error) {
      setConflict(error instanceof RequestError && error.code === "REVISION_CONFLICT");
      setMessage(error instanceof Error ? error.message : "Save failed. Your changes are still in this tab.");
    } finally { setBusy(false); }
  }
  return <main className="overview-main project-editor"><Link className="text-link" href="/dashboard"><ArrowLeft size={14} />All projects</Link><div className="page-heading"><div><span className="eyebrow">PRIVATE DESIGN / VERSION {project.revision}</span><h1>{project.name}</h1><p>{readOnly ? `This project is ${project.status === "deleted" ? "in Trash" : "archived"}. Restore it from the dashboard to edit.` : "Explore the architecture. Keep your decisions connected to the design."}</p></div><span className={`save-status ${dirty ? "unsaved" : ""}`}><CheckCircle2 size={14} />{busy ? "Saving…" : dirty ? "Unsaved changes" : "Saved to workspace"}</span></div>
    {message && <div className={conflict ? "conflict-message" : "action-message"} role="status">{message}{conflict && <><p>Your edits are preserved here. Export JSON before reloading if you want to keep a copy.</p><Button variant="outline" size="sm" onClick={() => { if (window.confirm("Reload the latest saved project? Unsaved changes will be lost.")) { setDirty(false); window.location.reload(); } }}><RotateCcw size={14} />Reload latest</Button></>}</div>}
    <Canvas template={project.graph} onSave={save} saving={busy} readOnly={readOnly} onDirty={() => setDirty(true)} />
    <div className="project-details-grid"><section className="details-panel"><h2><FileText size={17} />Project details</h2><div className="stack-form"><label>Project name<input value={name} onChange={event => { setName(event.target.value); setDirty(true); }} maxLength={120} disabled={busy || readOnly} /></label><label>Description<textarea rows={3} value={description} onChange={event => { setDescription(event.target.value); setDirty(true); }} maxLength={4000} disabled={busy || readOnly} /></label><label>Engineering notes<textarea rows={5} value={notes} onChange={event => { setNotes(event.target.value); setDirty(true); }} maxLength={20000} disabled={busy || readOnly} placeholder="Decisions, open questions, and context worth keeping…" /></label><p className="form-hint">Use Save project above to save the diagram, details, and notes together.</p></div></section><section className="details-panel"><h2><Clock3 size={17} />Design context</h2><h3>Explicit assumptions</h3><ul className="assumptions-list">{project.graph.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul><div className="history-heading"><h3>Saved versions</h3><button className="text-link" onClick={async () => {
      try { const result = await requestJson<{ versions: NonNullable<typeof history> }>(`/api/projects/${project.id}/versions`); setHistory(result.versions); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Could not load versions."); }
    }}>View recent versions</button></div>{history && <ol className="version-list">{history.map(version => <li key={version.revision}><span>v{version.revision}</span><strong>{version.change.replace("status:", "Moved to ")}</strong><time>{new Date(version.createdAt).toLocaleString()}</time></li>)}</ol>}<p className="form-hint">Every save creates a snapshot. Comparison and restoration are planned for Milestone 5.</p></section></div>
  </main>;
}
