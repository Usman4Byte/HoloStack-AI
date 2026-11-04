import { architectureSchema, type Architecture, type ArchitectureNode } from "./schema";

export const MAX_ARCHITECTURE_IMPORT_BYTES = 256 * 1024;

export function parseArchitectureImport(text: string): Architecture {
  if (new TextEncoder().encode(text).byteLength > MAX_ARCHITECTURE_IMPORT_BYTES) {
    throw new Error("This file is larger than the 256 KiB architecture import limit.");
  }
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error("This file is not valid JSON."); }
  const result = architectureSchema.safeParse(value);
  if (!result.success) throw new Error("This JSON does not match a valid HoloStack architecture. Check component IDs, connections, and required fields.");
  return result.data;
}

export function layoutArchitecture(graph: Architecture): Architecture {
  const indegree = new Map(graph.nodes.map(node => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const ready = graph.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id).sort();
  const levels = new Map(graph.nodes.map(node => [node.id, 0]));
  const visited = new Set<string>();
  while (ready.length) {
    const id = ready.shift()!;
    visited.add(id);
    for (const target of outgoing.get(id) ?? []) {
      levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(id) ?? 0) + 1));
      indegree.set(target, (indegree.get(target) ?? 1) - 1);
      if (indegree.get(target) === 0) {
        ready.push(target);
        ready.sort();
      }
    }
  }

  // Cycles are valid architecture; keep unresolved cyclic components in one bounded final layer.
  const unresolved = graph.nodes.filter(node => !visited.has(node.id)).map(node => node.id).sort();
  const cycleLayer = Math.max(0, ...levels.values()) + (unresolved.length ? 1 : 0);
  for (const id of unresolved) levels.set(id, cycleLayer);
  const groups = new Map<number, ArchitectureNode[]>();
  for (const node of graph.nodes) {
    const layer = levels.get(node.id) ?? 0;
    groups.set(layer, [...(groups.get(layer) ?? []), node]);
  }
  for (const group of groups.values()) group.sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

  const maxLayer = Math.max(0, ...groups.keys());
  const maxRows = Math.max(1, ...[...groups.values()].map(group => group.length));
  const columnGap = maxLayer ? Math.min(310, 8500 / maxLayer) : 0;
  const rowGap = maxRows > 1 ? Math.min(160, 8500 / (maxRows - 1)) : 0;
  const layerStart = Math.max(0, 70 + (maxLayer ? (8500 - maxLayer * columnGap) / 2 : 0));
  return architectureSchema.parse({ ...graph, nodes: graph.nodes.map(node => {
    const layer = levels.get(node.id) ?? 0;
    const group = groups.get(layer) ?? [node];
    const row = group.findIndex(item => item.id === node.id);
    return { ...node, position: { x: Math.round(layerStart + layer * columnGap), y: Math.round(70 + row * rowGap) } };
  }) });
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function architectureSvg(graph: Architecture) {
  const nodeWidth = 230, nodeHeight = 112, padding = 72;
  const minX = Math.min(0, ...graph.nodes.map(node => node.position.x));
  const minY = Math.min(0, ...graph.nodes.map(node => node.position.y));
  const maxX = Math.max(0, ...graph.nodes.map(node => node.position.x + nodeWidth));
  const maxY = Math.max(0, ...graph.nodes.map(node => node.position.y + nodeHeight));
  const width = Math.max(760, Math.ceil(maxX - minX + padding * 2));
  const height = Math.max(460, Math.ceil(maxY - minY + padding * 2));
  const ox = padding - minX, oy = padding - minY;
  const positions = new Map(graph.nodes.map(node => [node.id, { x: node.position.x + ox, y: node.position.y + oy }]));
  const edges = graph.edges.map(edge => {
    const source = positions.get(edge.source), target = positions.get(edge.target);
    if (!source || !target) return "";
    const x1 = source.x + nodeWidth, y1 = source.y + nodeHeight / 2;
    const x2 = target.x, y2 = target.y + nodeHeight / 2;
    const middle = (x1 + x2) / 2;
    return `<path d="M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}" fill="none" stroke="#6db8c0" stroke-width="2" stroke-dasharray="8 7" marker-end="url(#arrow)"/><text x="${middle}" y="${(y1 + y2) / 2 - 8}" fill="#aec3d1" font-size="11" text-anchor="middle">${escapeXml(edge.label)}</text>`;
  }).join("");
  const nodes = graph.nodes.map(node => {
    const position = positions.get(node.id)!;
    const label = node.label.length > 28 ? `${node.label.slice(0, 27)}…` : node.label;
    const technology = node.technology.length > 34 ? `${node.technology.slice(0, 33)}…` : node.technology;
    const ai = node.type === "ai";
    return `<g><rect x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}" rx="14" fill="${ai ? "#231f34" : "#142432"}" stroke="${ai ? "#856eb1" : "#46748a"}" stroke-width="1.5"/><circle cx="${position.x + 23}" cy="${position.y + 25}" r="5" fill="#8de6de"/><text x="${position.x + 38}" y="${position.y + 29}" fill="#9eb8c7" font-size="11" letter-spacing="1">${escapeXml(node.type.replaceAll("-", " ").toUpperCase())}</text><text x="${position.x + 17}" y="${position.y + 64}" fill="#e5eef5" font-size="16" font-weight="600">${escapeXml(label)}</text><text x="${position.x + 17}" y="${position.y + 88}" fill="#91aabd" font-size="12">${escapeXml(technology)}</text></g>`;
  }).join("");
  const title = escapeXml(graph.name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0b121d"/><stop offset="1" stop-color="#101c29"/></linearGradient><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#304354"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#6db8c0"/></marker></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#dots)"/><text x="${padding}" y="35" fill="#87d9d2" font-size="12" letter-spacing="2">HOLOSTACK AI · ARCHITECTURE</text><text x="${width - padding}" y="35" fill="#b8c8d8" font-size="13" text-anchor="end">${title}</text><g>${edges}${nodes}</g><text x="${width - padding}" y="${height - 24}" fill="#758da1" font-size="10" text-anchor="end">Design model · assumptions are not measured infrastructure telemetry</text></svg>`;
  return { svg, width, height };
}
