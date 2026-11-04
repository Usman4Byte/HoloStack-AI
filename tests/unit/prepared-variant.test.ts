import { describe, expect, it } from "vitest";
import { buildPreparedCacheVariant } from "@/domain/architecture/prepared-cache-variant";
import { architectureSchema } from "@/domain/architecture/schema";
import { templates } from "@/domain/architecture/templates";
import { architectureDiff } from "@/domain/ai/architecture";

describe("prepared deterministic sample variant", () => {
  it("builds a valid cache comparison locally and leaves the authored graph unchanged", () => {
    const source = structuredClone(templates[0]);
    const baseline = structuredClone(source);
    const candidate = buildPreparedCacheVariant(source);
    expect(candidate).not.toBeNull();
    expect(architectureSchema.safeParse(candidate).success).toBe(true);
    expect(source).toEqual(baseline);
    expect(candidate!.nodes).toHaveLength(source.nodes.length + 1);
    expect(candidate!.edges).toHaveLength(source.edges.length + 1);
    const cache = candidate!.nodes.find(node => node.id === "prepared-cache")!;
    const database = candidate!.nodes.find(node => node.id === "knowledge")!;
    expect(cache.capacityAssumptions.cacheHitRatio).toBe(0.65);
    expect(database.position.x - cache.position.x).toBe(280);
    expect(Math.max(...candidate!.nodes.map(node => node.position.x))).toBeLessThan(2000);
    expect(candidate!.assumptions.at(-1)).toMatch(/not an AI-generated recommendation/);
    const diff = architectureDiff(source, candidate!);
    expect(diff.addedNodes.map(node => node.label)).toEqual(["Prepared read cache"]);
    expect(diff.addedEdges).toHaveLength(2);
    expect(diff.removedEdges).toHaveLength(1);
    expect(buildPreparedCacheVariant(source)).toEqual(candidate);
  });

  it("declines a prepared cache comparison when the graph already has a cache or no service-to-database path", () => {
    expect(buildPreparedCacheVariant(templates.find(template => template.id === "commerce")!)).toBeNull();
    const disconnected = { ...templates[0], edges: templates[0].edges.filter(edge => !(edge.source === "api" && edge.target === "knowledge")) };
    expect(buildPreparedCacheVariant(disconnected)).toBeNull();
  });
});
