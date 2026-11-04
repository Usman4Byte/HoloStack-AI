import { architectureSchema, type Architecture, type ArchitectureNode } from "./schema";

type Component = [id: string, type: ArchitectureNode["type"], label: string, technology: string, description: string];
const positions = [{ x: 30, y: 180 }, { x: 310, y: 180 }, { x: 590, y: 30 }, { x: 590, y: 320 }, { x: 880, y: 30 }, { x: 880, y: 320 }];

function template(id: string, name: string, description: string, components: Component[], connections: [string, string, string][]): Architecture {
  return architectureSchema.parse({
    id, name, version: 1, description, requirements: description,
    assumptions: [
      "Educational template, authored locally. This is not AI-generated or deployed infrastructure.",
      "Capacity values are illustrative inputs, not benchmarks. Validate them with measurements before capacity planning.",
      "Single-region deployment. Availability, cost, and provider quotas require independent evaluation.",
    ],
    nodes: components.map(([nodeId, type, label, technology, responsibility], index) => ({
      id: nodeId, type, label, technology, description: responsibility,
      position: positions[index],
      capacityAssumptions: { maxRps: type === "ai" ? 50 : type === "database" ? 800 : 2000, replicas: 1, cacheHitRatio: type === "cache" ? 0.8 : 0 },
      metadata: { trustBoundary: type === "client" ? "public" : ["ai", "external-api"].includes(type) ? "external" : "private", notes: "Capacity is an editable assumption. Security controls must be implemented and verified." },
    })),
    edges: connections.map(([source, target, label], index) => ({
      id: `edge-${index}`, source, target, label,
      kind: components.find(c => c[0] === target)?.[1] === "database" ? "query" : "https",
      requestMultiplier: 1, metadata: { contract: `${label}. Validate inputs, authorize access, and set bounded timeouts.` },
    })),
    createdAt: "2026-11-03T00:00:00.000Z",
  });
}

export const scratchTemplate = architectureSchema.parse({
  ...template("scratch", "Start from scratch", "An empty canvas. Add your first component to begin.", [], []),
  assumptions: [],
});

