import type { Architecture } from "@/domain/architecture/schema";
import type { Workload } from "./schema";

export type CapacityRow = { nodeId: string; label: string; type: string; requestsPerSecond: number; readsPerSecond: number; writesPerSecond: number; capacityRps: number; utilization: number; headroomRps: number; state: "healthy" | "watch" | "overloaded" | "unstable" };
export type CapacityResult = { offeredRps: number; userDerivedRps: number; readShare: number; rows: CapacityRow[]; bottlenecks: string[]; propagation: { iterations: number; bounded: boolean; cappedNodes: string[] }; assumptions: string[] };
export type ReviewFinding = { id: string; category: "reliability" | "scalability" | "security" | "operations" | "performance" | "cost"; severity: "high" | "medium" | "low"; title: string; evidence: string[]; recommendation: string; confidence: "high" | "medium" | "low"; assumptions: string[] };

const LIMIT = 1_000_000_000;
const safeRound = (value: number) => Number.isFinite(value) ? Math.round(value * 100) / 100 : LIMIT;
/** Deterministic graph workload estimate. Cycles are iterated to convergence or a strict bound; this is not load testing. */
export function simulateCapacity(graph: Architecture, workload: Workload): CapacityResult {
  const nodes = graph.nodes;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const inbound = new Map(nodes.map(node => [node.id, 0]));
  for (const edge of graph.edges) inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + 1);
  const roots = nodes.filter(node => node.type === "client");
  const entryNodes = roots.length ? roots : nodes.filter(node => inbound.get(node.id) === 0);
  const entries = entryNodes.length ? entryNodes : [nodes[0]];
  const userDerivedRps = workload.concurrentUsers * workload.requestsPerUserPerMinute / 60;
  const offeredRps = Math.max(workload.requestsPerSecond, userDerivedRps);
  const seed = new Map(nodes.map(node => [node.id, { reads: 0, writes: 0 }]));
  for (const node of entries) seed.set(node.id, { reads: offeredRps * workload.readShare / entries.length, writes: offeredRps * (1 - workload.readShare) / entries.length });
  let previous = new Map(nodes.map(node => [node.id, { ...seed.get(node.id)! }]));
  let bounded = false, iterations = 0;
  const cappedNodes = new Set<string>();
  const maxRounds = Math.min(128, Math.max(8, nodes.length + 8));
  for (let round = 0; round < maxRounds; round++) {
    iterations = round + 1;
    const next = new Map(nodes.map(node => [node.id, { ...seed.get(node.id)! }]));
    for (const edge of graph.edges) {
      const source = byId.get(edge.source), flow = previous.get(edge.source), target = next.get(edge.target);
      if (!source || !flow || !target) continue;
      const cache = source.type === "cache" ? source.capacityAssumptions.cacheHitRatio : 0;
      target.reads += flow.reads * edge.requestMultiplier * (1 - cache);
      target.writes += flow.writes * edge.requestMultiplier;
    }
    let delta = 0;
    for (const node of nodes) {
      const row = next.get(node.id)!;
      if (row.reads > LIMIT || row.writes > LIMIT) { row.reads = Math.min(row.reads, LIMIT); row.writes = Math.min(row.writes, LIMIT); cappedNodes.add(node.id); }
      const old = previous.get(node.id)!;
      delta = Math.max(delta, Math.abs(row.reads - old.reads), Math.abs(row.writes - old.writes));
    }
    previous = next;
    if (delta <= Math.max(0.001, offeredRps * 0.00001)) break;
    if (round === maxRounds - 1) bounded = true;
  }
  const rows = nodes.map(node => {
    const flow = previous.get(node.id)!;
    const requests = flow.reads + flow.writes;
    const capacity = node.capacityAssumptions.maxRps * node.capacityAssumptions.replicas;
    const utilization = capacity > 0 ? requests / capacity : LIMIT;
    const state = bounded && cappedNodes.has(node.id) ? "unstable" : utilization >= 1 ? "overloaded" : utilization >= 0.7 ? "watch" : "healthy";
    return { nodeId: node.id, label: node.label, type: node.type, requestsPerSecond: safeRound(requests), readsPerSecond: safeRound(flow.reads), writesPerSecond: safeRound(flow.writes), capacityRps: safeRound(capacity), utilization: safeRound(utilization), headroomRps: safeRound(Math.max(0, capacity - requests)), state } as CapacityRow;
  });
  return {
    offeredRps: safeRound(offeredRps), userDerivedRps: safeRound(userDerivedRps), readShare: workload.readShare, rows,
    bottlenecks: rows.filter(row => row.state === "overloaded" || row.state === "unstable").map(row => row.label),
    propagation: { iterations, bounded: bounded || cappedNodes.size > 0, cappedNodes: [...cappedNodes] },
    assumptions: ["Offered RPS is the larger of the direct RPS input and concurrent users × requests per user per minute ÷ 60.", "Entry requests start at client nodes; if absent, graph roots are used, falling back to the first node for a closed graph.", "Every connection multiplies incoming read/write volume by its requestMultiplier. Cache hit assumptions reduce reads downstream from cache nodes only.", "Node capacity is maxRps × replicas. It is an editable design assumption, not a measured service benchmark.", `Propagation is capped at ${maxRounds} iterations and ${LIMIT.toExponential(0)} requests/second per node to bound cyclic graphs.`, "The model excludes latency, queueing, retries, regional effects, shared database bottlenecks, and real infrastructure behavior."],
  };
}

