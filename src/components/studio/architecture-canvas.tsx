"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position, ReactFlow, addEdge, useEdgesState, useNodesState, useReactFlow, type Connection, type Node as FlowNode, type NodeProps, type ReactFlowInstance, type XYPosition } from "@xyflow/react";
import { ArrowDownToLine, Box, Braces, CircleDot, Cloud, Database, FileUp, Globe, Layers3, LayoutGrid, LockKeyhole, Network, Redo2, Save, Server, Sparkles, Trash2, Undo2, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { architectureSchema, nodeTypes, type Architecture, type ArchitectureEdge, type ArchitectureNode } from "@/domain/architecture/schema";
import { architectureSvg, layoutArchitecture, parseArchitectureImport } from "@/domain/architecture/studio";
import { ComponentFields, ConnectionFields } from "./inspector-fields";

type CanvasNode = FlowNode<{ component: ArchitectureNode }, "component">;
type ComponentType = ArchitectureNode["type"];
const icons: Partial<Record<ComponentType, typeof Server>> = { client: Globe, database: Database, ai: Sparkles, auth: LockKeyhole, "object-storage": Cloud, cache: Zap, queue: Workflow, cdn: Globe, "api-gateway": Network, search: Braces, worker: Workflow, monitoring: CircleDot };
const labels: Record<ComponentType, string> = {
  client: "Web client", cdn: "CDN", "load-balancer": "Load balancer", "api-gateway": "API gateway", "web-app": "Web application", service: "Backend service", auth: "Authentication", database: "Database", cache: "Cache", queue: "Message queue", "object-storage": "Object storage", search: "Search index", "external-api": "External API", ai: "AI / LLM", worker: "Background worker", monitoring: "Monitoring",
};

function ComponentNode({ data }: NodeProps<CanvasNode>) {
  const node = data.component;
  const Icon = icons[node.type] ?? Server;
  return <div className={`architecture-node node-${node.type}`}>
    <Handle type="target" position={Position.Left} />
    <div className="node-heading"><span className="node-symbol"><Icon size={18} /></span><span className="node-type">{node.type.replaceAll("-", " ")}</span><span className="node-indicator" /></div>
    <strong>{node.label}</strong><span className="node-tech">{node.technology}</span>
    <Handle type="source" position={Position.Right} />
  </div>;
}
const customNodes = { component: ComponentNode };
const makeNodes = (graph: Architecture): CanvasNode[] => graph.nodes.map(component => ({ id: component.id, type: "component", position: component.position, data: { component } }));
const makeEdge = (edge: ArchitectureEdge) => ({ ...edge, selected: false, animated: true, type: "smoothstep" as const, style: { stroke: "#A3A39C", strokeWidth: 1.4 }, labelStyle: { fill: "#555550", fontSize: 10 }, labelBgStyle: { fill: "#FFFFFF", fillOpacity: 1 } });
const makeEdges = (graph: Architecture) => graph.edges.map(makeEdge);
type CanvasEdge = ReturnType<typeof makeEdge>;
function snapshotGraph(base: Architecture, nodes: CanvasNode[], edges: ReturnType<typeof makeEdges>) {
  return architectureSchema.safeParse({ ...base,
    nodes: nodes.map(node => ({ ...node.data.component, position: node.position })),
    edges: edges.filter(edge => nodes.some(node => node.id === edge.source) && nodes.some(node => node.id === edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, label: edge.label, requestMultiplier: edge.requestMultiplier, metadata: edge.metadata })),
  });
}
function newComponent(type: ComponentType, position: XYPosition): ArchitectureNode {
  const label = labels[type];
  return {
    id: `node-${crypto.randomUUID()}`, type, label, technology: type === "database" ? "Managed SQL" : "Choose a technology",
    description: `${label} responsibilities and operational boundaries are assumptions to define for this design.`, position,
    capacityAssumptions: { maxRps: type === "database" ? 800 : type === "ai" ? 50 : 2000, replicas: 1, cacheHitRatio: type === "cache" ? 0.8 : 0 },
    metadata: { trustBoundary: ["client", "cdn", "external-api"].includes(type) ? "public" : ["ai"].includes(type) ? "external" : "private", notes: "Capacity values are editable assumptions, not measurements." },
  };
}
function fitCanvasAfterUpdate() {
  const afterPaint = (frames: number) => requestAnimationFrame(() => {
    if (frames > 1) afterPaint(frames - 1);
    else document.querySelector<HTMLButtonElement>(".canvas-palette [aria-label='Fit architecture to view']")?.click();
  });
  // Let React Flow commit node measurements before asking its viewport to fit them.
  afterPaint(4);
}

