import { describe, expect, it } from "vitest";
import { architectureSchema } from "@/domain/architecture/schema";
import { templates } from "@/domain/architecture/templates";
import { buildArchitectureReport, reviewArchitecture, simulateCapacity } from "@/domain/intelligence/engine";
import { workloadPresets, workloadSchema } from "@/domain/intelligence/schema";

function graph(input: { types: string[]; edges: { source: string; target: string; multiplier?: number }[]; replicas?: number[]; maxRps?: number[]; hit?: number[]; requirements?: string } ) {
  const base = templates[0];
  const nodes = input.types.map((type, index) => ({ id: `n${index}`, type, label: `Node ${index}`, description: "Test component", technology: "Example", position: { x: index * 100, y: 0 }, capacityAssumptions: { maxRps: input.maxRps?.[index] ?? 1000, replicas: input.replicas?.[index] ?? 1, cacheHitRatio: input.hit?.[index] ?? 0 }, metadata: { trustBoundary: index === 0 ? "public" : "private", notes: "" } }));
  return architectureSchema.parse({ ...base, nodes, edges: input.edges.map((edge, i) => ({ id: `e${i}`, source: edge.source, target: edge.target, kind: "https", label: "request", requestMultiplier: edge.multiplier ?? 1, metadata: { contract: "request" } })), requirements: input.requirements ?? "" });
}

describe("deterministic ScaleLab and architecture review", () => {
  it("uses the higher direct or concurrent-user-derived traffic input and fans out requests", () => {
    const architecture = graph({ types: ["client", "service", "database"], edges: [{ source: "n0", target: "n1", multiplier: 2 }, { source: "n1", target: "n2" }] });
    const result = simulateCapacity(architecture, { requestsPerSecond: 20, concurrentUsers: 600, requestsPerUserPerMinute: 6, readShare: 0.5 });
    expect(result.userDerivedRps).toBe(60);
    expect(result.offeredRps).toBe(60);
    expect(result.rows.find(row => row.nodeId === "n1")?.requestsPerSecond).toBe(120);
    expect(result.rows.find(row => row.nodeId === "n2")?.requestsPerSecond).toBe(120);
  });

  it("applies cache hit assumptions to downstream reads only", () => {
    const architecture = graph({ types: ["client", "cache", "database"], edges: [{ source: "n0", target: "n1" }, { source: "n1", target: "n2" }], hit: [0, 0.75, 0] });
    const result = simulateCapacity(architecture, { requestsPerSecond: 100, concurrentUsers: 0, requestsPerUserPerMinute: 0, readShare: 0.8 });
    const db = result.rows.find(row => row.nodeId === "n2")!;
    expect(db.readsPerSecond).toBe(20);
    expect(db.writesPerSecond).toBe(20);
    expect(db.requestsPerSecond).toBe(40);
  });

  it("converges on a stable feedback loop and bounds an unstable amplification cycle", () => {
    const stable = graph({ types: ["client", "service", "worker"], edges: [{ source: "n0", target: "n1" }, { source: "n1", target: "n2", multiplier: 0.25 }, { source: "n2", target: "n1", multiplier: 0.25 }] });
    const converged = simulateCapacity(stable, { requestsPerSecond: 100, concurrentUsers: 0, requestsPerUserPerMinute: 0, readShare: 1 });
    expect(converged.propagation.bounded).toBe(false);
    expect(converged.rows.find(row => row.nodeId === "n1")!.requestsPerSecond).toBeCloseTo(106.67, 1);
    const unstableGraph = graph({ types: ["client", "service"], edges: [{ source: "n0", target: "n1" }, { source: "n1", target: "n0", multiplier: 1000 }] });
    const bounded = simulateCapacity(unstableGraph, { requestsPerSecond: 100, concurrentUsers: 0, requestsPerUserPerMinute: 0, readShare: 1 });
    expect(bounded.propagation.bounded).toBe(true);
    expect(bounded.propagation.cappedNodes.length).toBeGreaterThan(0);
  });

  it("returns evidence, explicit assumptions, and a markdown report without a composite score", () => {
    const architecture = graph({ types: ["client", "database"], edges: [{ source: "n0", target: "n1" }], requirements: "Background ingestion for a read-heavy app." });
    const workload = workloadPresets[1].workload;
    const findings = reviewArchitecture(architecture, workload);
    expect(findings.map(item => item.id)).toContain("auth-boundary");
    expect(findings.map(item => item.id)).toContain("public-database-path");
    expect(findings.every(item => item.evidence.length && item.assumptions.length && item.recommendation)).toBe(true);
    const report = buildArchitectureReport(architecture, workload, simulateCapacity(architecture, workload), findings);
    expect(report).toContain("## Deterministic review findings");
    expect(report).toContain("not load tests");
    expect(report).not.toMatch(/composite score|risk score/i);
  });

  it("flags undocumented ingress abuse controls, auth paths, payment idempotency, and sensitive boundaries as heuristics", () => {
    const architecture = graph({
      types: ["client", "service", "auth", "database", "external-api"],
      edges: [
        { source: "n0", target: "n1" }, { source: "n1", target: "n3" }, { source: "n1", target: "n4" },
      ],
      requirements: "Public checkout handles payment data and personal data.",
    });
    const ids = reviewArchitecture(architecture, workloadPresets[0].workload).map(item => item.id);
    expect(ids).toContain("abuse-controls-undescribed");
    expect(ids).toContain("auth-path-not-explicit");
    expect(ids).toContain("payment-idempotency-undescribed");
    expect(ids).toContain("sensitive-data-boundary-review");
    expect(reviewArchitecture(architecture, workloadPresets[0].workload).filter(item => ids.includes(item.id)).every(item => item.assumptions.length > 0)).toBe(true);
    expect(reviewArchitecture(architecture, workloadPresets[0].workload).find(item => item.id === "sensitive-data-boundary-review")?.confidence).toBe("low");
  });

  it("recognizes explicit rate-limit and payment-idempotency design notes", () => {
    const architecture = graph({ types: ["client", "service", "database"], edges: [{ source: "n0", target: "n1" }, { source: "n1", target: "n2" }], requirements: "Public checkout has per-user rate limits and payment idempotency keys." });
    const ids = reviewArchitecture(architecture, workloadPresets[0].workload).map(item => item.id);
    expect(ids).not.toContain("abuse-controls-undescribed");
    expect(ids).not.toContain("payment-idempotency-undescribed");
  });

  it("strictly bounds scenario inputs and rejects unknown fields", () => {
    expect(workloadSchema.safeParse({ ...workloadPresets[0].workload, secret: "no" }).success).toBe(false);
    expect(workloadSchema.safeParse({ ...workloadPresets[0].workload, readShare: 1.5 }).success).toBe(false);
  });
});
