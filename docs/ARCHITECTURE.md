# Architecture decisions

## One deployable application

Next.js App Router, React, strict TypeScript, Tailwind CSS, local shadcn-style primitives, Lucide, XYFlow, and Zod. Node.js Route Handlers own future auth, persistence, and model calls. No Express process, durable in-process state, persistent WebSockets, or background work inside request handlers.

The public sample at `/` deliberately uses client state only. Signed-in dashboards and project editors use the bounded server-only database pool and durable TiDB records. No durable application state is held in process memory. The public health endpoint proves only that the application serves requests.

## Domain boundary

The graph schema rejects duplicate identifiers, missing edge references, self connections, unsupported types, unknown properties, invalid capacity values, and oversized graphs. Multi-node cycles are valid software architecture; future ScaleLab must explicitly detect/bound cyclic propagation. JSON import and AI output use strict schema checks; AI content receives a second graph-integrity validation after parsing.

## Persistence implementation (Milestone 2)

The reviewed first Drizzle SQL migration is applied in the TiDB `holostack` schema. It creates `users`, `sessions`, `workspaces`, `workspace_members`, `projects`, `architecture_versions`, `rate_limits`, and `usage_events`, using application-generated UUIDs and tested SQL types. JSONB holds validated graphs; relational columns hold tenant scope, revision, metadata, and timestamps. Optimistic writes include both tenant ownership and the expected revision in their predicate; a stale revision becomes HTTP 409. Tenant keys cannot be accepted as authority from the browser. Project editors debounce graph and metadata writes and retain drafts after conflicts.

The additive `0001_ai_workflows.sql` migration adds tenant-scoped AI action logs, daily quota counters, candidate artifacts, and conversation messages. AI outputs remain ordinary JSONB project data; no prompts or API keys are put in the usage ledger. Foreign keys and B-tree indexes match tested operations. No reliance on extensions, triggers, vector indexes, or SERIALIZABLE isolation.

## Authentication implementation

Credential auth uses scrypt password hashes and opaque session tokens whose SHA-256 hashes alone are stored in TiDB. Cookies are HttpOnly and SameSite; mutation routes verify origin, and persistent HMAC-keyed buckets rate-limit accounts and client IPs. Private routes resolve the current session and workspace membership on the server. Email verification and password recovery are unavailable in this preview; OAuth has not been added.

## AI and model-based workflows (Module 4)

The Gemini SDK exists only behind `src/server/ai/provider.ts` and `server-only`; Next.js Node Route Handlers call it only after same-origin, session, workspace/project, rate-limit, explicit-consent, and transactional quota checks. Structured model outputs are parsed with Zod and checked against graph integrity. The app allows only Gemini 2.5 Flash / Flash-Lite IDs, applies a 25-second request timeout and one SDK attempt, and remains off until `GEMINI_ENABLED` and `GEMINI_FREE_TIER_CONFIRMED` are explicitly true with a server-only key. App quotas are 3 user actions and 30 total actions per UTC day; the caps cannot be raised in environment configuration.

Generation and optimization return saved candidate artifacts. Copilot messages are saved per project. A deterministic local patch applier constructs and validates proposals; a deterministic graph diff and before/after diagrams run with no model call. Only explicit user approval loads a candidate into HoloCanvas, where the existing revision-aware autosave records a normal project version. The AI cannot mutate infrastructure, measure performance, or silently overwrite a saved graph. See `AI_INTEGRATION.md` for external data-sharing and Google free-tier limits. The account key/model is not probed on page load; actual model access remains unverified until a user-requested provider call succeeds.

Authored templates remain a separate zero-AI sample mode. ScaleLab and deterministic risk analysis are future Module 5 features and must remain TypeScript-only; an AI optimization prompt is explicitly told that formal risk findings are not available yet.

## Later modules

P1: RepoLens, ADRs, team membership UX, comments/reviews, tokenized read-only sharing, threat modeling, pricing-date-aware CloudCost. P2: deployment blueprints, read-only cloud discovery, real observability, API/CLI integrations, subscriptions, billing, and retention/recovery administration. These are roadmap items, not current functionality.
