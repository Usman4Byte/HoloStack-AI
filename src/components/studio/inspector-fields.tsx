"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { nodeTypes, type ArchitectureEdge, type ArchitectureNode } from "@/domain/architecture/schema";

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label>{label}<input type="number" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step} onChange={event => onChange(event.target.valueAsNumber)} /></label>;
}

export function ComponentFields({ node, readOnly, typeLabels, onChange }: { node: ArchitectureNode; readOnly: boolean; typeLabels: Record<ArchitectureNode["type"], string>; onChange: (node: ArchitectureNode) => void }) {
  if (readOnly) return <dl className="inspector-facts">
    <dt>Technology</dt><dd>{node.technology || "Unspecified"}</dd>
    <dt>Responsibility</dt><dd>{node.description || "Unspecified"}</dd>
    <dt>Trust boundary</dt><dd>{node.metadata.trustBoundary}</dd>
  </dl>;
  const capacity = node.capacityAssumptions;
  return <div className="inspector-fields">
    <label>Component name<input maxLength={100} value={node.label} onChange={event => onChange({ ...node, label: event.target.value })} /></label>
    <label>Component type<select value={node.type} onChange={event => onChange({ ...node, type: event.target.value as ArchitectureNode["type"] })}>
      {nodeTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}
    </select></label>
    <label>Technology<input maxLength={200} value={node.technology} onChange={event => onChange({ ...node, technology: event.target.value })} /></label>
    <label>Responsibility<textarea rows={3} maxLength={4000} value={node.description} onChange={event => onChange({ ...node, description: event.target.value })} /></label>
    <label>Trust boundary<select value={node.metadata.trustBoundary} onChange={event => onChange({ ...node, metadata: { ...node.metadata, trustBoundary: event.target.value as ArchitectureNode["metadata"]["trustBoundary"] } })}>
      <option value="public">Public</option><option value="private">Private</option><option value="external">External</option>
    </select></label>
    <details className="inspector-advanced">
      <summary>Traffic assumptions and notes</summary>
      <p>ScaleLab uses these values to estimate capacity.</p>
      <NumberField label="Maximum requests per second per replica" value={capacity.maxRps} min={0.01} max={1e9} step={0.01} onChange={maxRps => onChange({ ...node, capacityAssumptions: { ...capacity, maxRps } })} />
      <NumberField label="Replicas" value={capacity.replicas} min={1} max={10000} step={1} onChange={replicas => onChange({ ...node, capacityAssumptions: { ...capacity, replicas } })} />
      {node.type === "cache" && <NumberField label="Cache hit rate (%)" value={capacity.cacheHitRatio * 100} min={0} max={100} step={0.01} onChange={percent => onChange({ ...node, capacityAssumptions: { ...capacity, cacheHitRatio: percent / 100 } })} />}
      <label>Component notes<textarea rows={3} maxLength={4000} value={node.metadata.notes} onChange={event => onChange({ ...node, metadata: { ...node.metadata, notes: event.target.value } })} /></label>
    </details>
  </div>;
}

export function ConnectionFields({ edge, readOnly, components, endpointProblem, onChange }: {
  edge: ArchitectureEdge;
  readOnly: boolean;
  components: Pick<ArchitectureNode, "id" | "label">[];
  endpointProblem: (source: string, target: string) => string | null;
  onChange: (edge: ArchitectureEdge) => void;
}) {
  const [source, setSource] = useState(edge.source);
  const [target, setTarget] = useState(edge.target);
  if (readOnly) return <dl className="inspector-facts"><dt>Type</dt><dd>{edge.kind.toUpperCase()}</dd><dt>What passes between components</dt><dd>{edge.metadata.contract || "Unspecified"}</dd></dl>;
  const endpointsChanged = source !== edge.source || target !== edge.target;
  const problem = endpointsChanged ? endpointProblem(source, target) : null;
  const options = components.map(({ id, label }) => <option key={id} value={id}>{label || "Unnamed component"}</option>);

  return <div className="inspector-fields">
    <fieldset className="connection-endpoints">
      <legend>Connection endpoints</legend>
      <label>From component<select value={source} onChange={event => setSource(event.target.value)}>{options}</select></label>
      <label>To component<select value={target} onChange={event => setTarget(event.target.value)}>{options}</select></label>
      <p className="form-hint" aria-live="polite">{problem ?? "Choose where this connection starts and ends."}</p>
      <Button type="button" size="sm" variant="outline" disabled={!endpointsChanged || Boolean(problem)} onClick={() => onChange({ ...edge, source, target })}>Update endpoints</Button>
    </fieldset>
    <label>Connection name<input maxLength={100} value={edge.label} onChange={event => onChange({ ...edge, label: event.target.value })} /></label>
    <label>Connection type<select value={edge.kind} onChange={event => onChange({ ...edge, kind: event.target.value as ArchitectureEdge["kind"] })}>
      <option value="https">HTTPS</option><option value="query">Database query</option><option value="event">Event</option><option value="stream">Stream</option>
    </select></label>
    <label>What passes between components<textarea rows={3} maxLength={4000} value={edge.metadata.contract} onChange={event => onChange({ ...edge, metadata: { contract: event.target.value } })} /></label>
    <NumberField label="Requests sent per incoming request" value={edge.requestMultiplier} min={0} max={1000} step={0.01} onChange={requestMultiplier => onChange({ ...edge, requestMultiplier })} />
    <p className="form-hint">Use 1 for one downstream request per incoming request.</p>
  </div>;
}
