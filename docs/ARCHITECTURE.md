# Architecture decisions

## One deployable application

Next.js App Router, React, strict TypeScript, Tailwind CSS, local shadcn-style primitives, Lucide, XYFlow, and Zod. Node.js Route Handlers own future auth, persistence, and model calls. No Express process, durable in-process state, persistent WebSockets, or background work inside request handlers.

The current sample is deliberately client-only. A bounded server connection pool is cached across warm invocations; it contains no durable records. The public health endpoint proves only that the application serves requests.

## Domain boundary

The graph schema rejects duplicate identifiers, missing edge references, self connections, unsupported types, unknown properties, invalid capacity values, and oversized graphs. Multi-node cycles are valid software architecture; ScaleLab must explicitly detect/bound cyclic propagation rather than recursively treating all graphs as DAGs. Imports and AI outputs will use this same trust boundary with HTTP/file byte limits added at ingress.

## Persistence plan (Milestone 2)

Use application-generated UUIDs and conventional verified SQL types. JSONB holds validated graphs; relational columns hold tenant scope, revision, metadata, and timestamps. Optimistic writes include both tenant ownership and the expected revision in their predicate; a stale revision becomes HTTP 409. Tenant keys cannot be accepted as authority from the browser.

Proposed first tables: users, sessions, workspaces, workspace_members, projects, architecture_versions, scenarios, usage_events. Add auth_accounts for OAuth, AI conversations/messages for Copilot, and optional sharing only when the relevant features are implemented. Foreign keys and B-tree indexes must match tested operations. No reliance on extensions, triggers, vector indexes, or SERIALIZABLE isolation.

## Authentication plan (not implemented)

Choose credential auth with a modern password KDF or a verified provider in Milestone 2. Use random opaque session tokens, store only hashes, and set HttpOnly/Secure/SameSite cookies with expiration and rotation. Protect mutating routes with origin/CSRF checks. Validate membership and object ownership inside every service operation. Use persistent rate limiting for authentication and AI; process-local counters cannot enforce serverless-wide quotas. Public routes are restricted to authored samples, marketing, and liveness until auth exists.

## AI and model-based intelligence (not implemented)

Keep provider secrets and prompts in backend code. Enforce body limits, timeouts, quota reservations, strict schema validation, bounded repair attempts, and sensitive-data-safe logs. Authored templates remain a clearly separate sample mode. Capacity modeling is deterministic and assumption-based. Optimization produces a candidate graph and explicit diff before acceptance, with version history to restore previous states.

## Later modules

P1: RepoLens, ADRs, team membership UX, comments/reviews, tokenized read-only sharing, threat modeling, pricing-date-aware CloudCost. P2: deployment blueprints, read-only cloud discovery, real observability, API/CLI integrations, subscriptions, billing, and retention/recovery administration. These are roadmap items, not current functionality.
