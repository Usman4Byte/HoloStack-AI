# Architecture decisions

## One deployable application

Next.js App Router, React, strict TypeScript, Tailwind CSS, local shadcn-style primitives, Lucide, XYFlow, and Zod. Node.js Route Handlers own future auth, persistence, and model calls. No Express process, durable in-process state, persistent WebSockets, or background work inside request handlers.

The public sample at `/` deliberately uses client state only. Signed-in dashboards and project editors use the bounded server-only database pool and durable TiDB records. No durable application state is held in process memory. The public health endpoint proves only that the application serves requests.

## Domain boundary

The graph schema rejects duplicate identifiers, missing edge references, self connections, unsupported types, unknown properties, invalid capacity values, and oversized graphs. Multi-node cycles are valid software architecture; ScaleLab must explicitly detect/bound cyclic propagation rather than recursively treating all graphs as DAGs. JSON file import uses this schema with a 256 KiB UTF-8 cap; AI output validation is future work.

## Persistence implementation (Milestone 2)

The reviewed first Drizzle SQL migration is applied in the TiDB `holostack` schema. It creates `users`, `sessions`, `workspaces`, `workspace_members`, `projects`, `architecture_versions`, `rate_limits`, and `usage_events`, using application-generated UUIDs and tested SQL types. JSONB holds validated graphs; relational columns hold tenant scope, revision, metadata, and timestamps. Optimistic writes include both tenant ownership and the expected revision in their predicate; a stale revision becomes HTTP 409. Tenant keys cannot be accepted as authority from the browser. Project editors debounce graph and metadata writes and retain drafts after conflicts.

The schema intentionally omits OAuth accounts, scenarios/results, AI conversations/messages, and optional sharing until those features are implemented. Foreign keys and B-tree indexes match tested operations. No reliance on extensions, triggers, vector indexes, or SERIALIZABLE isolation.

## Authentication implementation

Credential auth uses scrypt password hashes and opaque session tokens whose SHA-256 hashes alone are stored in TiDB. Cookies are HttpOnly and SameSite; mutation routes verify origin, and persistent HMAC-keyed buckets rate-limit accounts and client IPs. Private routes resolve the current session and workspace membership on the server. Email verification and password recovery are unavailable in this preview; OAuth has not been added.

## AI and model-based intelligence (not implemented)

Keep provider secrets and prompts in backend code. Enforce body limits, timeouts, quota reservations, strict schema validation, bounded repair attempts, and sensitive-data-safe logs. Authored templates remain a clearly separate sample mode. Capacity modeling is deterministic and assumption-based. Optimization produces a candidate graph and explicit diff before acceptance, with version history to restore previous states. These AI and intelligence flows are future milestones.

## Later modules

P1: RepoLens, ADRs, team membership UX, comments/reviews, tokenized read-only sharing, threat modeling, pricing-date-aware CloudCost. P2: deployment blueprints, read-only cloud discovery, real observability, API/CLI integrations, subscriptions, billing, and retention/recovery administration. These are roadmap items, not current functionality.
