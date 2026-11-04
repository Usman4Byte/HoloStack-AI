"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { architectureSvg } from "@/domain/architecture/studio";
import { templates } from "@/domain/architecture/templates";

const choices = templates.slice(0, 3);

export function MarketingArchitecturePreview() {
  const [selectedId, setSelectedId] = useState(choices[0].id);
  const graph = choices.find(item => item.id === selectedId) ?? choices[0];
  const source = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(architectureSvg(graph).svg)}`, [graph]);
  const database = graph.nodes.find(node => node.type === "database");
  return <div className="hero-product-frame" id="product-preview" aria-label={`Architecture preview of ${graph.name}`}>
    <div className="hero-product-bar"><strong>HOLOCANVAS <span>/</span> DESIGN VIEW</strong><span>AUTHORED TEMPLATE · {graph.nodes.length} COMPONENTS</span></div>
    <div className="hero-template-picker" role="tablist" aria-label="Preview architecture templates">{choices.map(template => <button type="button" key={template.id} role="tab" aria-selected={selectedId === template.id} onClick={() => setSelectedId(template.id)}>{template.name}</button>)}</div>
    <div className="hero-product-canvas"><Image unoptimized priority src={source} alt={`Architecture graph for ${graph.name}`} width={900} height={540} /><span className="hero-flow-mark" aria-hidden="true" /></div>
    <div className="hero-product-inspector"><strong>{database?.label ?? graph.nodes[0]?.label ?? "Empty canvas"}</strong><span>{database?.technology ?? graph.nodes[0]?.technology ?? "Add a component to begin"}</span><span className="status-pill">Selected component</span></div>
    <span className="hero-index">DESIGN / 001</span>
  </div>;
}