export const templates: Architecture[] = [
  template("ai-saas", "AI SaaS / RAG", "A retrieval-augmented assistant with private knowledge, a secure API, and an external model provider.", [
    ["client", "client", "Web client", "Web application", "Capture user questions and render streamed responses. Keep provider secrets on the server."],
    ["api", "service", "Application API", "Server application", "Authorize requests, retrieve context, and orchestrate model calls with usage limits."],
    ["auth", "auth", "Identity & sessions", "Server-side sessions", "Validate identity, expiration, and workspace membership on each private operation."],
    ["knowledge", "database", "Knowledge store", "Managed SQL", "Store tenant-scoped document metadata and retrieval references. Vector support needs separate verification."],
    ["model", "ai", "Model inference", "External AI service", "Generate grounded responses from authorized context. Enforce provider timeouts and token budgets."],
    ["storage", "object-storage", "Document storage", "Private object storage · planned", "Keep original documents in private object storage with short-lived signed access."],
  ], [["client", "api", "HTTPS"], ["api", "auth", "Session"], ["api", "knowledge", "Retrieve"], ["api", "model", "Context + prompt"], ["knowledge", "storage", "Document reference"]]),
  template("commerce", "E-commerce", "A storefront with separate order handling, a read cache, and a hosted payment boundary.", [
    ["client", "client", "Storefront", "Web application", "Browse products and submit authenticated orders."],
    ["api", "service", "Commerce API", "Application runtime", "Check inventory and create idempotent orders."],
    ["cache", "cache", "Catalog cache", "Distributed cache", "Cache public product data with explicit invalidation."],
    ["db", "database", "Orders & inventory", "Managed SQL", "Persist orders and use transactional stock updates."],
    ["payments", "external-api", "Hosted payments", "Payment provider", "Use hosted checkout and verify signed webhook events."],
    ["worker", "worker", "Fulfillment worker", "Queue consumer", "Process fulfillment with idempotency and retries."],
  ], [["client", "api", "HTTPS"], ["api", "cache", "Catalog"], ["api", "db", "Orders"], ["api", "payments", "Checkout"], ["db", "worker", "Outbox polling"]]),
  template("chat", "Realtime chat", "Durable messages and a managed realtime delivery service; no persistent WebSockets inside serverless functions.", [
    ["client", "client", "Chat client", "Web application", "Render conversation history and subscribe to authorized channels."],
    ["api", "service", "Messaging API", "Application runtime", "Authorize channel membership and persist messages."],
    ["auth", "auth", "Channel access", "Session authorization", "Issue short-lived scoped channel credentials."],
    ["db", "database", "Message store", "Managed SQL", "Store ordered messages and delivery references."],
    ["realtime", "external-api", "Realtime delivery", "Managed pub/sub", "Fan out authorized events using managed persistent connections."],
    ["storage", "object-storage", "Attachments", "Object storage", "Store private attachments outside SQL."],
  ], [["client", "api", "Send"], ["api", "auth", "Authorize"], ["api", "db", "Persist"], ["api", "realtime", "Publish"], ["api", "storage", "Signed upload"]]),
  template("streaming", "Video streaming", "An asynchronous media processing pipeline with edge delivery and separate object storage.", [
    ["client", "client", "Player", "Web application", "Request authorized manifests and adaptive media segments."],
    ["cdn", "cdn", "Edge delivery", "Edge network", "Cache media segments with signed access policies."],
    ["api", "service", "Media API", "Application runtime", "Authorize playback and record asset metadata."],
    ["storage", "object-storage", "Media origin", "Object storage", "Store source files and transcoded variants."],
    ["db", "database", "Asset catalog", "Managed SQL", "Track processing state and access permissions."],
    ["worker", "worker", "Transcoding", "Managed media jobs", "Run CPU-heavy processing outside request handlers."],
  ], [["client", "cdn", "Segments"], ["client", "api", "Authorize"], ["cdn", "storage", "Origin"], ["api", "db", "Metadata"], ["worker", "storage", "Variants"]]),
  template("crm", "Team CRM", "A tenant-scoped application with background imports and explicit authorization boundaries.", [
    ["client", "client", "CRM workspace", "Web application", "Manage contacts, accounts, and activity timelines."],
    ["api", "service", "Workspace API", "Application runtime", "Check membership and tenant scope on every operation."],
    ["auth", "auth", "Membership", "Sessions + RBAC", "Resolve roles and permissions for the current workspace."],
    ["db", "database", "Customer records", "Managed SQL", "Persist tenant-scoped customer data and audit references."],
    ["queue", "queue", "Import queue", "Managed queue", "Buffer imports with retries and a dead-letter policy."],
    ["worker", "worker", "Import worker", "Managed job runner", "Validate and process imports with idempotent writes."],
  ], [["client", "api", "HTTPS"], ["api", "auth", "Membership"], ["api", "db", "Tenant queries"], ["api", "queue", "Import job"], ["queue", "worker", "Consume"]]),
  template("events", "Event-driven services", "A durable event pipeline with decoupled workers and an explicit retry boundary.", [
    ["client", "client", "Web client", "React", "Submit commands and read processing state."],
    ["api", "api-gateway", "Command API", "Serverless handlers", "Validate commands and assign idempotency keys."],
    ["queue", "queue", "Event bus", "Managed queue", "Deliver events at least once with bounded retention."],
    ["db", "database", "State & outbox", "Managed SQL", "Commit domain state and outbox entries together."],
    ["worker", "worker", "Event processor", "Managed workers", "Deduplicate events and apply domain operations."],
    ["dlq", "queue", "Dead-letter queue", "Managed queue", "Retain failed events for inspected replay."],
  ], [["client", "api", "Command"], ["api", "db", "State + outbox"], ["db", "queue", "Outbox relay"], ["queue", "worker", "Event"], ["worker", "dlq", "Failed delivery"]]),
  template("serverless", "Serverless app", "An edge-cached web application with bounded stateless handlers and durable SQL persistence.", [
    ["client", "client", "Web client", "Web application", "Render the application and submit authorized requests."],
    ["cdn", "cdn", "Edge cache", "Edge network", "Serve static assets and explicitly public cached content."],
    ["api", "service", "API functions", "Serverless runtime", "Run bounded stateless operations with small connection pools."],
    ["db", "database", "Application data", "Managed SQL", "Persist application state; compatibility and backup recovery must be verified."],
    ["auth", "auth", "Session store", "SQL-backed sessions", "Store hashed session tokens and enforce expiration."],
    ["storage", "object-storage", "File storage", "Object storage", "Keep large assets outside SQL tables."],
  ], [["client", "cdn", "Assets"], ["client", "api", "HTTPS"], ["api", "db", "SQL"], ["api", "auth", "Session"], ["api", "storage", "Signed access"]]),
];
