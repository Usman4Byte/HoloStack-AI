"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, FlaskConical, Network, RotateCcw, Sparkles } from "lucide-react";
import { Canvas, CanvasGuide } from "@/components/studio/architecture-canvas";
import { AIWorkbench } from "@/components/ai/ai-workbench";
import { IntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ProjectDocument } from "@/domain/projects/schema";
import type { Architecture } from "@/domain/architecture/schema";
import { RequestError, requestJson } from "@/lib/api-client";
import { GuestStorageError, listGuestVersions, updateGuestProject } from "@/domain/projects/guest-store";
import { architectureDiff } from "@/domain/ai/architecture";

type Draft = { graph: Architecture; name: string; description: string; notes: string; revision: number; sequence: number };
const sections = [
  { id: "canvas", label: "Canvas", hint: "Draw and edit", icon: Network },
  { id: "review", label: "Scale & review", hint: "Estimate traffic and risks", icon: FlaskConical },
  { id: "assistant", label: "AI assistant", hint: "Generate, ask, or optimize", icon: Sparkles },
  { id: "details", label: "Details & history", hint: "Notes and saved versions", icon: Clock3 },
] as const;
type ProjectSection = (typeof sections)[number]["id"];

export function ProjectEditor({ initial, guestMode = false }: { initial: ProjectDocument; guestMode?: boolean }) {
  const [project, setProject] = useState(initial);
  const [section, setSection] = useState<ProjectSection>("canvas");
  const [visited, setVisited] = useState<ProjectSection[]>(["canvas"]);
  const [currentGraph, setCurrentGraph] = useState(initial.graph);
  const [approvedGraph, setApprovedGraph] = useState<{ graph: Architecture; sequence: number } | null>(null);
  const approvedSequence = useRef(0);
  const [name, setName] = useState(initial.name), [description, setDescription] = useState(initial.description), [notes, setNotes] = useState(initial.notes);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [graphValid, setGraphValid] = useState(true);
  const [conflict, setConflict] = useState(false), [history, setHistory] = useState<{ revision: number; change: string; createdAt: string }[] | null>(null);
  const [comparison, setComparison] = useState<{ fromRevision: number; toRevision: number; graph: { addedNodes: { label: string }[]; removedNodes: { label: string }[]; modifiedNodes: { label: string }[]; addedEdges: unknown[]; removedEdges: unknown[] }; fields: { nameChanged: boolean; descriptionChanged: boolean; notesChanged: boolean } } | null>(null);
  const [draftSequence, setDraftSequence] = useState(0), [retrySequence, setRetrySequence] = useState<number | null>(null);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null), [pendingRestore, setPendingRestore] = useState<number | null>(null), [confirmReload, setConfirmReload] = useState(false);
  const readOnly = project.status !== "active";
  const latest = useRef<Draft>({ graph: initial.graph, name: initial.name, description: initial.description, notes: initial.notes, revision: initial.revision, sequence: 0 });
  const dirtyRef = useRef(false), inFlight = useRef(false), failedSequence = useRef<number | null>(null);
  const saveRef = useRef<(manualRetry?: boolean) => Promise<void>>(async () => {});
  const navigation = useRef<HTMLElement>(null);
  const allowLeave = useRef(false);

  function openSection(next: ProjectSection) {
    setSection(next);
    setVisited(current => current.includes(next) ? current : [...current, next]);
  }

  function applyCandidate(graph: Architecture) {
    setApprovedGraph({ graph, sequence: ++approvedSequence.current });
    openSection("canvas");
    requestAnimationFrame(() => navigation.current?.querySelector("button")?.focus());
  }

  const markDraft = useCallback((changes: Partial<Pick<Draft, "graph" | "name" | "description" | "notes">>) => {
    latest.current = { ...latest.current, ...changes, sequence: latest.current.sequence + 1 };
    if (guestMode) {
      try {
        const saved = updateGuestProject(initial.id, latest.current.revision, changes, "Guest session autosave");
        latest.current.revision = saved.revision;
        latest.current.name = saved.name; latest.current.description = saved.description; latest.current.notes = saved.notes; latest.current.graph = saved.graph;
        setProject(saved); dirtyRef.current = false; setDirty(false); setBusy(false); setMessage("Saved in this browser session");
      } catch (error) { setMessage(error instanceof GuestStorageError ? error.message : "This guest change could not be saved in this browser session."); }
      return;
    }
    dirtyRef.current = true; setDirty(true); setDraftSequence(latest.current.sequence);
    if (!conflict) setMessage("");
  }, [conflict, guestMode, initial.id]);
  const markDirty = useCallback(() => { if (guestMode) return; dirtyRef.current = true; setDirty(true); }, [guestMode]);
  const updateGraph = useCallback((graph: Architecture) => { setProject(current => ({ ...current, graph })); setCurrentGraph(graph); markDraft({ graph }); }, [markDraft]);

  const save = useCallback(async (manualRetry = false, candidate?: Architecture) => {
    if (readOnly || inFlight.current || !dirtyRef.current || !graphValid || conflict) return;
    if (candidate && JSON.stringify(candidate) !== JSON.stringify(latest.current.graph)) {
      latest.current = { ...latest.current, graph: candidate, sequence: latest.current.sequence + 1 };
      dirtyRef.current = true; setDirty(true); setDraftSequence(latest.current.sequence);
    }
    const draft = latest.current;
    if (guestMode) {
      try {
        const saved = updateGuestProject(initial.id, draft.revision, { graph: draft.graph, name: draft.name, description: draft.description, notes: draft.notes }, "Saved guest draft");
        latest.current.revision = saved.revision; setProject(saved); dirtyRef.current = false; setDirty(false); setBusy(false); setMessage("Saved in this browser session");
      } catch (error) { setMessage(error instanceof GuestStorageError ? error.message : "Guest save failed."); }
      return;
    }
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
  }, [conflict, graphValid, guestMode, initial.id, readOnly]);
  useEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    if (guestMode || !dirty || busy || readOnly || !graphValid || conflict || (retrySequence === draftSequence && failedSequence.current === draftSequence)) return;
    const timer = window.setTimeout(() => { void saveRef.current(); }, 850);
    return () => window.clearTimeout(timer);
  }, [busy, conflict, dirty, draftSequence, graphValid, guestMode, readOnly, retrySequence]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (allowLeave.current) return; event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest("a[href]");
      if (target && !target.getAttribute("href")?.startsWith("#") && !allowLeave.current) { event.preventDefault(); event.stopPropagation(); setPendingLeave((target as HTMLAnchorElement).href); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [dirty]);

  function updateField(field: "name" | "description" | "notes", value: string) {
    if (field === "name") setName(value); else if (field === "description") setDescription(value); else setNotes(value);
    markDraft({ [field]: value });
  }
  async function loadHistory() {
    try {
      if (guestMode) setHistory(listGuestVersions(initial.id).map(item => ({ revision: item.revision, change: item.change, createdAt: item.createdAt })));
      else { const result = await requestJson<{ versions: NonNullable<typeof history> }>(`/api/projects/${initial.id}/versions`); setHistory(result.versions); }
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not load versions."); }
  }
  async function compareVersion(revision: number) {
    try {
      if (guestMode) {
        const version = listGuestVersions(initial.id).find(item => item.revision === revision);
        if (!version) throw new Error("That session version is no longer available.");
        const diff = architectureDiff(version.project.graph, currentGraph);
        setComparison({ fromRevision: revision, toRevision: project.revision, graph: { addedNodes: diff.addedNodes, removedNodes: diff.removedNodes, modifiedNodes: diff.modifiedNodes, addedEdges: diff.addedEdges, removedEdges: diff.removedEdges }, fields: { nameChanged: version.project.name !== name, descriptionChanged: version.project.description !== description, notesChanged: version.project.notes !== notes } });
      } else { const result = await requestJson<{ comparison: NonNullable<typeof comparison> }>(`/api/projects/${initial.id}/versions/compare?revision=${revision}`); setComparison(result.comparison); }
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not compare versions."); }
  }
  async function restoreVersion(revision: number, confirmed = false) {
    if (dirty) return;
    if (!confirmed) { setPendingRestore(revision); return; }
    try {
      if (guestMode) {
        const version = listGuestVersions(initial.id).find(item => item.revision === revision);
        if (!version) throw new Error("That session version is no longer available.");
        const restored = updateGuestProject(initial.id, project.revision, { graph: version.project.graph, name: version.project.name, description: version.project.description, notes: version.project.notes }, `Restored version ${revision}`);
        latest.current = { graph: restored.graph, name: restored.name, description: restored.description, notes: restored.notes, revision: restored.revision, sequence: latest.current.sequence + 1 };
        window.location.reload(); return;
      }
      const result = await requestJson<{ project: ProjectDocument }>(`/api/projects/${initial.id}/versions/${revision}/restore`, "POST", { expectedRevision: project.revision });
      latest.current = { graph: result.project.graph, name: result.project.name, description: result.project.description, notes: result.project.notes, revision: result.project.revision, sequence: latest.current.sequence + 1 };
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restore this version."); }
  }

  return <main className="overview-main project-editor"><Link className="text-link" href={guestMode ? "/guest" : "/dashboard"}><ArrowLeft size={14} />All projects</Link><div className="page-heading"><div><span className="eyebrow">{guestMode ? "GUEST SESSION PROJECT" : "PRIVATE PROJECT"} · VERSION {project.revision}</span><h1>{name || "Untitled project"}</h1><p>{readOnly ? `This project is ${project.status === "deleted" ? "in Trash" : "archived"}. Restore it from Projects to edit.` : "Work on your diagram, review the design, or ask AI for help."}</p></div><span className={`save-status ${dirty ? "unsaved" : ""}`} aria-live="polite"><CheckCircle2 size={14} />{busy ? "Saving…" : dirty ? "Draft changes" : guestMode ? "Saved in browser session" : "Saved to workspace"}</span></div>
    {message && <div className={conflict ? "conflict-message" : "action-message"} role="status">{message}{conflict && <><p>Your edits remain in this tab. Download the JSON draft before reloading if you need a portable copy.</p><Button variant="outline" size="sm" onClick={() => setConfirmReload(true)}><RotateCcw size={14} />Reload latest</Button></>}</div>}
    {dirty && <div className="autosave-hint" role="status">{!graphValid ? "Correct the diagram fields to resume autosave." : busy ? "Saving your latest changes…" : "Changes save after a short pause."}{retrySequence !== null && !conflict && <Button variant="outline" size="sm" onClick={() => void save(true)}>Retry save</Button>}</div>}
    <nav ref={navigation} className="project-sections" aria-label="Project tools">
      {sections.map(({ id, icon: Icon, label, hint }) => <button type="button" key={id} aria-label={label} aria-pressed={section === id} onClick={() => openSection(id)}>
        <Icon size={19} /><span><strong>{label}</strong><small>{hint}</small></span>
      </button>)}
    </nav>
    <section hidden={section !== "canvas"} aria-label="Canvas">
      {!readOnly && <CanvasGuide />}
      <Canvas template={initial.graph} incomingGraph={approvedGraph} onSave={guestMode ? undefined : graph => save(true, graph)} saving={busy} readOnly={readOnly} onDirty={markDirty} onChange={updateGraph} onValidationChange={setGraphValid} />
    </section>
    {visited.includes("review") && <div hidden={section !== "review"}><IntelligencePanel projectId={initial.id} revision={project.revision} graph={currentGraph} readOnly={readOnly} guestMode={guestMode} /></div>}
    {visited.includes("assistant") && <div hidden={section !== "assistant"}><AIWorkbench projectId={initial.id} graph={currentGraph} disabled={readOnly || !graphValid || conflict} onApply={applyCandidate} guestMode={guestMode} /></div>}
    <div hidden={section !== "details"}>
      <div className="project-details-grid"><section className="details-panel"><h2><FileText size={17} />Project details</h2><div className="stack-form"><label>Project name<input value={name} onChange={event => updateField("name", event.target.value)} maxLength={120} disabled={readOnly} /></label><label>Description<textarea rows={3} value={description} onChange={event => updateField("description", event.target.value)} maxLength={4000} disabled={readOnly} /></label><label>Engineering notes<textarea rows={5} value={notes} onChange={event => updateField("notes", event.target.value)} maxLength={20000} disabled={readOnly} placeholder="Decisions, open questions, and context worth keeping…" /></label><p className="form-hint">Diagram, project details, and notes are saved together after a short pause.</p></div></section><section className="details-panel"><h2><Clock3 size={17} />Design context</h2><h3>Assumptions</h3>{currentGraph.assumptions.length ? <ul className="assumptions-list">{currentGraph.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul> : <p className="form-hint">Record your design assumptions in Engineering notes.</p>}<div className="history-heading"><h3>Saved versions</h3><button className="text-link" onClick={() => void loadHistory()}>View recent versions</button></div>{history && <ol className="version-list">{history.map(version => <li key={version.revision}><span>v{version.revision}</span><strong>{version.change.replace("status:", "Moved to ")}</strong><time>{new Date(version.createdAt).toLocaleString()}</time><button type="button" className="history-action" onClick={() => void compareVersion(version.revision)}>Compare</button><button type="button" className="history-action" disabled={readOnly || version.revision === project.revision || dirty} onClick={() => void restoreVersion(version.revision)}>Restore</button></li>)}</ol>}{comparison && <div className="history-diff" role="status"><strong>Version {comparison.fromRevision} → current v{comparison.toRevision}</strong><span>Nodes +{comparison.graph.addedNodes.length} / −{comparison.graph.removedNodes.length} / changed {comparison.graph.modifiedNodes.length}</span><span>Connections +{comparison.graph.addedEdges.length} / −{comparison.graph.removedEdges.length}</span><span>Project fields changed: {[comparison.fields.nameChanged && "name", comparison.fields.descriptionChanged && "description", comparison.fields.notesChanged && "notes"].filter(Boolean).join(", ") || "none"}</span></div>}<p className="form-hint">Restoring a version keeps the current one in history.</p></section></div>
    </div>
    <ConfirmDialog open={pendingLeave !== null} title="Leave with unsaved changes?" description="Your latest project edits have not been saved. If you leave now, those changes may be lost." confirmLabel="Leave page" destructive onCancel={() => setPendingLeave(null)} onConfirm={() => { const href = pendingLeave; setPendingLeave(null); allowLeave.current = true; if (href) window.location.assign(href); }} />
    <ConfirmDialog open={pendingRestore !== null} title="Restore this version?" description={`Version ${pendingRestore ?? ""} will become a new current version. Your existing history will remain available.`} confirmLabel="Restore version" onCancel={() => setPendingRestore(null)} onConfirm={() => { const revision = pendingRestore; setPendingRestore(null); if (revision !== null) void restoreVersion(revision, true); }} />
    <ConfirmDialog open={confirmReload} title="Reload the latest saved project?" description="The draft in this tab will be discarded and the latest saved revision will load." confirmLabel="Reload project" destructive onCancel={() => setConfirmReload(false)} onConfirm={() => { setConfirmReload(false); allowLeave.current = true; window.location.reload(); }} />
  </main>;
}
