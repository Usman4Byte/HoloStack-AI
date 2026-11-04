"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, RotateCcw } from "lucide-react";
import { Canvas } from "@/components/studio/sample-studio";
import { AIWorkbench } from "@/components/ai/ai-workbench";
import { Button } from "@/components/ui/button";
import type { ProjectDocument } from "@/domain/projects/schema";
import type { Architecture } from "@/domain/architecture/schema";
import { RequestError, requestJson } from "@/lib/api-client";

type Draft = { graph: Architecture; name: string; description: string; notes: string; revision: number; sequence: number };

export function ProjectEditor({ initial }: { initial: ProjectDocument }) {
  const [project, setProject] = useState(initial);
  const [currentGraph, setCurrentGraph] = useState(initial.graph);
  const [approvedGraph, setApprovedGraph] = useState<{ graph: Architecture; sequence: number } | null>(null);
  const approvedSequence = useRef(0);
  const [name, setName] = useState(initial.name), [description, setDescription] = useState(initial.description), [notes, setNotes] = useState(initial.notes);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [graphValid, setGraphValid] = useState(true);
  const [conflict, setConflict] = useState(false), [history, setHistory] = useState<{ revision: number; change: string; createdAt: string }[] | null>(null);
  const [draftSequence, setDraftSequence] = useState(0), [retrySequence, setRetrySequence] = useState<number | null>(null);
  const readOnly = project.status !== "active";
  const latest = useRef<Draft>({ graph: initial.graph, name: initial.name, description: initial.description, notes: initial.notes, revision: initial.revision, sequence: 0 });
  const dirtyRef = useRef(false), inFlight = useRef(false), failedSequence = useRef<number | null>(null);
  const saveRef = useRef<(manualRetry?: boolean) => Promise<void>>(async () => {});

  const markDraft = useCallback((changes: Partial<Pick<Draft, "graph" | "name" | "description" | "notes">>) => {
    latest.current = { ...latest.current, ...changes, sequence: latest.current.sequence + 1 };
    dirtyRef.current = true; setDirty(true); setDraftSequence(latest.current.sequence);
    if (!conflict) setMessage("");
  }, [conflict]);
  const markDirty = useCallback(() => { dirtyRef.current = true; setDirty(true); }, []);
  const updateGraph = useCallback((graph: Architecture) => { setProject(current => ({ ...current, graph })); setCurrentGraph(graph); markDraft({ graph }); }, [markDraft]);

  const save = useCallback(async (manualRetry = false, candidate?: Architecture) => {
    if (readOnly || inFlight.current || !dirtyRef.current || !graphValid || conflict) return;
    if (candidate && JSON.stringify(candidate) !== JSON.stringify(latest.current.graph)) {
      latest.current = { ...latest.current, graph: candidate, sequence: latest.current.sequence + 1 };
      dirtyRef.current = true; setDirty(true); setDraftSequence(latest.current.sequence);
    }
    const draft = latest.current;
    if (!manualRetry && failedSequence.current === draft.sequence) return;
    inFlight.current = true; setBusy(true); setMessage("");
    const sentSequence = draft.sequence;
    try {
      const result = await requestJson<{ project: ProjectDocument }>(`/api/projects/${initial.id}`, "PATCH", { revision: draft.revision, graph: draft.graph, name: draft.name, description: draft.description, notes: draft.notes });
      latest.current.revision = result.project.revision;
      setProject(result.project); setHistory(null); failedSequence.current = null; setRetrySequence(null);
      if (latest.current.sequence === sentSequence) {
        dirtyRef.current = false; setDirty(false); setMessage(`Saved to your workspace · Version ${result.project.revision}`);
      } else setMessage("Saved this revision. Newer edits are being saved next.");
    } catch (error) {
      failedSequence.current = sentSequence; setRetrySequence(sentSequence);
      const isConflict = error instanceof RequestError && error.code === "REVISION_CONFLICT";
      setConflict(isConflict);
      setMessage(error instanceof Error ? error.message : "Save failed. Your edits remain in this tab.");
    } finally { inFlight.current = false; setBusy(false); }
  }, [conflict, graphValid, initial.id, readOnly]);
  useEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    if (!dirty || busy || readOnly || !graphValid || conflict || (retrySequence === draftSequence && failedSequence.current === draftSequence)) return;
    const timer = window.setTimeout(() => { void saveRef.current(); }, 850);
    return () => window.clearTimeout(timer);
  }, [busy, conflict, dirty, draftSequence, graphValid, readOnly, retrySequence]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest("a[href]");
      if (target && !target.getAttribute("href")?.startsWith("#") && !window.confirm("Leave while project changes are still unsaved?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [dirty]);

  function updateField(field: "name" | "description" | "notes", value: string) {
    if (field === "name") setName(value); else if (field === "description") setDescription(value); else setNotes(value);
    markDraft({ [field]: value });
  }
  async function loadHistory() {
    try { const result = await requestJson<{ versions: NonNullable<typeof history> }>(`/api/projects/${initial.id}/versions`); setHistory(result.versions); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not load versions."); }
  }

  return <main className="overview-main project-editor"><Link className="text-link" href="/dashboard"><ArrowLeft size={14} />All projects</Link><div className="page-heading"><div><span className="eyebrow">PRIVATE DESIGN / VERSION {project.revision}</span><h1>{name}</h1><p>{readOnly ? `This project is ${project.status === "deleted" ? "in Trash" : "archived"}. Restore it from the dashboard to edit.` : "Explore the architecture. Changes save automatically with revision checks."}</p></div><span className={`save-status ${dirty ? "unsaved" : ""}`} aria-live="polite"><CheckCircle2 size={14} />{busy ? "Saving…" : dirty ? "Draft changes" : "Saved to workspace"}</span></div>
    {message && <div className={conflict ? "conflict-message" : "action-message"} role="status">{message}{conflict && <><p>Your edits remain in this tab. Download the JSON draft before reloading if you need a portable copy.</p><Button variant="outline" size="sm" onClick={() => { if (window.confirm("Reload the latest saved project? Your local edits will be lost.")) window.location.reload(); }}><RotateCcw size={14} />Reload latest</Button></>}</div>}
    {dirty && <div className="autosave-hint" role="status">{!graphValid ? "Complete valid component fields to resume autosave." : busy ? "Saving your latest draft…" : "Autosave runs after 850 ms of inactivity."}{retrySequence !== null && !conflict && <Button variant="outline" size="sm" onClick={() => void save(true)}>Retry save</Button>}</div>}
    <AIWorkbench projectId={initial.id} graph={currentGraph} disabled={readOnly || !graphValid || conflict} onApply={graph => setApprovedGraph({ graph, sequence: ++approvedSequence.current })} />
    <Canvas template={initial.graph} incomingGraph={approvedGraph} onSave={graph => save(true, graph)} saving={busy} readOnly={readOnly} onDirty={markDirty} onChange={updateGraph} onValidationChange={setGraphValid} />
    <div className="project-details-grid"><section className="details-panel"><h2><FileText size={17} />Project details</h2><div className="stack-form"><label>Project name<input value={name} onChange={event => updateField("name", event.target.value)} maxLength={120} disabled={readOnly} /></label><label>Description<textarea rows={3} value={description} onChange={event => updateField("description", event.target.value)} maxLength={4000} disabled={readOnly} /></label><label>Engineering notes<textarea rows={5} value={notes} onChange={event => updateField("notes", event.target.value)} maxLength={20000} disabled={readOnly} placeholder="Decisions, open questions, and context worth keeping…" /></label><p className="form-hint">Diagram, project details, and notes are saved together after a short pause.</p></div></section><section className="details-panel"><h2><Clock3 size={17} />Design context</h2><h3>Explicit assumptions</h3><ul className="assumptions-list">{project.graph.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul><div className="history-heading"><h3>Saved versions</h3><button className="text-link" onClick={() => void loadHistory()}>View recent versions</button></div>{history && <ol className="version-list">{history.map(version => <li key={version.revision}><span>v{version.revision}</span><strong>{version.change.replace("status:", "Moved to ")}</strong><time>{new Date(version.createdAt).toLocaleString()}</time></li>)}</ol>}<p className="form-hint">Every autosave creates a snapshot. Comparison and restoration are planned for Milestone 5.</p></section></div>
  </main>;
}
