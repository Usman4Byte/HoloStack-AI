import { z } from "zod";

export const nodeTypes = ["client", "cdn", "load-balancer", "api-gateway", "web-app", "service", "auth", "database", "cache", "queue", "object-storage", "search", "external-api", "ai", "worker", "monitoring"] as const;
const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().max(4000);
export const architectureNodeSchema = z.object({
  id: identifier, type: z.enum(nodeTypes), label: z.string().min(1).max(100),
  description: text, technology: z.string().max(200),
  position: z.object({ x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000) }),
  capacityAssumptions: z.object({
    maxRps: z.number().finite().positive().max(1e9),
    replicas: z.number().int().min(1).max(10000),
    cacheHitRatio: z.number().min(0).max(1),
  }),
  metadata: z.object({ trustBoundary: z.enum(["public", "private", "external"]), notes: text }),
}).strict();

export const architectureEdgeSchema = z.object({
  id: identifier, source: identifier, target: identifier,
  kind: z.enum(["https", "query", "event", "stream"]), label: z.string().max(100),
  requestMultiplier: z.number().finite().min(0).max(1000),
  metadata: z.object({ contract: text }),
}).strict();

export const architectureSchema = z.object({
  id: identifier, name: z.string().min(1).max(120), version: z.number().int().positive(),
  description: text, requirements: text, assumptions: z.array(z.string().max(1000)).max(50),
  nodes: z.array(architectureNodeSchema).min(1).max(100),
  edges: z.array(architectureEdgeSchema).max(300),
  createdAt: z.iso.datetime(),
}).strict().superRefine((graph, ctx) => {
  const nodes = new Set<string>();
  graph.nodes.forEach((node, index) => {
    if (nodes.has(node.id)) ctx.addIssue({ code: "custom", path: ["nodes", index, "id"], message: "Duplicate node ID" });
    nodes.add(node.id);
  });
  const edges = new Set<string>();
  graph.edges.forEach((edge, index) => {
    if (edges.has(edge.id)) ctx.addIssue({ code: "custom", path: ["edges", index, "id"], message: "Duplicate edge ID" });
    edges.add(edge.id);
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) ctx.addIssue({ code: "custom", path: ["edges", index], message: "Edge references a missing component" });
    if (edge.source === edge.target) ctx.addIssue({ code: "custom", path: ["edges", index], message: "Self connections are not supported" });
  });
  // Cycles across services are valid architecture, e.g. event feedback loops.
  // ScaleLab must detect cycles and bound propagation instead of assuming a DAG.
});

export type Architecture = z.infer<typeof architectureSchema>;
export type ArchitectureNode = z.infer<typeof architectureNodeSchema>;
export type ArchitectureEdge = z.infer<typeof architectureEdgeSchema>;