const finding = (item: ReviewFinding): ReviewFinding => item;
export function reviewArchitecture(graph: Architecture, workload: Workload): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const add = (item: ReviewFinding) => findings.push(finding(item));
  const types = new Set(graph.nodes.map(node => node.type));
  const dbs = graph.nodes.filter(node => node.type === "database");
  const directPublicDb = graph.edges.filter(edge => graph.nodes.some(node => node.id === edge.source && node.metadata.trustBoundary === "public") && dbs.some(node => node.id === edge.target));
  if (!types.has("auth")) add({ id: "auth-boundary", category: "security", severity: "high", title: "No authentication component is represented", evidence: ["The architecture graph contains no node typed authentication."], recommendation: "Add an authentication/session boundary and route protected operations through it.", confidence: "high", assumptions: ["The application has user-specific or privileged operations."] });
  if (directPublicDb.length) add({ id: "public-database-path", category: "security", severity: "high", title: "Public component connects directly to a database", evidence: directPublicDb.map(edge => `${edge.source} → ${edge.target}`), recommendation: "Place a private application service and authorization checks between public ingress and data storage.", confidence: "high", assumptions: ["Trust-boundary labels and edge direction are accurate."] });
  if (dbs.some(node => node.capacityAssumptions.replicas < 2)) add({ id: "database-single-instance", category: "reliability", severity: "medium", title: "A database has a single modeled replica", evidence: dbs.filter(node => node.capacityAssumptions.replicas < 2).map(node => `${node.label}: ${node.capacityAssumptions.replicas} replica`), recommendation: "Document the actual database availability model and evaluate replicas, managed failover, backups, and recovery objectives.", confidence: "medium", assumptions: ["A replica count of one signals a potential design single point; managed-service behavior may differ."] });
  if (!types.has("monitoring")) add({ id: "observability-gap", category: "operations", severity: "medium", title: "No monitoring or observability component is shown", evidence: ["No monitoring node appears in the graph."], recommendation: "Add metrics, logs, traces, alert ownership, and service-level objectives to the design.", confidence: "high", assumptions: ["The graph is intended to show operational components."] });
  if (workload.readShare >= 0.8 && !types.has("cache")) add({ id: "read-cache", category: "performance", severity: "low", title: "Read-heavy workload has no cache component", evidence: [`Read share is ${(workload.readShare * 100).toFixed(0)}%.`], recommendation: "Evaluate a cache only where data freshness, invalidation, and consistency needs permit it.", confidence: "medium", assumptions: ["The selected workload is a scenario input, not measured production traffic."] });
  const highFanout = graph.nodes.filter(node => ["service", "web-app", "api-gateway"].includes(node.type)).map(node => ({ node, edges: graph.edges.filter(edge => edge.source === node.id && edge.kind !== "event") })).filter(item => item.edges.length >= 6);
  for (const { node, edges } of highFanout) add({ id: `sync-fanout-${node.id}`, category: "reliability", severity: "medium", title: `High synchronous fanout at ${node.label}`, evidence: [`${edges.length} non-event outgoing connections are modeled.`], recommendation: "Review whether independent work can be asynchronous and define timeout, retry, and partial-failure behavior.", confidence: "medium", assumptions: ["Edge kinds correctly distinguish asynchronous event flows."] });
  if (!types.has("queue") && /async|background|ingest|batch|notification/i.test(`${graph.requirements} ${graph.description}`)) add({ id: "async-work", category: "scalability", severity: "low", title: "Requirements mention background work but no queue is shown", evidence: ["Requirements or description contain asynchronous/background processing language."], recommendation: "Consider a queue and worker boundary with idempotency and dead-letter handling.", confidence: "low", assumptions: ["Text keyword matching is a heuristic; it does not establish a requirement."] });

  const modeledText = [graph.name, graph.description, graph.requirements, ...graph.assumptions,
    ...graph.nodes.flatMap(node => [node.label, node.description, node.technology, node.metadata.notes]),
    ...graph.edges.flatMap(edge => [edge.label, edge.metadata.contract])].join(" ");
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const publicEdges = graph.edges.filter(edge => byId.get(edge.source)?.metadata.trustBoundary === "public");
  if (publicEdges.length && !/\b(rate[\s-]?limits?|throttl|quota|waf|web application firewall|abuse protection)\b/i.test(modeledText)) {
    add({ id: "abuse-controls-undescribed", category: "security", severity: "low", title: "Rate-limiting controls are not described", evidence: [`${publicEdges.length} modeled connection(s) leave public trust-boundary components.`, "No rate-limit, throttle, quota, WAF, or abuse-protection terms appear in the architecture text."], recommendation: "Document request rate limits, abuse controls, and quota enforcement at public entry points where they apply.", confidence: "low", assumptions: ["Text search cannot determine whether controls exist in implementation or are intentionally out of scope."] });
  }
  const entryTargets = publicEdges.map(edge => byId.get(edge.target)).filter((node): node is Architecture["nodes"][number] => Boolean(node && ["service", "web-app", "api-gateway"].includes(node.type)));
  const authConnectedToEntry = graph.edges.some(edge => entryTargets.some(target =>
    (edge.source === target.id && byId.get(edge.target)?.type === "auth") ||
    (edge.target === target.id && byId.get(edge.source)?.type === "auth")));
  if (types.has("auth") && entryTargets.length && !authConnectedToEntry) {
    add({ id: "auth-path-not-explicit", category: "security", severity: "low", title: "Authentication is shown, but its ingress path is unclear", evidence: ["A public component connects directly to an application service, while no edge connects that service to the modeled authentication component."], recommendation: "Show where the service validates the user session or explain that authentication is enforced in its request path.", confidence: "low", assumptions: ["Graph connections simplify runtime behavior; a direct edge does not prove that authorization is absent."] });
  }
  if (/\b(payment|payments|checkout|cardholder|order processing)\b/i.test(modeledText) && !/\bidempotenc(y|ent)\b/i.test(modeledText)) {
    add({ id: "payment-idempotency-undescribed", category: "reliability", severity: "medium", title: "Payment or order idempotency is not described", evidence: ["Architecture text mentions payment, checkout, cardholder data, or order processing but no idempotency term."], recommendation: "Document idempotency keys and duplicate-event handling for payment and order mutations where applicable.", confidence: "low", assumptions: ["Keyword matching may not reflect the actual payment flow or its provider guarantees."] });
  }
  const sensitiveTerms = /\b(PII|PHI|personal data|credentials?|passwords?|access tokens?|secrets?|cardholder data|payment data)\b/i.test(modeledText);
  const crossesTrustBoundary = graph.edges.some(edge => {
    const source = byId.get(edge.source), target = byId.get(edge.target);
    return Boolean(source && target && source.metadata.trustBoundary !== target.metadata.trustBoundary &&
      [source.metadata.trustBoundary, target.metadata.trustBoundary].some(boundary => ["public", "external"].includes(boundary)));
  });
  if (sensitiveTerms && crossesTrustBoundary) add({ id: "sensitive-data-boundary-review", category: "security", severity: "medium", title: "Review sensitive-data handling across a trust boundary", evidence: ["Sensitive-data terms appear in the design text and at least one modeled edge crosses public/private/external trust labels."], recommendation: "Document data minimization, encryption, access checks, retention, and provider-sharing boundaries for the relevant flow.", confidence: "low", assumptions: ["This text-and-label heuristic does not establish that sensitive data is actually transmitted or exposed."] });
  return findings;
}

