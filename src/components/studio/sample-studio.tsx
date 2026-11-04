"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position, ReactFlow, addEdge, useEdgesState, useNodesState, useReactFlow, type Connection, type Node as FlowNode, type NodeProps, type XYPosition } from "@xyflow/react";
import { ArrowDownToLine, ArrowRight, Box, Braces, Check, ChevronRight, CircleDot, Cloud, Code2, Database, FileUp, Globe, Layers3, LayoutGrid, LockKeyhole, Network, Redo2, RotateCcw, Save, Server, ShieldCheck, Sparkles, Undo2, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { architectureSchema, nodeTypes, type Architecture, type ArchitectureNode } from "@/domain/architecture/schema";
import { architectureSvg, layoutArchitecture, parseArchitectureImport } from "@/domain/architecture/studio";
import { templates } from "@/domain/architecture/templates";

type CanvasNode = FlowNode<{ component: ArchitectureNode }, "component">;
type ComponentType = ArchitectureNode["type"];
const icons: Partial<Record<ComponentType, typeof Server>> = { client: Globe, database: Database, ai: Sparkles, auth: LockKeyhole, "object-storage": Cloud, cache: Zap, queue: Workflow, cdn: Globe, "api-gateway": Network, search: Braces, worker: Workflow, monitoring: CircleDot };
const labels: Record<ComponentType, string> = {
  client: "Web client", cdn: "CDN", "load-balancer": "Load balancer", "api-gateway": "API gateway", "web-app": "Web application", service: "Backend service", auth: "Authentication", database: "Database", cache: "Cache", queue: "Message queue", "object-storage": "Object storage", search: "Search index", "external-api": "External API", ai: "AI / LLM", worker: "Background worker", monitoring: "Monitoring",
};

function ComponentNode({ data, selected }: NodeProps<CanvasNode>) {
  const node = data.component;
  const Icon = icons[node.type] ?? Server;
  return <div className={`architecture-node node-${node.type} ${selected ? "node-selected" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <div className="node-heading"><span className="node-symbol"><Icon size={18} /></span><span className="node-type">{node.type.replaceAll("-", " ")}</span><span className="node-indicator" /></div>
    <strong>{node.label}</strong><span className="node-tech">{node.technology}</span>
    <Handle type="source" position={Position.Right} />
  </div>;
}
const customNodes = { component: ComponentNode };
const makeNodes = (graph: Architecture): CanvasNode[] => graph.nodes.map(component => ({ id: component.id, type: "component", position: component.position, data: { component } }));
const makeEdges = (graph: Architecture) => graph.edges.map(edge => ({ ...edge, animated: true, type: "smoothstep" as const, style: { stroke: "#48758e", strokeWidth: 1.4 }, labelStyle: { fill: "#9baec3", fontSize: 10 }, labelBgStyle: { fill: "#101923", fillOpacity: 1 } }));
function snapshotGraph(base: Architecture, nodes: CanvasNode[], edges: ReturnType<typeof makeEdges>) {
  return architectureSchema.safeParse({ ...base,
    nodes: nodes.map(node => ({ ...node.data.component, position: node.position })),
    edges: edges.filter(edge => nodes.some(node => node.id === edge.source) && nodes.some(node => node.id === edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, label: edge.label, requestMultiplier: edge.requestMultiplier, metadata: edge.metadata })),
  });
}
function newComponent(type: ComponentType, position: XYPosition): ArchitectureNode {
  const label = labels[type];
  return {
    id: `node-${crypto.randomUUID()}`, type, label, technology: type === "database" ? "PostgreSQL-compatible" : type === "service" || type === "web-app" ? "Next.js" : "Define a technology",
    description: `${label} responsibilities and operational boundaries are assumptions to define for this design.`, position,
    capacityAssumptions: { maxRps: type === "database" ? 800 : type === "ai" ? 50 : 2000, replicas: 1, cacheHitRatio: type === "cache" ? 0.8 : 0 },
    metadata: { trustBoundary: ["client", "cdn", "external-api"].includes(type) ? "public" : ["ai"].includes(type) ? "external" : "private", notes: "Capacity values are editable assumptions, not measurements." },
  };
}
function fitCanvasAfterUpdate() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".canvas-palette [aria-label='Fit architecture to view']")?.click()));
}

function CanvasPalette({ disabled, onAdd, onLayout }: { disabled: boolean; onAdd: (type: ComponentType, position: XYPosition) => void; onLayout: () => void }) {
  const flow = useReactFlow<CanvasNode>();
  const [type, setType] = useState<ComponentType>("service");
  return <Panel position="top-left" className="canvas-palette" aria-label="Canvas tools">
    <label className="sr-only" htmlFor="component-palette">Component to add</label>
    <select id="component-palette" value={type} disabled={disabled} onChange={event => setType(event.target.value as ComponentType)}>
      {nodeTypes.map(nodeType => <option key={nodeType} value={nodeType}>{labels[nodeType]}</option>)}
    </select>
    <button type="button" disabled={disabled} onClick={() => {
      const pane = document.querySelector<HTMLElement>(".canvas-area .react-flow");
      const rect = pane?.getBoundingClientRect();
      const position = flow.screenToFlowPosition({ x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2, y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2 });
      onAdd(type, position);
    }} aria-label="Add selected component"><Box size={13} /> Add</button>
    <button type="button" disabled={disabled} onClick={onLayout} aria-label="Automatically arrange components"><LayoutGrid size={13} /> Arrange</button>
    <button type="button" onClick={() => void flow.fitView({ padding: 0.22, duration: 280 })} aria-label="Fit architecture to view">Fit</button>
  </Panel>;
}

export function Canvas({ template, onSave, saving = false, readOnly = false, onDirty, onChange, onValidationChange }: { template: Architecture; onSave?: (graph: Architecture) => Promise<void>; saving?: boolean; readOnly?: boolean; onDirty?: () => void; onChange?: (graph: Architecture) => void; onValidationChange?: (valid: boolean) => void }) {
  const [baseGraph, setBaseGraph] = useState(template);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(makeNodes(template));
  const [edges, setEdges, onEdgesChange] = useEdgesState(makeEdges(template));
  const [selectedId, setSelectedId] = useState<string | null>(template.nodes.find(node => node.id === "api")?.id ?? template.nodes[0]?.id ?? null);
  const [notice, setNotice] = useState("");
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [importing, setImporting] = useState(false);
  const studioRef = useRef<HTMLElement>(null), importInputRef = useRef<HTMLInputElement>(null);
  const graphRef = useRef<Architecture>(template), undoRef = useRef<Architecture[]>([]), redoRef = useRef<Architecture[]>([]);
  const dragSnapshotRef = useRef<Architecture | null>(null), dragHistoryRecordedRef = useRef(false);
  const selected = nodes.find(node => node.id === selectedId)?.data.component;
  const publishHistory = useCallback(() => setHistoryCounts({ undo: undoRef.current.length, redo: redoRef.current.length }), []);
  const pushUndo = useCallback((graph: Architecture) => {
    undoRef.current = [...undoRef.current, graph].slice(-100);
    redoRef.current = [];
    publishHistory();
  }, [publishHistory]);
  const current = useCallback(() => snapshotGraph(baseGraph, nodes, edges), [baseGraph, nodes, edges]);

  useEffect(() => {
    const parsed = snapshotGraph(baseGraph, nodes, edges);
    if (!parsed.success) { onValidationChange?.(false); return; }
    onValidationChange?.(true);
    const graph = parsed.data;
    if (JSON.stringify(graph) === JSON.stringify(graphRef.current)) return;
    if (dragSnapshotRef.current) {
      if (!dragHistoryRecordedRef.current) { pushUndo(dragSnapshotRef.current); dragHistoryRecordedRef.current = true; }
    } else pushUndo(graphRef.current);
    graphRef.current = graph;
    onChange?.(graph);
    onDirty?.();
    setNotice("");
  }, [baseGraph, nodes, edges, onChange, onDirty, onValidationChange, pushUndo]);

  const restoreGraph = useCallback((graph: Architecture, fitView = false) => {
    graphRef.current = graph;
    setBaseGraph(graph); setNodes(makeNodes(graph)); setEdges(makeEdges(graph));
    setSelectedId(currentId => graph.nodes.some(node => node.id === currentId) ? currentId : graph.nodes.find(node => node.id === "api")?.id ?? graph.nodes[0]?.id ?? null);
    onChange?.(graph); onDirty?.(); onValidationChange?.(true);
    if (fitView) fitCanvasAfterUpdate();
  }, [onChange, onDirty, onValidationChange, setEdges, setNodes]);
  const undo = useCallback(() => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current = [...redoRef.current, graphRef.current].slice(-100);
    restoreGraph(previous); publishHistory(); setNotice("Last architecture change undone.");
  }, [publishHistory, restoreGraph]);
  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current = [...undoRef.current, graphRef.current].slice(-100);
    restoreGraph(next); publishHistory(); setNotice("Architecture change restored.");
  }, [publishHistory, restoreGraph]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!studioRef.current?.contains(event.target as globalThis.Node)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable='true']")) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [redo, undo]);

  function exportGraph() {
    const graph = current();
    if (!graph.success) { setNotice("This draft cannot be exported until all component and connection fields are valid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(graph.data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `holostack-${graph.data.id}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(onSave ? "Architecture draft downloaded as JSON. Project changes continue to autosave." : "Architecture exported as JSON. This public sample stays in this browser tab.");
  }

  async function exportPng() {
    const graph = current();
    if (!graph.success) { setNotice("Fix invalid component details before exporting this diagram."); return; }
    try {
      const { svg, width, height } = architectureSvg(graph.data);
      const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const scale = Math.min(1.5, 4096 / width, 4096 / height);
        const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The browser could not prepare the PNG image.");
        context.fillStyle = "#0b121d"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG rendering did not complete.")), "image/png"));
        const pngUrl = URL.createObjectURL(png), anchor = document.createElement("a"); anchor.href = pngUrl; anchor.download = `holostack-${graph.data.id}.png`; anchor.click();
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      } finally { URL.revokeObjectURL(objectUrl); }
      setNotice("Diagram exported as a PNG image.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "PNG export could not be completed in this browser."); }
  }

  async function importGraph(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > 256 * 1024) throw new Error("This file is larger than the 256 KiB architecture import limit.");
      const imported = parseArchitectureImport(await file.text());
      pushUndo(graphRef.current);
      restoreGraph(imported, true);
      setNotice(`Imported ${imported.nodes.length} components. Review the draft; it will autosave in this project.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "The architecture file could not be imported."); }
    finally { setImporting(false); if (importInputRef.current) importInputRef.current.value = ""; }
  }

  const addComponent = useCallback((type: ComponentType, position: XYPosition) => {
    if (readOnly || nodes.length >= 100) { setNotice("A design can contain at most 100 components."); return; }
    const component = newComponent(type, position);
    setNodes(currentNodes => [...currentNodes, { id: component.id, type: "component", position: component.position, data: { component }, selected: true }]);
    setSelectedId(component.id); onDirty?.(); setNotice(`${labels[type]} added to the canvas.`);
  }, [nodes.length, onDirty, readOnly, setNodes]);
  const arrange = useCallback(() => {
    const graph = current();
    if (!graph.success) { setNotice("Fix invalid component details before arranging the canvas."); return; }
    const arranged = layoutArchitecture(graph.data);
    setBaseGraph(arranged); setNodes(makeNodes(arranged)); setNotice("Components arranged by their connections. Cycles remain valid and are grouped safely.");
    fitCanvasAfterUpdate();
  }, [current, setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (readOnly || connection.source === connection.target) return;
    const graph = current();
    if (graph.success && graph.data.edges.length >= 300) { setNotice("A design can contain at most 300 connections."); return; }
    setEdges(currentEdges => addEdge({ ...connection, id: `edge-${crypto.randomUUID()}`, animated: true, type: "smoothstep", label: "HTTPS", kind: "https", requestMultiplier: 1, metadata: { contract: "Define authentication, payload, timeout, and failure behavior." } }, currentEdges));
    onDirty?.();
  }, [current, onDirty, readOnly, setEdges]);
  function updateSelected(field: "label" | "technology", value: string) {
    onDirty?.();
    setNodes(currentNodes => currentNodes.map(node => node.id === selectedId ? { ...node, data: { component: { ...node.data.component, [field]: value } } } : node));
  }
  function resetSample() {
    undoRef.current = []; redoRef.current = []; publishHistory(); restoreGraph(template, true); setSelectedId(template.nodes.find(node => node.id === "api")?.id ?? template.nodes[0]?.id ?? null); setNotice("Sample reset to its authored starting point.");
  }

  return <>
    <section ref={studioRef} className="studio-panel" id="canvas" aria-label="Interactive architecture studio">
      <div className="studio-toolbar"><div className="studio-title"><Network size={17} /><strong>{template.name}</strong><span className="sample-badge">{onSave ? "DESIGN" : "SAMPLE"}</span></div><div className="studio-actions">
        <Button aria-label="Undo architecture change" title="Undo · Ctrl/⌘ Z" variant="ghost" size="sm" disabled={readOnly || !historyCounts.undo} onClick={undo}><Undo2 size={14} /><span>Undo</span></Button>
        <Button aria-label="Redo architecture change" title="Redo · Ctrl/⌘ Shift Z" variant="ghost" size="sm" disabled={readOnly || !historyCounts.redo} onClick={redo}><Redo2 size={14} /><span>Redo</span></Button>
        {onSave ? <Button size="sm" disabled={saving || readOnly} onClick={() => { const graph = current(); if (!graph.success) { setNotice("Check component names and graph bounds before saving."); return; } void onSave(graph.data); }}><Save size={14} /><span>{saving ? "Saving…" : "Save project"}</span></Button> : <Button aria-label="Reset sample" variant="ghost" size="sm" onClick={resetSample}><RotateCcw size={14} /><span>Reset</span></Button>}
        <input ref={importInputRef} type="file" accept="application/json,.json" aria-label="Import architecture JSON file" className="file-input-hidden" disabled={readOnly || importing} onChange={event => void importGraph(event.target.files?.[0])} />
        <Button variant="outline" size="sm" disabled={readOnly || importing} onClick={() => importInputRef.current?.click()}><FileUp size={14} /><span>{importing ? "Importing…" : "Import"}</span></Button>
        <Button aria-label="Export architecture as PNG" title="Export PNG" variant="outline" size="sm" onClick={() => void exportPng()}><Layers3 size={14} /><span>PNG</span></Button>
        <Button aria-label="Export architecture as JSON" title="Export JSON" variant="outline" size="sm" onClick={exportGraph}><ArrowDownToLine size={14} /><span>JSON</span></Button>
      </div></div>
      <div className="studio-body"><div className="canvas-area">
        <div className="canvas-caption"><span className="live-dot" />HOLOCANVAS <span>/</span> DESIGN VIEW</div>
        <ReactFlow<CanvasNode, ReturnType<typeof makeEdges>[number]> nodes={nodes} edges={edges} nodeTypes={customNodes} nodesDraggable={!readOnly} nodesConnectable={!readOnly} onNodesChange={changes => { const allowed = readOnly ? changes.filter(change => change.type === "select" || change.type === "dimensions") : changes; if (allowed.some(change => change.type === "position" || change.type === "remove")) onDirty?.(); onNodesChange(allowed); }} onEdgesChange={changes => { const allowed = readOnly ? changes.filter(change => change.type === "select") : changes; if (allowed.some(change => change.type === "remove")) onDirty?.(); onEdgesChange(allowed); }} onNodeDragStart={() => { dragSnapshotRef.current = graphRef.current; dragHistoryRecordedRef.current = false; }} onNodeDragStop={() => { dragSnapshotRef.current = null; dragHistoryRecordedRef.current = false; }} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.18} maxZoom={1.75} colorMode="dark" deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]} tabIndex={0} aria-label="Architecture canvas. Select a component to edit it. Press Delete to remove selected components or connections; use Control or Command with Z to undo." >
          <CanvasPalette disabled={readOnly} onAdd={addComponent} onLayout={arrange} />
          <Background variant={BackgroundVariant.Dots} color="#2c3a4b" gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ width: 95, height: 62 }} nodeColor="#294e61" maskColor="rgba(9,14,22,.7)" />
        </ReactFlow>
        <div className="canvas-legend"><span />Request flow<span className="legend-violet" />External boundary</div>
      </div><aside className="inspector" aria-label="Component inspector"><div className="inspector-label"><Box size={15} />COMPONENT INSPECTOR</div>{selected ? <>
        <div className={`inspector-symbol node-${selected.type}`}>{(() => { const Icon = icons[selected.type] ?? Server; return <Icon size={23} />; })()}</div><h3>{selected.label}</h3><span className="type-label">{selected.type.replaceAll("-", " ")}</span>
        <label className="field-label" htmlFor="node-label">Component name</label><input id="node-label" maxLength={100} value={selected.label} disabled={readOnly} onChange={event => updateSelected("label", event.target.value)} />
        <label className="field-label" htmlFor="node-technology">Technology</label><input id="node-technology" maxLength={200} value={selected.technology} disabled={readOnly} onChange={event => updateSelected("technology", event.target.value)} />
        <div className="inspector-section"><span className="field-label">Responsibility</span><p>{selected.description}</p></div>
        <div className="boundary"><ShieldCheck size={15} /><span>{selected.metadata.trustBoundary} boundary</span></div>
        <div className="inspector-note">Design model only. No services are provisioned or monitored.</div>
      </> : <div className="inspector-empty"><CircleDot size={28} /><h3>Explore the system</h3><p>Select a component to inspect its responsibility and edit its details.</p></div>}</aside></div>
      <div className="studio-footer"><span><span className="status-dot" />{nodes.length} components <span className="separator">·</span> {edges.length} connections</span><span>{onSave ? "Autosaved · Revision-protected" : "Drag to arrange · Sample stays in this tab"}</span></div>
    </section><p role="status" className="export-notice">{notice || "Tip: add components from the canvas palette, connect their handles, and use Ctrl/⌘ Z to undo."}</p>
  </>;
}

export function SampleStudio() {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [revision, setRevision] = useState(0);
  return <main className="overview-main">
    <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR ARCHITECTURE WORKSPACE</div><h1>Big ideas. <span>Better systems.</span></h1><p>Bring your next system into focus, one connection at a time.</p></div><Button asChild variant="outline"><a href="/dashboard"><Database size={16} />Open your workspace<ArrowRight size={15} /></a></Button></div>
    <section className="intro-grid" aria-label="Workspace introduction"><div className="hero-card"><div className="hero-copy"><span className="pill"><Sparkles size={13} /> BUILT FOR SYSTEM THINKERS</span><h2>See the architecture.<br /><span>Understand the possibilities.</span></h2><p>Start with a grounded template. Explore the components,<br className="desktop-break" /> trace the connections, and make the design your own.</p><Button asChild><a href="#canvas">Explore sample architecture<ArrowRight size={16} /></a></Button><div className="hero-footnote"><Check size={13} />Interactive local sample <span>·</span> No API key needed</div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-core"><Layers3 size={51} strokeWidth={1} /></div><div className="art-satellite sat-one"><Database size={20} /></div><div className="art-satellite sat-two"><Code2 size={21} /></div><div className="art-satellite sat-three"><Cloud size={22} /></div><span className="art-coordinate">SYSTEM / 001</span></div></div>
      <div className="readiness-card"><div className="card-kicker"><span className="status-dot" /> PROJECT FOUNDATION</div><h3>A clear path to live.</h3><p>Explore this public sample, or sign in to create a private workspace with saved projects.</p><div className="readiness-row"><span className="step-check"><Check size={12} /></span><span>Application scaffold</span><span className="done-label">Ready</span></div><div className="readiness-row"><span className="step-number">2</span><span>Database integration</span><span className="done-label">Ready</span></div><div className="readiness-row"><span className="step-number">3</span><span>Auth & saved projects</span><span className="done-label">Ready</span></div><a href="/signup" className="text-link">Create your workspace<ArrowRight size={14} /></a></div></section>
    <section id="templates" className="templates-section"><div className="section-heading"><div><h2>Start with a blueprint <span>07</span></h2><p>Real patterns. Explicit assumptions. A starting point for your thinking.</p></div><span className="section-meta">LOCALLY AUTHORED TEMPLATES</span></div><div className="template-grid">{templates.map((template, index) => { const Icon = [Sparkles, Globe, Network, Cloud, Braces, Workflow, Zap][index]; return <button key={template.id} className={`template-card ${selectedTemplate.id === template.id ? "template-active" : ""}`} onClick={() => { setSelectedTemplate(template); setRevision(value => value + 1); }} aria-pressed={selectedTemplate.id === template.id}><span className={`template-icon template-icon-${index}`}><Icon size={19} /></span><strong>{template.name}</strong><span>{template.nodes.length} components <ChevronRight size={13} /></span></button>; })}</div></section>
    <div className="section-heading canvas-heading"><div><h2>Your system, connected.</h2><p>A working canvas to explore structure and intent.</p></div><span className="sample-mode"><span />Sample mode · not saved</span></div>
    <Canvas key={`${selectedTemplate.id}-${revision}`} template={selectedTemplate} />
    <div className="workspace-note"><ShieldCheck size={16} /><p>Designed for honest engineering. Samples are authored fixtures; capacity assumptions are not measured performance. Sign in for private saved projects. AI generation and simulation are upcoming milestones.</p><a href="/setup">Build status<ArrowUpRightIcon /></a></div>
  </main>;
}
function ArrowUpRightIcon() { return <ArrowRight size={14} style={{ transform: "rotate(-45deg)" }} />; }
