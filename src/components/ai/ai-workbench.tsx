"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, MessageSquareText, Network, RotateCcw, Sparkles, WandSparkles, X } from "lucide-react";
import type { Architecture } from "@/domain/architecture/schema";
import { architectureSvg } from "@/domain/architecture/studio";
import { architectureDiff } from "@/domain/ai/architecture";
import { RequestError, requestJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Mode = "generate" | "copilot" | "optimize";
type Intent = "ask" | "change";
type Status = { enabled: boolean; configured: boolean; model: string | null; message: string | null; limits: { perUser: number; global: number }; user: { used: number; remaining: number }; application: { used: number; remaining: number }; resetsAt: string };
type Candidate = { graph: Architecture; tradeoffs: string[]; artifactId?: string };
type AssistantResult = { answer: string; changes: { operation: string; targetId: string }[]; tradeoffs: string[]; candidate: Architecture | null; model: string; artifactId?: string };
type SavedArtifact =
  | { id: string; kind: "generation"; payload: Candidate; createdAt: string }
  | { id: string; kind: "proposal"; payload: Omit<AssistantResult, "model" | "artifactId"> & { mode: "change" | "optimize" }; createdAt: string };

export function AIWorkbench({ projectId, graph, disabled, onApply }: { projectId: string; graph: Architecture; disabled: boolean; onApply: (graph: Architecture) => void }) {
  const [mode, setMode] = useState<Mode>("generate");
  const [intent, setIntent] = useState<Intent>("ask");
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState("");
  const [requirements, setRequirements] = useState("");
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("scalability");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providerVerified, setProviderVerified] = useState(false);
  const [notice, setNotice] = useState("");
  const [generation, setGeneration] = useState<Candidate | null>(null);
  const [proposal, setProposal] = useState<AssistantResult | null>(null);
  const [conversation, setConversation] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [artifacts, setArtifacts] = useState<SavedArtifact[]>([]);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await requestJson<Status>("/api/ai/status")); setStatusError(""); }
    catch (error) { setStatusError(error instanceof Error ? error.message : "AI usage status is unavailable."); }
  }, []);
  const refreshArtifacts = useCallback(async () => {
    const result = await requestJson<{ artifacts: SavedArtifact[] }>(`/api/ai/artifacts?projectId=${encodeURIComponent(projectId)}`);
    setArtifacts(result.artifacts);
  }, [projectId]);
  useEffect(() => {
    let active = true;
    requestJson<Status>("/api/ai/status").then(value => { if (active) { setStatus(value); setStatusError(""); } })
      .catch(error => { if (active) setStatusError(error instanceof Error ? error.message : "AI usage status is unavailable."); });
    requestJson<{ messages: { role: "user" | "assistant"; content: string }[] }>(`/api/ai/conversation?projectId=${encodeURIComponent(projectId)}`)
      .then(value => { if (active) setConversation(value.messages); })
      .catch(() => { if (active) setConversation([]); });
    requestJson<{ artifacts: SavedArtifact[] }>(`/api/ai/artifacts?projectId=${encodeURIComponent(projectId)}`)
      .then(value => { if (active) setArtifacts(value.artifacts); })
      .catch(() => { if (active) setArtifacts([]); });
    return () => { active = false; };
  }, [projectId]);

  const errorMessage = (error: unknown) => error instanceof RequestError ? error.message : error instanceof Error ? error.message : "The AI request could not be completed.";
  const canRequest = !disabled && Boolean(status?.enabled && status.user.remaining && status.application.remaining && consent && !busy);
  const candidateGraph = generation?.graph ?? proposal?.candidate ?? null;
  const diff = candidateGraph ? architectureDiff(graph, candidateGraph) : null;

  async function generate(event: React.FormEvent) {
    event.preventDefault(); if (!canRequest) return;
    setBusy(true); setNotice(""); setGeneration(null); setProposal(null);
    try {
      const result = await requestJson<Candidate & { model: string; usage: { inputTokens: number | null; outputTokens: number | null } }>("/api/ai/generate", "POST", { projectId, requirements, consent: true });
      setProviderVerified(true);
      setGeneration(result); setNotice(`Architecture drafted with ${result.model}. Review assumptions and trade-offs before applying.`);
      void refreshArtifacts();
    } catch (error) { setNotice(errorMessage(error)); }
    finally { setBusy(false); void refreshStatus(); }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault(); if (!canRequest) return;
    setBusy(true); setNotice(""); setProposal(null);
    try {
      const selectedMode = mode === "optimize" ? "optimize" : intent;
      const result = await requestJson<AssistantResult>("/api/ai/assistant", "POST", { projectId, graph, mode: selectedMode, goal, message, consent: true });
      setProviderVerified(true);
      setConversation(previous => [...previous, { role: "user" as const, content: message }, { role: "assistant" as const, content: result.answer }].slice(-8));
      setProposal(result);
      void refreshArtifacts();
      if (result.candidate) setNotice("Candidate prepared. HoloStack validated its graph integrity. Nothing has been applied or saved yet.");
      else setNotice(`Response from ${result.model}. No graph changes were proposed.`);
      setMessage("");
    } catch (error) { setNotice(errorMessage(error)); }
    finally { setBusy(false); void refreshStatus(); }
  }

  function apply(graphCandidate: Architecture) {
    onApply(graphCandidate); setGeneration(null); setProposal(null); setNotice("Approved candidate applied to HoloCanvas; project autosave will create a version snapshot.");
  }

  function reopenArtifact(artifact: SavedArtifact) {
    if (artifact.kind === "generation") {
      setMode("generate"); setGeneration(artifact.payload); setProposal(null);
    } else {
      setMode(artifact.payload.mode === "optimize" ? "optimize" : "copilot");
      setGeneration(null); setProposal({ ...artifact.payload, model: "Previously saved candidate" });
    }
    setNotice("Loaded a saved AI candidate. No provider request was made.");
  }

  const modeOptions: { id: Mode; label: string; icon: typeof Sparkles; description: string }[] = [
    { id: "generate", label: "Generate", icon: Sparkles, description: "Turn product requirements into a proposed architecture." },
    { id: "copilot", label: "Copilot", icon: MessageSquareText, description: "Ask about this architecture or request a natural-language change." },
    { id: "optimize", label: "Optimize", icon: WandSparkles, description: "Ask Gemini for a candidate optimized for a selected design goal." },
  ];

  return <section id="ai-workbench" className="ai-workbench" aria-label="HoloStack AI workbench">
    <div className="ai-workbench-head"><div><span className="eyebrow"><Sparkles size={13} /> HOLOSTACK AI · USER-REQUESTED REASONING</span><h2>Design with intelligence.</h2><p>AI proposes. You review. Deterministic code validates. Your approval is required to apply. The API key/model is checked only on your first explicit AI action, never on page load.</p></div><div className={`ai-provider-state ${status?.enabled ? "ready" : "offline"}`}><span />{status?.enabled ? providerVerified ? "GEMINI VERIFIED" : "GEMINI CONFIGURED" : "AI OFF"}</div></div>
    <div className="ai-workbench-meta" aria-live="polite">
      <span><Network size={14} /> {graph.nodes.length} current components in context</span>
      {status ? <span>{status.user.remaining}/{status.limits.perUser} daily actions left · {status.application.remaining}/{status.limits.global} app actions</span> : <span>{statusError || "Checking daily allowance…"}</span>}
      {status?.model && <span className="ai-model-tag">{status.model}</span>}
    </div>
    {!status?.enabled && <div className="ai-offline-message" role="status"><CircleAlert size={17} /><div><strong>Live AI is not configured.</strong><span>{statusError || status?.message || "To use Gemini: add GEMINI_API_KEY locally, verify your AI Studio project's free-tier access and that billing is not enabled, then set GEMINI_FREE_TIER_CONFIRMED=true and GEMINI_ENABLED=true. No Gemini request is made until you submit an action."}</span></div></div>}
    <div className="ai-tabs" role="tablist" aria-label="AI workflows">{modeOptions.map(option => { const Icon = option.icon; return <button key={option.id} role="tab" aria-selected={mode === option.id} className={mode === option.id ? "selected" : ""} onClick={() => { setMode(option.id); setNotice(""); setGeneration(null); setProposal(null); }}><Icon size={15} />{option.label}</button>; })}</div>
    <p className="ai-mode-description">{modeOptions.find(option => option.id === mode)?.description}</p>
    {artifacts.length > 0 && <div className="ai-saved-candidates"><span>RECENT SAVED CANDIDATES · ZERO AI REQUESTS</span>{artifacts.map(artifact => <button key={artifact.id} type="button" onClick={() => reopenArtifact(artifact)}><strong>{artifact.kind === "generation" ? artifact.payload.graph.name : artifact.payload.candidate?.name ?? "Saved proposal"}</strong><small>{artifact.kind === "generation" ? "Architecture generation" : artifact.payload.mode === "optimize" ? "Optimization proposal" : "Copilot proposal"} · {new Date(artifact.createdAt).toLocaleDateString()}</small></button>)}</div>}
    {mode === "generate" ? <form className="ai-form" onSubmit={generate}>
      <label htmlFor="ai-requirements">What are you building?<textarea id="ai-requirements" value={requirements} onChange={event => setRequirements(event.target.value)} maxLength={4000} minLength={10} required disabled={!status?.enabled || disabled || busy} placeholder="Design an AI SaaS chatbot for 100,000 users. Include a web application, tenant-aware auth, retrieval over private documents, and resilient background ingestion. Prefer a simple first release with a clear path to scale." /></label>
      <div className="ai-form-footer"><span>{requirements.length}/4,000 characters · One explicit Gemini request</span><Button type="submit" disabled={!canRequest || requirements.trim().length < 10}>{busy ? <><LoaderCircle className="ai-spin" size={15} />Generating…</> : <><Sparkles size={15} />Generate architecture</>}</Button></div>
    </form> : <form className="ai-form" onSubmit={ask}>
      {mode === "copilot" && <div className="ai-intent-picker" aria-label="Copilot action"><button type="button" aria-pressed={intent === "ask"} className={intent === "ask" ? "selected" : ""} onClick={() => setIntent("ask")}>Ask a question</button><button type="button" aria-pressed={intent === "change"} className={intent === "change" ? "selected" : ""} onClick={() => setIntent("change")}>Propose graph changes</button></div>}
      {mode === "optimize" && <label className="ai-goal-label">Optimization goal<select value={goal} onChange={event => setGoal(event.target.value)} disabled={!status?.enabled || disabled || busy}><option value="scalability">Scalability</option><option value="reliability">Reliability</option><option value="security">Security</option><option value="simplicity">Simplicity</option><option value="cost">Cost efficiency</option></select></label>}
      <div className="ai-chat-history" aria-live="polite">{conversation.length ? conversation.map((entry, index) => <div className={`ai-chat-message ${entry.role}`} key={`${index}-${entry.role}`}><span>{entry.role === "user" ? "YOU" : "HOLOSTACK AI"}</span><p>{entry.content}</p></div>) : <div className="ai-chat-empty"><MessageSquareText size={18} /><span>{mode === "optimize" ? "The current architecture is provided as context. A proposed candidate will remain separate until you approve it." : "Ask about the current design, or request a natural-language graph change. Manual canvas editing never calls Gemini."}</span></div>}</div>
      <label htmlFor="ai-message">{mode === "optimize" ? "What should the optimization focus on?" : "Ask about or modify this design"}<textarea id="ai-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={4000} minLength={3} required disabled={!status?.enabled || disabled || busy} placeholder={mode === "optimize" ? "Review the current design for this goal. Prefer a small number of changes and explain their assumptions." : "Why is Redis useful here? Or: Add a queue for email notifications and connect it to a worker."} /></label>
      <div className="ai-form-footer"><span>Uses current graph and up to 6 recent saved messages · 4,000 characters max</span><Button type="submit" disabled={!canRequest || message.trim().length < 3}>{busy ? <><LoaderCircle className="ai-spin" size={15} />Reasoning…</> : <><MessageSquareText size={15} />{mode === "optimize" ? "Propose optimization" : "Ask HoloStack AI"}</>}</Button></div>
    </form>}
    <label className="ai-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={!status?.enabled || disabled || busy} /><span>Send this request and architecture context to Google Gemini. The AI Studio free tier may use submitted content to improve Google products. Do not include secrets or personal data. HoloStack stores successful conversation messages and generated candidates in this private workspace.</span></label>
    {(generation || proposal?.candidate) && <div className="ai-candidate" role="region" aria-label="AI architecture candidate"><div className="ai-candidate-title"><div><span className="eyebrow">PROPOSED · NOT APPLIED</span><h3>{generation?.graph.name ?? proposal?.candidate?.name}</h3></div><button type="button" aria-label="Discard proposed architecture" onClick={() => { setGeneration(null); setProposal(null); }}><X size={15} /></button></div><p>{generation?.graph.description ?? proposal?.answer}</p><div className="ai-candidate-stats"><span><Network size={14} />{generation?.graph.nodes.length ?? proposal?.candidate?.nodes.length} components</span><span>{generation?.graph.edges.length ?? proposal?.candidate?.edges.length} connections</span>{proposal?.changes && <span>{proposal.changes.length} validated changes</span>}</div>
      <div className="ai-graph-comparison"><div><span>BEFORE · CURRENT DESIGN</span><div className="ai-graph-image" role="img" aria-label={`Current design: ${graph.name}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(architectureSvg(graph).svg)}")` }} /></div><div><span>AFTER · REVIEW CANDIDATE</span><div className="ai-graph-image" role="img" aria-label={`Proposed design: ${candidateGraph?.name}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(architectureSvg(candidateGraph!).svg)}")` }} /></div></div>
      {diff && <div className="ai-diff-list"><strong>LOCAL GRAPH DIFFERENCE</strong><span>{diff.addedNodes.length} components added</span><span>{diff.modifiedNodes.length} components modified</span><span>{diff.removedNodes.length} components removed</span><span>{diff.addedEdges.length} connections added</span><span>{diff.removedEdges.length} connections removed</span>{[...diff.addedNodes.map(node => `+ ${node.label}`), ...diff.modifiedNodes.map(node => `↻ ${node.label}`), ...diff.removedNodes.map(node => `− ${node.label}`)].map((label, index) => <code key={index}>{label}</code>)}</div>}
      {proposal?.changes.map((change, index) => <div className="ai-candidate-note" key={`change-${index}`}><Check size={13} />{change.operation.replaceAll("_", " ")}{change.targetId ? ` · ${change.targetId}` : ""}</div>)}
      {generation?.graph.assumptions.map((item, index) => <div className="ai-candidate-note" key={`assumption-${index}`}><CircleAlert size={13} />{item}</div>)}
      {(generation?.tradeoffs ?? proposal?.tradeoffs ?? []).map((item, index) => <div className="ai-candidate-note" key={`tradeoff-${index}`}><CircleAlert size={13} />{item}</div>)}
      <div className="ai-candidate-actions"><span>Applying loads the candidate into HoloCanvas. Autosave creates a regular version; no infrastructure is changed.</span><Button type="button" onClick={() => apply(generation?.graph ?? proposal!.candidate!)}><Check size={15} />Review & apply to canvas</Button></div>
    </div>}
    {proposal && !proposal.candidate && <div className="ai-answer"><div className="ai-answer-head"><MessageSquareText size={15} />ARCHITECTURE RESPONSE</div><p>{proposal.answer}</p>{proposal.tradeoffs.map((item, index) => <div className="ai-candidate-note" key={index}><CircleAlert size={13} />{item}</div>)}</div>}
    {notice && <p className="ai-notice" role="status">{notice}</p>}
    {status && <div className="ai-disclaimer"><RotateCcw size={13} />Quota resets {new Date(status.resetsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC. One request attempt per action; manual retries consume another daily action.</div>}
  </section>;
}
