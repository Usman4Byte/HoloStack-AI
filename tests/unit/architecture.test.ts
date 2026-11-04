import { describe, expect, it } from "vitest";
import { architectureSchema } from "@/domain/architecture/schema";
import { templates } from "@/domain/architecture/templates";

describe("architecture trust boundary", () => {
  it("validates all seven authored templates", () => {
    expect(templates).toHaveLength(7);
    for (const graph of templates) expect(architectureSchema.safeParse(graph).success).toBe(true);
  });
  it("rejects dangling references, duplicates, and self connections", () => {
    const base = templates[0];
    expect(architectureSchema.safeParse({ ...base, nodes: [...base.nodes, base.nodes[0]] }).success).toBe(false);
    expect(architectureSchema.safeParse({ ...base, edges: [...base.edges, base.edges[0]] }).success).toBe(false);
    expect(architectureSchema.safeParse({ ...base, edges: [{ ...base.edges[0], target: "missing" }] }).success).toBe(false);
    expect(architectureSchema.safeParse({ ...base, edges: [{ ...base.edges[0], target: base.edges[0].source }] }).success).toBe(false);
  });
  it("rejects unbounded, non-finite, and invalid capacity assumptions", () => {
    for (const maxRps of [0, -1, Infinity, NaN, 1e10]) {
      const base = structuredClone(templates[0]);
      base.nodes[0].capacityAssumptions.maxRps = maxRps;
      expect(architectureSchema.safeParse(base).success).toBe(false);
    }
    const base = structuredClone(templates[0]); base.nodes[0].capacityAssumptions.cacheHitRatio = 1.1;
    expect(architectureSchema.safeParse(base).success).toBe(false);
  });
  it("rejects unsupported node types and unexpected properties", () => {
    const base = templates[0];
    expect(architectureSchema.safeParse({ ...base, nodes: [{ ...base.nodes[0], type: "made-up" }] }).success).toBe(false);
    expect(architectureSchema.safeParse({ ...base, apiKey: "not-allowed" }).success).toBe(false);
  });
  it("permits multi-node feedback loops but never self loops", () => {
    const base = templates[0];
    const reverse = { ...base.edges[0], id: "response", source: base.edges[0].target, target: base.edges[0].source };
    expect(architectureSchema.safeParse({ ...base, edges: [...base.edges, reverse] }).success).toBe(true);
  });
  it("caps graph size at the public validation boundary", () => {
    const base = templates[0];
    expect(architectureSchema.safeParse({ ...base, nodes: [], edges: [] }).success).toBe(true);
    expect(architectureSchema.safeParse({ ...base, nodes: [] }).success).toBe(false);
    const nodes = Array.from({ length: 101 }, (_, i) => ({ ...base.nodes[0], id: `node-${i}` }));
    expect(architectureSchema.safeParse({ ...base, nodes, edges: [] }).success).toBe(false);
  });
});