function CanvasPalette({ readOnly, onAdd, onLayout }: { readOnly: boolean; onAdd: (type: ComponentType, position: XYPosition) => void; onLayout: () => void }) {
  const flow = useReactFlow<CanvasNode>();
  const [type, setType] = useState<ComponentType>("service");
  return <Panel position="top-left" className="canvas-palette" aria-label="Canvas tools">
    {!readOnly && <>
    <label className="sr-only" htmlFor="component-palette">Component to add</label>
    <select id="component-palette" value={type} onChange={event => setType(event.target.value as ComponentType)}>
      {nodeTypes.map(nodeType => <option key={nodeType} value={nodeType}>{labels[nodeType]}</option>)}
    </select>
    <button type="button" onClick={() => {
      const pane = document.querySelector<HTMLElement>(".canvas-area .react-flow");
      const rect = pane?.getBoundingClientRect();
      const position = flow.screenToFlowPosition({ x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2, y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2 });
      onAdd(type, position);
    }} aria-label="Add selected component"><Box size={13} /> Add component</button>
    <button type="button" onClick={onLayout} aria-label="Automatically arrange components"><LayoutGrid size={13} /> Arrange</button>
    </>}
    <button type="button" onClick={() => void flow.fitView({ padding: 0.22, duration: 280 })} aria-label="Fit architecture to view">Fit view</button>
  </Panel>;
}

export function CanvasGuide() {
  return <div className="canvas-guide">
    <h2>Build your diagram</h2>
    <ol>
      <li><strong>Move or add.</strong> Drag a component to move it, or choose a type and select <strong>Add component</strong>.</li>
      <li><strong>Connect.</strong> Drag between the dots on two components, or use <strong>Connect to</strong> in the inspector.</li>
      <li><strong>Customize.</strong> <a className="text-link" href="#diagram-inspector">Use the inspector</a> to edit or remove items, or change where a connection starts and ends.</li>
    </ol>
  </div>;
}

