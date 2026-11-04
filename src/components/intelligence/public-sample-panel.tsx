"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownToLine, Gauge, GitCompareArrows, ShieldAlert } from "lucide-react";
import type { Architecture } from "@/domain/architecture/schema";
import { buildPreparedCacheVariant } from "@/domain/architecture/prepared-cache-variant";
import { architectureSvg } from "@/domain/architecture/studio";
import { architectureDiff } from "@/domain/ai/architecture";
import { buildArchitectureReport, reviewArchitecture, simulateCapacity, type CapacityResult } from "@/domain/intelligence/engine";
import { workloadPresets, type Workload } from "@/domain/intelligence/schema";
import { Button } from "@/components/ui/button";

const initial = workloadPresets[0].workload;
function modeledDatabaseLoad(result: CapacityResult) {
  return result.rows.find(row => row.type === "database")?.requestsPerSecond ?? 0;
}

export function PublicSamplePanel({ graph }: { graph: Architecture }) {
  const [workload, setWorkload] = useState<Workload>(initial);
  const [preset, setPreset] = useState("mvp");
  const [showComparison, setShowComparison] = useState(false);
  const capacity = useMemo(() => simulateCapacity(graph, workload), [graph, workload]);
  const findings = useMemo(() => reviewArchitecture(graph, workload), [graph, workload]);
  const variant = useMemo(() => buildPreparedCacheVariant(graph), [graph]);
  const variantCapacity = useMemo(() => variant ? simulateCapacity(variant, workload) : null, [variant, workload]);
  const diff = useMemo(() => variant ? architectureDiff(graph, variant) : null, [graph, variant]);

  function setInput<K extends keyof Workload>(key: K, value: number) {
    setWorkload(previous => ({ ...previous, [key]: value }));
    setPreset("custom");
  }

  function selectPreset(id: string) {
    const selected = workloadPresets.find(item => item.id === id);
    if (selected) { setPreset(id); setWorkload(selected.workload); }
  }

  function downloadReport() {
    const markdown = buildArchitectureReport(graph, workload, capacity, findings);
    const link = document.createElement("a"), url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    link.href = url; link.download = `${graph.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sample-architecture"}-report.md`;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  const beforeImage = architectureSvg(graph).svg;
  const afterImage = variant ? architectureSvg(variant).svg : "";
  return <section className="intelligence-panel public-sample-intelligence" aria-label="Public sample ScaleLab and architecture review">
    <div className="intelligence-heading"><div><span className="eyebrow"><Activity size={13} /> DETERMINISTIC ENGINE · NO AI REQUESTS</span><h2>ScaleLab & architecture review</h2><p>Try local traffic assumptions and named design rules without an account or Gemini key. These estimates are not load-test results.</p></div><span className="revision-chip">PUBLIC SAMPLE</span></div>
    <div className="intelligence-controls">
      <label>Scenario profile<select aria-label="Sample scenario profile" value={preset} onChange={event => selectPreset(event.target.value)}>{workloadPresets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{preset === "custom" && <option value="custom">Custom scenario</option>}</select></label>
      <Button type="button" variant="outline" onClick={downloadReport}><ArrowDownToLine size={14} />Export report</Button>
    </div>
    <div className="intelligence-sliders">
      <label>Direct requests / sec <strong>{workload.requestsPerSecond.toLocaleString()}</strong><input aria-label="Sample direct requests per second" type="range" min="0" max="10000" step="10" value={workload.requestsPerSecond} onChange={event => setInput("requestsPerSecond", Number(event.target.value))} /></label>
      <label>Concurrent users <strong>{workload.concurrentUsers.toLocaleString()}</strong><input aria-label="Sample concurrent users" type="range" min="0" max="100000" step="100" value={workload.concurrentUsers} onChange={event => setInput("concurrentUsers", Number(event.target.value))} /></label>
      <label>Requests / user / minute <strong>{workload.requestsPerUserPerMinute}</strong><input aria-label="Sample requests per user per minute" type="range" min="0" max="60" step="1" value={workload.requestsPerUserPerMinute} onChange={event => setInput("requestsPerUserPerMinute", Number(event.target.value))} /></label>
      <label>Read traffic <strong>{Math.round(workload.readShare * 100)}%</strong><input aria-label="Sample read traffic percentage" type="range" min="0" max="100" step="1" value={workload.readShare * 100} onChange={event => setInput("readShare", Number(event.target.value) / 100)} /></label>
    </div>
    <div className="intelligence-summary">
      <div><span>MODELED OFFERED LOAD</span><strong>{capacity.offeredRps.toLocaleString()} <small>RPS</small></strong></div>
      <div><span>USER-DERIVED INPUT</span><strong>{capacity.userDerivedRps.toLocaleString()} <small>RPS</small></strong></div>
      <div><span>CAPACITY ALERTS</span><strong>{capacity.bottlenecks.length}</strong></div>
      <div><span>RULE FINDINGS</span><strong>{findings.length}</strong></div>
    </div>
    <div className="capacity-table-wrap"><table className="capacity-table"><thead><tr><th>Component</th><th>Load / capacity</th><th>Utilization</th><th>Headroom</th></tr></thead><tbody>{capacity.rows.map(row => <tr key={row.nodeId}><td><span className={`capacity-state ${row.state}`} />{row.label}<small>{row.type}</small></td><td>{row.requestsPerSecond.toLocaleString()} / {row.capacityRps.toLocaleString()} RPS</td><td><div className="capacity-meter" aria-label={`${row.label} estimated utilization ${Math.round(row.utilization * 100)} percent`}><span className={row.state} style={{ width: `${Math.min(100, Math.max(2, row.utilization * 100))}%` }} /></div><small>{(row.utilization * 100).toFixed(1)}%</small></td><td>{row.headroomRps.toLocaleString()} RPS</td></tr>)}</tbody></table></div>
    {capacity.propagation.bounded && <p className="intelligence-warning"><AlertTriangle size={14} />Cyclic traffic propagation reached a safety bound after {capacity.propagation.iterations} rounds. Treat affected loads as unstable estimates.</p>}
    <details className="intelligence-assumptions"><summary><Gauge size={14} />Model assumptions and limitations</summary><ul>{capacity.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>
    <div className="review-header"><div><h3><ShieldAlert size={16} />Rule-based architecture review</h3><p>Named TypeScript rules return evidence and assumptions. They do not prove that a system is secure or risk-free.</p></div><span>{findings.length} findings</span></div>
    <div className="review-findings">{findings.length ? findings.map(item => <article key={item.id} className={`review-finding severity-${item.severity}`}><div><span>{item.category} · {item.severity} · {item.confidence} confidence</span><strong>{item.title}</strong><p>{item.recommendation}</p><small>Evidence: {item.evidence.join("; ")}</small><small>Assumptions: {item.assumptions.join("; ")}</small></div></article>) : <p className="review-empty">No configured rule matched this sample. That is not a guarantee that the design is risk-free.</p>}</div>
    <div className="review-header public-variant-header"><div><h3><GitCompareArrows size={16} />Prepared local comparison</h3><p>This authored example shows one cache inserted on a modeled service-to-database read path. It is not a Gemini optimization or a measured performance gain.</p></div>{variant && <Button type="button" variant="outline" onClick={() => setShowComparison(value => !value)} aria-expanded={showComparison}>{showComparison ? "Hide comparison" : "Compare prepared variant"}</Button>}</div>
    {!variant && <p className="review-empty">This sample has no eligible uncached service-to-database edge for the prepared cache example.</p>}
    {variant && showComparison && variantCapacity && diff && <div className="prepared-variant" role="region" aria-label="Prepared local architecture comparison">
      <span className="eyebrow">PREPARED FIXTURE · NO PROVIDER CALL · NOT APPLIED</span>
      <div className="ai-graph-comparison"><div><span>BASELINE · CURRENT SAMPLE</span><div className="ai-graph-image" role="img" aria-label={`Baseline graph ${graph.name}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(beforeImage)}")` }} /></div><div><span>PREPARED · CACHE VARIANT</span><div className="ai-graph-image" role="img" aria-label={`Prepared graph ${variant.name}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(afterImage)}")` }} /></div></div>
      <div className="ai-diff-list"><strong>DETERMINISTIC GRAPH DIFFERENCE</strong><span>{diff.addedNodes.length} component added</span><span>{diff.modifiedNodes.length} components modified</span><span>{diff.removedNodes.length} components removed</span><span>{diff.addedEdges.length} connections added</span><span>{diff.removedEdges.length} connections removed</span></div>
      <p className="prepared-variant-result">Modeled database requests: {modeledDatabaseLoad(capacity).toLocaleString()} → {modeledDatabaseLoad(variantCapacity).toLocaleString()} RPS under the current inputs. The assumed cache hit ratio is visible in the variant graph data; workload and cache behavior are hypothetical.</p>
      <p className="prepared-variant-result">Preview only: this does not change the canvas, save a project, or contact Gemini. Review cache freshness, tenant keying, invalidation, writes, and failure handling before using a similar design.</p>
    </div>}
    <p className="intelligence-footer">Public sample only · assumptions stay visible · no cloud save or live telemetry. Sliders, rules, comparison, and report export use local deterministic TypeScript.</p>
  </section>;
}