export function buildArchitectureReport(graph: Architecture, workload: Workload, capacity: CapacityResult, findings: ReviewFinding[]) {
  const lines = [`# ${graph.name} — Architecture report`, "", `> Design model generated ${new Date().toISOString()}. Estimates and rule findings are deterministic and assumption-based; they are not load tests, security certification, or measured infrastructure results.`, "", "## Overview", "", graph.description, "", "## Components", "", ...graph.nodes.map(node => `- **${node.label}** (${node.type}) — ${node.technology || "Technology unspecified"}. ${node.description}`), "", "## Data flows", "", ...(graph.edges.length ? graph.edges.map(edge => `- ${edge.source} → ${edge.target} (${edge.kind}; multiplier ${edge.requestMultiplier}): ${edge.metadata.contract || edge.label}`) : ["- No connections are modeled."]), "", "## Capacity scenario", "", `- Scenario input: ${workload.requestsPerSecond} direct RPS; ${workload.concurrentUsers} concurrent users; ${workload.requestsPerUserPerMinute} requests/user/minute; ${(workload.readShare * 100).toFixed(0)}% reads.`, `- Modeled offered load: ${capacity.offeredRps} RPS (${capacity.userDerivedRps} RPS derived from concurrent-user assumptions).`, "", "| Component | Modeled RPS | Assumed capacity | Utilization | State |", "|---|---:|---:|---:|---|", ...capacity.rows.map(row => `| ${row.label.replaceAll("|", "\\|")} | ${row.requestsPerSecond} | ${row.capacityRps} | ${(row.utilization * 100).toFixed(1)}% | ${row.state} |`), "", "### Capacity assumptions and limits", "", ...capacity.assumptions.map(item => `- ${item}`), "", "## Deterministic review findings", "", ...(findings.length ? findings.flatMap(item => [`### ${item.severity.toUpperCase()} · ${item.title}`, "", `**Category:** ${item.category} · **Confidence:** ${item.confidence}`, "", `**Evidence:** ${item.evidence.join("; ")}`, "", `**Recommendation:** ${item.recommendation}`, "", `**Assumptions:** ${item.assumptions.join("; ")}`, ""]) : ["No configured rule matched this graph and workload. This is not a guarantee that the architecture is risk-free."]), "## Explicit architecture assumptions", "", ...(graph.assumptions.length ? graph.assumptions.map(item => `- ${item}`) : ["- None recorded."]), ""];
  return lines.join("\n");
}