export function Canvas({ template, onSave, saving = false, readOnly = false, onDirty, onChange, onValidationChange, incomingGraph }: { template: Architecture; onSave?: (graph: Architecture) => Promise<void>; saving?: boolean; readOnly?: boolean; onDirty?: () => void; onChange?: (graph: Architecture) => void; onValidationChange?: (valid: boolean) => void; incomingGraph?: { graph: Architecture; sequence: number } | null }) {
  const [baseGraph, setBaseGraph] = useState(template);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(makeNodes(template));
  const [edges, setEdges, onEdgesChange] = useEdgesState(makeEdges(template));
  const [selectedId, setSelectedId] = useState<string | null>(template.nodes.find(node => node.id === "api")?.id ?? template.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectionTarget, setConnectionTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [importing, setImporting] = useState(false);
  const studioRef = useRef<HTMLElement>(null), importInputRef = useRef<HTMLInputElement>(null);
  const flowRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const graphRef = useRef<Architecture>(template), undoRef = useRef<Architecture[]>([]), redoRef = useRef<Architecture[]>([]);
  const dragSnapshotRef = useRef<Architecture | null>(null), dragHistoryRecordedRef = useRef(false);
  const appliedIncomingRef = useRef(0);
  const selected = nodes.find(node => node.id === selectedId)?.data.component;
  const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);
  const visibleNodes = useMemo(() => nodes.map(node => {
    if (node.id === selectedId) return { ...node, className: "diagram-item-active" };
    if (node.id === selectedEdge?.source || node.id === selectedEdge?.target) return { ...node, className: "diagram-endpoint" };
    return node;
  }), [nodes, selectedEdge?.source, selectedEdge?.target, selectedId]);
  const visibleEdges = useMemo(() => edges.map(edge => edge.id === selectedEdgeId ? {
    ...edge, className: "diagram-item-active", zIndex: 5, animated: false,
    style: { stroke: "#FF6B00", strokeWidth: 2.5 },
    labelStyle: { fill: "#171717", fontSize: 12, fontWeight: 700 },
    labelBgStyle: { fill: "#FFF4EB", fillOpacity: 1 },
  } : edge), [edges, selectedEdgeId]);
  const componentName = (id: string) => nodes.find(node => node.id === id)?.data.component.label ?? id;
  const selectComponent = useCallback((id: string | null) => {
    setSelectedId(id); setSelectedEdgeId(null); setConnectionTarget("");
  }, []);
  const selectConnection = useCallback((id: string) => {
    setSelectedId(null); setSelectedEdgeId(id); setConnectionTarget("");
  }, []);
  function selectFromInspector(value: string) {
    const id = value.slice(5);
    const isEdge = value.startsWith("edge:");
    setNodes(current => current.map(node => ({ ...node, selected: !isEdge && node.id === id })));
    setEdges(current => current.map(edge => ({ ...edge, selected: isEdge && edge.id === id })));
    if (isEdge) selectConnection(id);
    else selectComponent(id || null);
    const flow = flowRef.current;
    if (!flow || !id) return;
    const edge = isEdge ? edges.find(item => item.id === id) : undefined;
    const targets = edge ? [{ id: edge.source }, { id: edge.target }] : [{ id }];
    void flow.fitView({ nodes: targets, maxZoom: flow.getZoom(), padding: 0.35, duration: 220 });
  }
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
  }, [baseGraph, nodes, edges, onChange, onDirty, onValidationChange, pushUndo]);

  const restoreGraph = useCallback((graph: Architecture, fitView = false) => {
    graphRef.current = graph;
    setBaseGraph(graph); setNodes(makeNodes(graph)); setEdges(makeEdges(graph));
    setSelectedId(currentId => graph.nodes.some(node => node.id === currentId) ? currentId : graph.nodes.find(node => node.id === "api")?.id ?? graph.nodes[0]?.id ?? null);
    setSelectedEdgeId(null); setConnectionTarget("");
    onChange?.(graph); onDirty?.(); onValidationChange?.(true);
    if (fitView) fitCanvasAfterUpdate();
  }, [onChange, onDirty, onValidationChange, setEdges, setNodes]);
  useEffect(() => {
    if (!incomingGraph || incomingGraph.sequence === appliedIncomingRef.current) return;
    appliedIncomingRef.current = incomingGraph.sequence;
    pushUndo(graphRef.current);
    restoreGraph(incomingGraph.graph, true);
    setNotice("Approved AI candidate loaded into the canvas. Review the design; it will autosave to this project.");
  }, [incomingGraph, pushUndo, restoreGraph]);
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
    setNotice(onSave ? "Architecture draft downloaded as JSON. Project changes continue to autosave." : "Architecture exported as JSON. Guest changes stay in this browser session.");
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
        context.fillStyle = "#F7F7F5"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
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
    selectComponent(component.id); onDirty?.(); setNotice(`${labels[type]} added. Customize it in the inspector.`);
  }, [nodes.length, onDirty, readOnly, selectComponent, setNodes]);
  const arrange = useCallback(() => {
    const graph = current();
    if (!graph.success) { setNotice("Fix invalid component details before arranging the canvas."); return; }
    const arranged = layoutArchitecture(graph.data);
    setBaseGraph(arranged); setNodes(makeNodes(arranged)); setNotice("Components arranged by their connections. Cycles remain valid and are grouped safely.");
    fitCanvasAfterUpdate();
  }, [current, setNodes]);

  const connectionProblem = useCallback((source: string, target: string, exceptId?: string) => {
    if (source === target) return "A component cannot connect to itself.";
    if (!nodes.some(node => node.id === source) || !nodes.some(node => node.id === target)) return "Choose two components on the canvas.";
    if (edges.some(edge => edge.id !== exceptId && edge.source === source && edge.target === target)) return "These components already have a connection in that direction.";
    return null;
  }, [edges, nodes]);

  const onConnect = useCallback(({ source, target }: Connection) => {
    if (readOnly) return;
    if (edges.length >= 300) { setNotice("A design can contain at most 300 connections."); return; }
    const problem = connectionProblem(source, target);
    if (problem) { setNotice(problem); return; }
    const edge = makeEdge({ id: `edge-${crypto.randomUUID()}`, source, target, label: "HTTPS", kind: "https", requestMultiplier: 1, metadata: { contract: "Define authentication, payload, timeout, and failure behavior." } });
    setNodes(currentNodes => currentNodes.map(node => node.selected ? { ...node, selected: false } : node));
    setEdges(currentEdges => addEdge({ ...edge, selected: true }, currentEdges.map(item => item.selected ? { ...item, selected: false } : item)));
    selectConnection(edge.id);
    onDirty?.();
    setNotice("Connection added. Edit its details in the inspector.");
  }, [connectionProblem, edges.length, onDirty, readOnly, selectConnection, setEdges, setNodes]);
  function updateComponent(component: ArchitectureNode) {
    onDirty?.();
    setNotice("");
    setNodes(currentNodes => currentNodes.map(node => node.id === component.id ? { ...node, data: { component } } : node));
  }
  function updateConnection(connection: ArchitectureEdge) {
    const previous = edges.find(edge => edge.id === connection.id);
    if (readOnly || !previous) return;
    if (previous.source !== connection.source || previous.target !== connection.target) {
      const problem = connectionProblem(connection.source, connection.target, connection.id);
      if (problem) { setNotice(problem); return; }
    }
    onDirty?.();
    setNotice("");
    setEdges(currentEdges => currentEdges.map(edge => edge.id === connection.id ? { ...edge, ...connection } : edge));
  }
  function removeSelection() {
    if (readOnly) return;
    if (selected) {
      setNodes(currentNodes => currentNodes.filter(node => node.id !== selected.id));
      setEdges(currentEdges => currentEdges.filter(edge => edge.source !== selected.id && edge.target !== selected.id));
      setNotice("Component and its connections removed. Use Undo to restore them.");
    } else if (selectedEdge) {
      setEdges(currentEdges => currentEdges.filter(edge => edge.id !== selectedEdge.id));
      setNotice("Connection removed. Use Undo to restore it.");
    } else return;
    selectComponent(null);
    onDirty?.();
  }
  return <>
    <section ref={studioRef} className="studio-panel" id="canvas" aria-label="Interactive architecture studio">
      <div className="studio-toolbar"><div className="studio-title"><Network size={17} /><strong>Architecture diagram</strong>{readOnly && <span className="status-badge">READ ONLY</span>}</div>
      <div className="studio-actions">
        <Button aria-label="Undo architecture change" title="Undo · Ctrl/⌘ Z" variant="ghost" size="sm" disabled={readOnly || !historyCounts.undo} onClick={undo}><Undo2 size={14} /><span>Undo</span></Button>
        <Button aria-label="Redo architecture change" title="Redo · Ctrl/⌘ Shift Z" variant="ghost" size="sm" disabled={readOnly || !historyCounts.redo} onClick={redo}><Redo2 size={14} /><span>Redo</span></Button>
        {onSave && <Button size="sm" disabled={saving || readOnly} onClick={() => { const graph = current(); if (!graph.success) { setNotice("Check component names and graph bounds before saving."); return; } void onSave(graph.data); }}><Save size={14} /><span>{saving ? "Saving…" : "Save project"}</span></Button>}
        <input ref={importInputRef} type="file" accept="application/json,.json" aria-label="Import architecture JSON file" className="file-input-hidden" disabled={readOnly || importing} onChange={event => void importGraph(event.target.files?.[0])} />
        <Button variant="outline" size="sm" disabled={readOnly || importing} onClick={() => importInputRef.current?.click()}><FileUp size={14} /><span>{importing ? "Importing…" : "Import JSON"}</span></Button>
        <Button aria-label="Export architecture as PNG" title="Export PNG" variant="outline" size="sm" onClick={() => void exportPng()}><Layers3 size={14} /><span>PNG</span></Button>
        <Button aria-label="Export architecture as JSON" title="Export JSON" variant="outline" size="sm" onClick={exportGraph}><ArrowDownToLine size={14} /><span>JSON</span></Button>
      </div></div>
      <div className="studio-body"><div className="canvas-area">
        <div className="canvas-caption"><span className="live-dot" />HOLOCANVAS <span>/</span> DESIGN VIEW</div>
        <ReactFlow<CanvasNode, CanvasEdge> nodes={visibleNodes} edges={visibleEdges} nodeTypes={customNodes} nodesDraggable={!readOnly} nodesConnectable={!readOnly} onInit={flow => { flowRef.current = flow; }} onNodesChange={changes => { const allowed = readOnly ? changes.filter(change => change.type === "select" || change.type === "dimensions") : changes; if (allowed.some(change => change.type === "position" || change.type === "remove")) onDirty?.(); onNodesChange(allowed); }} onEdgesChange={changes => { const allowed = readOnly ? changes.filter(change => change.type === "select") : changes; if (allowed.some(change => change.type === "remove")) onDirty?.(); onEdgesChange(allowed); }} onNodeDragStart={() => { dragSnapshotRef.current = graphRef.current; dragHistoryRecordedRef.current = false; }} onNodeDragStop={() => { dragSnapshotRef.current = null; dragHistoryRecordedRef.current = false; }} onConnect={onConnect} onNodeClick={(_, node) => selectComponent(node.id)} onEdgeClick={(_, edge) => selectConnection(edge.id)} onPaneClick={() => selectComponent(null)}
          edgesReconnectable={!readOnly}
          onReconnect={(edge, connection) => updateConnection({ ...edge, source: connection.source, target: connection.target })}
          fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.18} maxZoom={1.75} colorMode="light" deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]} tabIndex={0} aria-label={readOnly ? "Read-only architecture canvas. Select a component or connection to inspect it." : "Architecture canvas. Select a component or connection to edit it."}>
          <CanvasPalette readOnly={readOnly} onAdd={addComponent} onLayout={arrange} />
          <Background variant={BackgroundVariant.Dots} color="#D8D8D2" gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ width: 118, height: 78 }} nodeColor="#BDBDB5" maskColor="rgba(247,247,245,.72)" />
        </ReactFlow>
        {!nodes.length && <div className="canvas-empty-state"><strong>Your canvas is empty</strong>{!readOnly && <p>Choose a component type and select Add component to get started.</p>}</div>}
        <div className="canvas-legend"><span />Request flow<span className="legend-active" />Selected connection</div>
      </div><aside className="inspector" id="diagram-inspector" aria-label="Diagram inspector"><div className="inspector-label"><Box size={15} />{readOnly ? "DIAGRAM DETAILS" : "EDIT DIAGRAM DETAILS"}</div>
      <label className="inspector-picker">Inspect a component or connection
        <select value={selected ? `node:${selected.id}` : selectedEdge ? `edge:${selectedEdge.id}` : ""} onChange={event => selectFromInspector(event.target.value)}>
          <option value="">Choose an item</option>
          <optgroup label="Components">{nodes.map(node => <option key={node.id} value={`node:${node.id}`}>{node.data.component.label || "Unnamed component"}</option>)}</optgroup>
          {edges.length > 0 && <optgroup label="Connections">{edges.map(edge => <option key={edge.id} value={`edge:${edge.id}`}>{componentName(edge.source)} → {componentName(edge.target)}{edge.label ? ` · ${edge.label}` : ""}</option>)}</optgroup>}
        </select>
      </label>
      {selected ? <>
        <div className={`inspector-symbol node-${selected.type}`}>{(() => { const Icon = icons[selected.type] ?? Server; return <Icon size={23} />; })()}</div><h3>{selected.label}</h3><span className="type-label">{selected.type.replaceAll("-", " ")}</span>
        <ComponentFields node={selected} readOnly={readOnly} typeLabels={labels} onChange={updateComponent} />
        {!readOnly && <div className="inspector-fields inspector-connect">
          <label>Connect to<select value={connectionTarget} onChange={event => setConnectionTarget(event.target.value)}>
            <option value="">Choose a destination</option>
            {nodes.filter(node => !connectionProblem(selected.id, node.id)).map(node => <option key={node.id} value={node.id}>{node.data.component.label}</option>)}
          </select></label>
          <Button variant="outline" size="sm" disabled={!nodes.some(node => node.id === connectionTarget)} onClick={() => {
            onConnect({ source: selected.id, target: connectionTarget, sourceHandle: null, targetHandle: null });
            setConnectionTarget("");
          }}>Add connection</Button>
        </div>}
      </> : selectedEdge ? <>
        <h3>{componentName(selectedEdge.source)} → {componentName(selectedEdge.target)}</h3>
        <ConnectionFields key={`${selectedEdge.id}:${selectedEdge.source}:${selectedEdge.target}`} edge={selectedEdge} readOnly={readOnly} components={nodes.map(node => node.data.component)} endpointProblem={(source, target) => connectionProblem(source, target, selectedEdge.id)} onChange={updateConnection} />
      </> : <div className="inspector-empty"><CircleDot size={28} /><h3>Choose an item</h3><p>Select a component or connection on the diagram or from the list above.</p></div>}
      {!readOnly && (selectedEdge || selected) && <Button className="inspector-remove" variant="ghost" size="sm" onClick={removeSelection}><Trash2 size={14} />Remove {selectedEdge ? "connection" : "component"}</Button>}
      </aside></div>
      <div className="studio-footer"><span><span className="status-dot" />{nodes.length} components <span className="separator">·</span> {edges.length} connections</span><span>{readOnly ? "View only" : "Project edits save automatically"}</span></div>
    </section><p role="status" className="export-notice">{notice || "Tip: select a component or connection to edit its details."}</p>
  </>;
}
