import { architectureSchema, type Architecture } from "./schema";

/** Builds a deterministic, authored cache example. It is not an AI proposal or an applied change. */
export function buildPreparedCacheVariant(graph: Architecture): Architecture | null {
  if (graph.nodes.length >= 100 || graph.edges.length >= 300 || graph.assumptions.length >= 50) return null;
  if (graph.nodes.some(node => node.type === "cache")) return null;
  const databaseIds = new Set(graph.nodes.filter(node => node.type === "database").map(node => node.id));
  const serviceIds = new Set(graph.nodes.filter(node => ["service", "web-app", "api-gateway"].includes(node.type)).map(node => node.id));
  const path = graph.edges.find(edge => serviceIds.has(edge.source) && databaseIds.has(edge.target));
  if (!path) return null;

  const usedNodeIds = new Set(graph.nodes.map(node => node.id));
  let cacheId = "prepared-cache", suffix = 1;
  while (usedNodeIds.has(cacheId)) cacheId = `prepared-cache-${suffix++}`;
  const usedEdgeIds = new Set(graph.edges.map(edge => edge.id));
  let incomingId = `prepared-${path.id}-cache`, outgoingId = `prepared-cache-${path.id}`;
  while (usedEdgeIds.has(incomingId) || usedEdgeIds.has(outgoingId)) {
    incomingId = `prepared-${path.id}-cache-${suffix}`;
    outgoingId = `prepared-cache-${path.id}-${suffix++}`;
  }
  const database = graph.nodes.find(node => node.id === path.target)!;
  const insertionX = database.position.x;
  const laneShift = 280;
  const cache = {
    id: cacheId,
    type: "cache" as const,
    label: "Prepared read cache",
    description: "An educational cache boundary for the modeled database read path. Choose invalidation, freshness, and tenant-key policies before adopting this design.",
    technology: "Example key/value cache",
    position: { x: insertionX, y: graph.nodes.find(node => node.id === path.source)!.position.y },
    capacityAssumptions: { maxRps: 2000, replicas: 1, cacheHitRatio: 0.65 },
    metadata: { trustBoundary: "private" as const, notes: "Prepared local comparison only. The 65% hit ratio is an illustrative assumption, not measured behavior." },
  };
  const remainingEdges = graph.edges.filter(edge => edge.id !== path.id);
  const edges = [
    ...remainingEdges,
    { ...path, id: incomingId, target: cacheId, label: "Read lookup", metadata: { contract: "Illustrative cache lookup. Define tenant scoping, consistency, and bounded fallback behavior." } },
    { ...path, id: outgoingId, source: cacheId, label: "Cache miss", metadata: { contract: "Only modeled misses continue to the database; writes and invalidation are simplified assumptions." } },
  ];
  const candidate = architectureSchema.parse({
    ...graph,
    name: `${graph.name.slice(0, 88)} · prepared cache variant`,
    assumptions: [...graph.assumptions, "Prepared local example: a private read cache is inserted before the modeled database. It is not an AI-generated recommendation, measured performance improvement, or production configuration."],
    nodes: [...graph.nodes.map(node => node.position.x >= insertionX ? {
      ...node,
      position: { ...node.position, x: node.position.x + laneShift },
    } : node), cache],
    edges,
  });
  return candidate;
}
