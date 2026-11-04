import { describe, expect, it } from "vitest";
import { templates } from "@/domain/architecture/templates";
import { architectureSchema } from "@/domain/architecture/schema";
import { applyArchitectureChanges, buildGeneratedArchitecture } from "@/domain/ai/architecture";
import { assistantResultSchema, generatedArchitectureSchema } from "@/domain/ai/schema";

const base = templates[0];
const generated = {
  name: "Project Atlas", description: "A private data assistant.", requirements: "A multi-tenant document assistant.",
  assumptions: ["Single region for first release."], tradeoffs: ["Managed retrieval reduces operational work but adds a provider boundary."],
  nodes: [
    { id: "client", type: "client", label: "Web client", description: "Capture user questions.", technology: "Next.js", trustBoundary: "public", notes: "Treat all input as untrusted." },
    { id: "api", type: "service", label: "Application API", description: "Authorize requests.", technology: "Next.js Route Handlers", trustBoundary: "private", notes: "Use tenant-scoped queries." },
  ],
  edges: [{ id: "request", source: "client", target: "api", kind: "https", label: "Question", contract: "Authenticated HTTPS request." }],
};

describe("AI workflow schemas and deterministic application", () => {
  it("validates architecture content and rejects unknown fields or invalid node types", () => {
    expect(generatedArchitectureSchema.safeParse(generated).success).toBe(true);
    expect(generatedArchitectureSchema.safeParse({ ...generated, hiddenPrompt: "bad" }).success).toBe(false);
    expect(generatedArchitectureSchema.safeParse({ ...generated, nodes: [{ ...generated.nodes[0], type: "made-up" }] }).success).toBe(false);
  });

  it("builds a complete valid graph, and reports referential-integrity failures", () => {
    const result = buildGeneratedArchitecture(generated as never, "graph-1", "2026-11-04T00:00:00.000Z");
    expect(architectureSchema.safeParse(result).success).toBe(true);
    expect(result.nodes.find(node => node.id === "api")?.capacityAssumptions.maxRps).toBe(1000);
    expect(result.assumptions.at(-1)).toMatch(/not benchmark measurements/);
    expect(result.nodes[0].position).not.toEqual(result.nodes[1].position);
    expect(() => buildGeneratedArchitecture({ ...generated, edges: [{ ...generated.edges[0], target: "missing" }] } as never, "graph-1", "2026-11-04T00:00:00.000Z")).toThrow();
  });

  it("applies a validated candidate locally while keeping capacity assumptions untouched", () => {
    const oldApi = base.nodes.find(node => node.id === "api")!;
    const result = applyArchitectureChanges(base, [{ operation: "update_node", targetId: "api", node: { id: "api", type: "service", label: "Private API", description: "Tenant-scoped request boundary.", technology: "Next.js", trustBoundary: "private", notes: "Validate identity on each request." }, edge: null }]);
    expect(result.nodes.find(node => node.id === "api")?.label).toBe("Private API");
    expect(result.nodes.find(node => node.id === "api")?.capacityAssumptions).toEqual(oldApi.capacityAssumptions);
    expect(base.nodes.find(node => node.id === "api")?.label).toBe(oldApi.label);
    expect(() => applyArchitectureChanges(base, [{ operation: "remove_node", targetId: "not-here", node: null, edge: null }])).toThrow(/no longer exists/);
  });

  it("rejects malformed assistant outputs", () => {
    expect(assistantResultSchema.safeParse({ answer: "Consider an explicit queue boundary.", changes: [], tradeoffs: [] }).success).toBe(true);
    expect(assistantResultSchema.safeParse({ answer: "", changes: [], tradeoffs: [] }).success).toBe(false);
  });
});
