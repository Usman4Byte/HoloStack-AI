"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Gauge } from "lucide-react";
import { templates } from "@/domain/architecture/templates";
import { simulateCapacity } from "@/domain/intelligence/engine";
import { workloadPresets } from "@/domain/intelligence/schema";

export function MarketingSimulation() {
  const [requestsPerSecond, setRequestsPerSecond] = useState(250);
  const baseline = workloadPresets[0].workload;
  const workload = useMemo(() => ({ ...baseline, requestsPerSecond, concurrentUsers: 0, requestsPerUserPerMinute: 0 }), [baseline, requestsPerSecond]);
  const result = useMemo(() => simulateCapacity(templates[0], workload), [workload]);
  const rows = result.rows.slice(0, 5);
  return <div className="simulation-demo" aria-label="Interactive deterministic capacity illustration">
    <div className="simulation-controls">
      <span className="eyebrow"><Gauge size={14} /> LIVE LOCAL MODEL · NO AI REQUESTS</span>
      <label htmlFor="marketing-rps">Incoming requests per second <strong>{requestsPerSecond.toLocaleString()} RPS</strong><input id="marketing-rps" type="range" min="50" max="2000" step="50" value={requestsPerSecond} onChange={event => setRequestsPerSecond(Number(event.target.value))} /></label>
      <p className="simulation-assumption">Illustrative template assumptions only. Move the control to recalculate graph load, utilization, and headroom in deterministic TypeScript.</p>
    </div>
    <div className="simulation-result">
      <div className="simulation-result-head"><strong>Modeled component load</strong><span>{result.bottlenecks.length ? <><AlertTriangle size={13} /> {result.bottlenecks.length} capacity alerts</> : "Within entered assumptions"}</span></div>
      <div className="simulation-rows">{rows.map(row => <div className="simulation-row" key={row.nodeId}>
        <span>{row.label}</span><div className="meter-track" role="img" aria-label={`${row.label}: ${Math.round(row.utilization * 100)} percent modeled utilization`}><span className={row.state} style={{ width: `${Math.min(100, Math.max(2, row.utilization * 100))}%` }} /></div><strong>{(row.utilization * 100).toFixed(0)}%</strong>
      </div>)}</div>
      <p className="simulation-assumption">Estimates do not measure infrastructure, latency, cloud cost, or real service capacity. All figures depend on editable assumptions.</p>
    </div>
  </div>;
}
