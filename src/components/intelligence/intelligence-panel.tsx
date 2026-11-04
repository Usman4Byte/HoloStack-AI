"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, AlertTriangle, ArrowDownToLine, Gauge, Save, ShieldAlert, Sparkles } from "lucide-react";
import type { Architecture } from "@/domain/architecture/schema";
import { buildArchitectureReport, reviewArchitecture, simulateCapacity, type CapacityResult, type ReviewFinding } from "@/domain/intelligence/engine";
import { workloadPresets, type Workload } from "@/domain/intelligence/schema";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api-client";
import { getGuestServerSnapshot, getGuestSnapshot, listGuestScenarios, saveGuestScenario, subscribeGuest } from "@/domain/projects/guest-store";

type SavedRun = { id: string; graphRevision: number; name: string; workload: Workload; capacity: CapacityResult; findings: ReviewFinding[]; createdAt: string };
const initial = workloadPresets[0].workload;
export function IntelligencePanel({ projectId, revision, graph, readOnly, guestMode = false }: { projectId: string; revision: number; graph: Architecture; readOnly: boolean; guestMode?: boolean }) {
  const [workload, setWorkload] = useState<Workload>(initial);
  const [preset, setPreset] = useState("mvp");
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [name, setName] = useState("MVP baseline");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const guestSnapshot = useSyncExternalStore(subscribeGuest, getGuestSnapshot, getGuestServerSnapshot);
  const capacity = useMemo(() => simulateCapacity(graph, workload), [graph, workload]);
  const findings = useMemo(() => reviewArchitecture(graph, workload), [graph, workload]);
  const guestRuns = useMemo(() => {
    if (!guestMode || guestSnapshot === null) return [];
    try { return listGuestScenarios(projectId).map(item => ({ id: item.id, graphRevision: item.graphRevision, name: item.name, workload: item.workload, capacity: simulateCapacity(graph, item.workload), findings: reviewArchitecture(graph, item.workload), createdAt: item.createdAt })); }
    catch { return []; }
  }, [guestMode, guestSnapshot, projectId, graph]);
  const visibleRuns = guestMode ? guestRuns : runs;

  useEffect(() => {
    let active = true;
    if (guestMode) return () => { active = false; };
    requestJson<{ runs: SavedRun[] }>(`/api/projects/${encodeURIComponent(projectId)}/intelligence`).then(result => { if (active) setRuns(result.runs); }).catch(() => { if (active) setRuns([]); });
    return () => { active = false; };
  }, [guestMode, projectId]);

  function setInput<K extends keyof Workload>(key: K, value: number) { setWorkload(previous => ({ ...previous, [key]: value })); setPreset("custom"); setName("Custom scenario"); }
  function selectPreset(id: string) { const selected = workloadPresets.find(item => item.id === id); if (selected) { setPreset(id); setWorkload(selected.workload); setName(selected.label); } }
  async function saveScenario() {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      if (guestMode) {
        saveGuestScenario({ projectId, graphRevision: revision, name, workload });
        setNotice("Scenario saved in this browser session. Results recalculate locally.");
      } else {
        const result = await requestJson<{ run: SavedRun }>(`/api/projects/${encodeURIComponent(projectId)}/intelligence`, "POST", { name, workload, expectedRevision: revision });
        setRuns(previous => [result.run, ...previous].slice(0, 12)); setNotice(`Saved against project version ${result.run.graphRevision}.`);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this scenario."); }
    finally { setBusy(false); }
  }
  function downloadReport() {
    const markdown = buildArchitectureReport(graph, workload, capacity, findings);
    const link = document.createElement("a"), url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    link.href = url; link.download = `${graph.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture"}-report.md`;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <section id="intelligence" className="intelligence-panel" aria-label="ScaleLab and architecture review">
    <div className="intelligence-heading"><div><span className="eyebrow"><Activity size={13} /> DETERMINISTIC ENGINE · NO AI REQUESTS</span><h2>ScaleLab & architecture review</h2><p>Explore traffic assumptions, capacity headroom, and explicit design rules. These are estimates, not load-test results.</p></div><span className="revision-chip">GRAPH V{revision}</span></div>
    {!graph.nodes.length && <p className="action-message">Add a component on the Canvas to see capacity estimates and review findings.</p>}
    <div className="intelligence-controls">
      <label>Scenario profile<select value={preset} onChange={event => selectPreset(event.target.value)}>{workloadPresets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{preset === "custom" && <option value="custom">Custom scenario</option>}</select></label>
      <label>Scenario name<input value={name} maxLength={80} onChange={event => { setName(event.target.value); setPreset("custom"); }} /></label>
      <Button type="button" variant="outline" onClick={saveScenario} disabled={busy || !name.trim() || readOnly}><Save size={14} />{busy ? "Saving…" : guestMode ? "Save in session" : "Save scenario"}</Button>
      <Button type="button" variant="outline" onClick={downloadReport}><ArrowDownToLine size={14} />Export report</Button>
    </div>
    <div className="intelligence-sliders">
      <label>Direct requests / sec <strong>{workload.requestsPerSecond.toLocaleString()}</strong><input type="range" min="0" max="10000" step="10" value={workload.requestsPerSecond} onChange={event => setInput("requestsPerSecond", Number(event.target.value))} /></label>
      <label>Concurrent users <strong>{workload.concurrentUsers.toLocaleString()}</strong><input type="range" min="0" max="100000" step="100" value={workload.concurrentUsers} onChange={event => setInput("concurrentUsers", Number(event.target.value))} /></label>
      <label>Requests / user / minute <strong>{workload.requestsPerUserPerMinute}</strong><input type="range" min="0" max="60" step="1" value={workload.requestsPerUserPerMinute} onChange={event => setInput("requestsPerUserPerMinute", Number(event.target.value))} /></label>
      <label>Read traffic <strong>{Math.round(workload.readShare * 100)}%</strong><input type="range" min="0" max="100" step="1" value={workload.readShare * 100} onChange={event => setInput("readShare", Number(event.target.value) / 100)} /></label>
    </div>
    <div className="intelligence-summary">
      <div><span>MODELED OFFERED LOAD</span><strong>{capacity.offeredRps.toLocaleString()} <small>RPS</small></strong></div>
      <div><span>USER-DERIVED INPUT</span><strong>{capacity.userDerivedRps.toLocaleString()} <small>RPS</small></strong></div>
      <div><span>CAPACITY ALERTS</span><strong>{capacity.bottlenecks.length}</strong></div>
      <div><span>RULE FINDINGS</span><strong>{findings.length}</strong></div>
    </div>
    <div className="capacity-table-wrap"><table className="capacity-table"><thead><tr><th>Component</th><th>Load / capacity</th><th>Utilization</th><th>Headroom</th></tr></thead><tbody>{capacity.rows.map(row => <tr key={row.nodeId}><td><span className={`capacity-state ${row.state}`} />{row.label}<small>{row.type}</small></td><td>{row.requestsPerSecond.toLocaleString()} / {row.capacityRps.toLocaleString()} RPS</td><td><div className="capacity-meter" aria-label={`${row.label} estimated utilization ${Math.round(row.utilization * 100)} percent`}><span className={row.state} style={{ width: `${Math.min(100, Math.max(2, row.utilization * 100))}%` }} /></div><small>{(row.utilization * 100).toFixed(1)}%</small></td><td>{row.headroomRps.toLocaleString()} RPS</td></tr>)}</tbody></table></div>
    {capacity.propagation.bounded && <p className="intelligence-warning"><AlertTriangle size={14} />Graph traffic did not converge within {capacity.propagation.iterations} rounds. Cyclic propagation was bounded; treat affected node loads as unstable upper estimates.</p>}
    <details className="intelligence-assumptions"><summary><Gauge size={14} />Model assumptions and limitations</summary><ul>{capacity.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>
    <div className="review-header"><div><h3><ShieldAlert size={16} />Rule-based architecture review</h3><p>Findings are produced by named local TypeScript rules with evidence and assumptions; no model score is calculated.</p></div><span>{findings.length} findings</span></div>
    <div className="review-findings">{findings.length ? findings.map(item => <article key={item.id} className={`review-finding severity-${item.severity}`}><div><span>{item.category} · {item.severity} · {item.confidence} confidence</span><strong>{item.title}</strong><p>{item.recommendation}</p><small>Evidence: {item.evidence.join("; ")}</small><small>Assumptions: {item.assumptions.join("; ")}</small></div></article>) : <p className="review-empty"><Sparkles size={15} />No configured rule matched this graph and workload. This is not a guarantee that the design is risk-free.</p>}</div>
    {visibleRuns.length > 0 && <div className="saved-intelligence"><strong>SAVED SCENARIOS & RUNS</strong>{visibleRuns.map(run => <button type="button" key={run.id} onClick={() => { setWorkload(run.workload); setName(run.name); setPreset(workloadPresets.find(item => JSON.stringify(item.workload) === JSON.stringify(run.workload))?.id ?? "custom"); setNotice(`Loaded saved run for graph version ${run.graphRevision}; current results recalculate locally.`); }}><span>{run.name} · v{run.graphRevision}</span><small>{new Date(run.createdAt).toLocaleString()} · {run.capacity.offeredRps.toLocaleString()} RPS · {run.findings.length} findings</small></button>)}</div>}
    {notice && <p className="intelligence-notice" role="status">{notice}</p>}
    <p className="intelligence-footer">Assumptions stay visible. Sliders and rules run local deterministic calculations; {guestMode ? "saved scenarios stay in this browser session." : "saved scenarios persist in the authenticated project workspace."} No live telemetry is connected.</p>
  </section>;
}
