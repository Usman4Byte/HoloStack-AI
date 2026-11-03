"use client";

import { useCallback, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Position, ReactFlow, addEdge, useEdgesState, useNodesState, type Connection, type Node, type NodeProps } from "@xyflow/react";
import { ArrowDownToLine, ArrowRight, Box, Braces, Check, ChevronRight, CircleDot, Cloud, Code2, Database, Globe, Layers3, LockKeyhole, Network, RotateCcw, Server, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { architectureSchema, type Architecture, type ArchitectureNode } from "@/domain/architecture/schema";
import { templates } from "@/domain/architecture/templates";

type CanvasNode = Node<{ component: ArchitectureNode }, "component">;
const icons: Partial<Record<ArchitectureNode["type"], typeof Server>> = { client: Globe, database: Database, ai: Sparkles, auth: LockKeyhole, "object-storage": Cloud, cache: Zap, queue: Workflow, cdn: Globe };

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
const makeEdges = (graph: Architecture) => graph.edges.map(edge => ({ ...edge, animated: true, type: "smoothstep", style: { stroke: "#48758e", strokeWidth: 1.4 }, labelStyle: { fill: "#9baec3", fontSize: 10 }, labelBgStyle: { fill: "#101923", fillOpacity: 1 } }));

function Canvas({ template }: { template: Architecture }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(makeNodes(template));
  const [edges, setEdges, onEdgesChange] = useEdgesState(makeEdges(template));
  const [selectedId, setSelectedId] = useState<string | null>("api");
  const [notice, setNotice] = useState("");
  const selected = nodes.find(node => node.id === selectedId)?.data.component;
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return;
    setEdges(current => addEdge({ ...connection, id: crypto.randomUUID(), animated: true, type: "smoothstep", label: "HTTPS", kind: "https", requestMultiplier: 1, metadata: { contract: "Define authentication, payload, and failure handling." } }, current));
  }, [setEdges]);
  function updateSelected(field: "label" | "technology", value: string) {
    setNodes(current => current.map(node => node.id === selectedId ? { ...node, data: { component: { ...node.data.component, [field]: value } } } : node));
  }
  function exportGraph() {
    const graph = architectureSchema.safeParse({ ...template,
      nodes: nodes.map(node => ({ ...node.data.component, position: node.position })),
      edges: edges.filter(edge => nodes.some(node => node.id === edge.source) && nodes.some(node => node.id === edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, label: edge.label, requestMultiplier: edge.requestMultiplier, metadata: edge.metadata })),
    });
    if (!graph.success) { setNotice("Export needs at least one component, nonempty names, and positions within the canvas bounds."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(graph.data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `holostack-${template.id}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Architecture exported as JSON. This does not save it to the cloud.");
  }
  return <>
    <section className="studio-panel" id="canvas" aria-label="Interactive sample architecture">
      <div className="studio-toolbar"><div className="studio-title"><Network size={17} /><strong>{template.name}</strong><span className="sample-badge">SAMPLE</span></div><div className="studio-actions"><Button aria-label="Reset sample" variant="ghost" size="sm" onClick={() => { setNodes(makeNodes(template)); setEdges(makeEdges(template)); setNotice("Sample reset."); }}><RotateCcw size={14} /><span>Reset</span></Button><Button variant="outline" size="sm" onClick={exportGraph}><ArrowDownToLine size={14} /><span>Export JSON</span></Button></div></div>
      <div className="studio-body"><div className="canvas-area">
        <div className="canvas-caption"><span className="live-dot" />HOLOCANVAS <span>/</span> DESIGN VIEW</div>
        <ReactFlow<CanvasNode, ReturnType<typeof makeEdges>[number]> nodes={nodes} edges={edges} nodeTypes={customNodes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.25} maxZoom={1.5} colorMode="dark" deleteKeyCode={["Backspace", "Delete"]} aria-label="Architecture canvas. Select a component to edit its name and technology." >
          <Background variant={BackgroundVariant.Dots} color="#2c3a4b" gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ width: 95, height: 62 }} nodeColor="#294e61" maskColor="rgba(9,14,22,.7)" />
        </ReactFlow>
        <div className="canvas-legend"><span />Request flow<span className="legend-violet" />External boundary</div>
      </div><aside className="inspector" aria-label="Component inspector"><div className="inspector-label"><Box size={15} />COMPONENT INSPECTOR</div>{selected ? <>
        <div className={`inspector-symbol node-${selected.type}`}>{(() => { const Icon = icons[selected.type] ?? Server; return <Icon size={23} />; })()}</div><h3>{selected.label}</h3><span className="type-label">{selected.type.replaceAll("-", " ")}</span>
        <label className="field-label" htmlFor="node-label">Component name</label><input id="node-label" maxLength={100} value={selected.label} onChange={event => updateSelected("label", event.target.value)} />
        <label className="field-label" htmlFor="node-technology">Technology</label><input id="node-technology" maxLength={200} value={selected.technology} onChange={event => updateSelected("technology", event.target.value)} />
        <div className="inspector-section"><span className="field-label">Responsibility</span><p>{selected.description}</p></div>
        <div className="boundary"><ShieldCheck size={15} /><span>{selected.metadata.trustBoundary} boundary</span></div>
        <div className="inspector-note">Sample design only. No services are provisioned or monitored.</div>
      </> : <div className="inspector-empty"><CircleDot size={28} /><h3>Explore the system</h3><p>Select a component to inspect its responsibility and edit its details.</p></div>}</aside></div>
      <div className="studio-footer"><span><span className="status-dot" />{nodes.length} components <span className="separator">·</span> {edges.length} connections</span><span>Drag to arrange <span className="separator">·</span> Changes stay in this tab</span></div>
    </section><p role="status" className="export-notice">{notice || "Tip: select a node to edit it, connect its handles to add a flow, or press Delete to remove a selected element."}</p>
  </>;
}

export function SampleStudio() {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [revision, setRevision] = useState(0);
  return <main className="overview-main">
    <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR ARCHITECTURE WORKSPACE</div><h1>Big ideas. <span>Better systems.</span></h1><p>Bring your next system into focus, one connection at a time.</p></div><Button asChild variant="outline"><a href="/setup"><Database size={16} />Connect your database<ArrowRight size={15} /></a></Button></div>
    <section className="intro-grid" aria-label="Workspace introduction"><div className="hero-card"><div className="hero-copy"><span className="pill"><Sparkles size={13} /> BUILT FOR SYSTEM THINKERS</span><h2>See the architecture.<br /><span>Understand the possibilities.</span></h2><p>Start with a grounded template. Explore the components,<br className="desktop-break" /> trace the connections, and make the design your own.</p><Button asChild><a href="#canvas">Explore sample architecture<ArrowRight size={16} /></a></Button><div className="hero-footnote"><Check size={13} />Interactive local sample <span>·</span> No API key needed</div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-core"><Layers3 size={51} strokeWidth={1} /></div><div className="art-satellite sat-one"><Database size={20} /></div><div className="art-satellite sat-two"><Code2 size={21} /></div><div className="art-satellite sat-three"><Cloud size={22} /></div><span className="art-coordinate">SYSTEM / 001</span></div></div>
      <div className="readiness-card"><div className="card-kicker"><span className="status-dot" /> PROJECT FOUNDATION</div><h3>A clear path to live.</h3><p>The workspace starts in sample mode. Connect TiDB to continue building persistence.</p><div className="readiness-row"><span className="step-check"><Check size={12} /></span><span>Application scaffold</span><span className="done-label">Ready</span></div><div className="readiness-row"><span className="step-number">2</span><span>Database verification</span><span className="pending-label">Pending</span></div><div className="readiness-row"><span className="step-number">3</span><span>Auth & saved projects</span><span className="muted">Next</span></div><a href="/setup" className="text-link">Continue setup<ArrowRight size={14} /></a></div></section>
    <section id="templates" className="templates-section"><div className="section-heading"><div><h2>Start with a blueprint <span>07</span></h2><p>Real patterns. Explicit assumptions. A starting point for your thinking.</p></div><span className="section-meta">LOCALLY AUTHORED TEMPLATES</span></div><div className="template-grid">{templates.map((template, index) => { const Icon = [Sparkles, Globe, Network, Cloud, Braces, Workflow, Zap][index]; return <button key={template.id} className={`template-card ${selectedTemplate.id === template.id ? "template-active" : ""}`} onClick={() => { setSelectedTemplate(template); setRevision(value => value + 1); }} aria-pressed={selectedTemplate.id === template.id}><span className={`template-icon template-icon-${index}`}><Icon size={19} /></span><strong>{template.name}</strong><span>{template.nodes.length} components <ChevronRight size={13} /></span></button>; })}</div></section>
    <div className="section-heading canvas-heading"><div><h2>Your system, connected.</h2><p>A working canvas to explore structure and intent.</p></div><span className="sample-mode"><span />Sample mode · not saved</span></div>
    <Canvas key={`${selectedTemplate.id}-${revision}`} template={selectedTemplate} />
    <div className="workspace-note"><ShieldCheck size={16} /><p>Designed for honest engineering. Samples are authored fixtures; capacity assumptions are not measured performance. AI generation, authentication, and cloud saving are upcoming milestones.</p><a href="/setup">Build status<ArrowUpRightIcon /></a></div>
  </main>;
}
function ArrowUpRightIcon() { return <ArrowRight size={14} style={{ transform: "rotate(-45deg)" }} />; }
