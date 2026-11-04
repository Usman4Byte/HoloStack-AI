# Architecture decisions

## One deployable application

Next.js App Router, React, strict TypeScript, Tailwind CSS, local shadcn-style primitives, Lucide, XYFlow, and Zod. Node.js Route Handlers own auth, persistence, intelligence runs, and explicit model calls. No Express process, durable in-process state, persistent WebSockets, or background work inside request handlers.

Visitors enter `/guest` for the full workspace without authentication. The validated guest envelope is stored in the tab's `sessionStorage`, which survives refresh and is normally cleared when that tab session ends. Guest projects, graph versions, scenarios, AI candidates, and copilot conversation stay in the browser and never enter TiDB project tables. Signed-in dashboards and project editors use the bounded server-only database pool and durable, tenant-scoped TiDB records. No durable application state is held in process memory. The public health endpoint proves only that the application serves requests.

## Domain boundary

The graph schema rejects duplicate identifiers, missing edge references, self connections, unsupported types, unknown properties, invalid capacity values, and oversized graphs. Multi-node cycles are valid software architecture; ScaleLab propagates load with a strict iteration and per-node cap and reports when a loop does not converge. JSON import and AI output use strict schema checks; AI content receives a second graph-integrity validation after parsing.

## Persistence implementation (Milestone 2)

The reviewed first Drizzle SQL migration is applied in the TiDB `holostack` schema. It creates `users`, `sessions`, `workspaces`, `workspace_members`, `projects`, `architecture_versions`, `rate_limits`, and `usage_events`, using application-generated UUIDs and tested SQL types. JSONB holds validated graphs; relational columns hold tenant scope, revision, metadata, and timestamps. Optimistic writes include both tenant ownership and the expected revision in their predicate; a stale revision becomes HTTP 409. Tenant keys cannot be accepted as authority from the browser. Project editors debounce graph and metadata writes and retain drafts after conflicts.

The additive `0001_ai_workflows.sql` migration adds tenant-scoped AI action logs, daily quota counters, candidate artifacts, and conversation messages. AI outputs remain ordinary JSONB project data; no prompts or API keys are put in the usage ledger. Foreign keys and B-tree indexes match tested operations. No reliance on extensions, triggers, vector indexes, or SERIALIZABLE isolation.

The additive `0002_intelligence_runs.sql` migration stores deterministic workload inputs and results, review findings, project revision, and scenario name in a tenant-scoped table. Saves lock the project row and compare the caller's expected revision before computing and persisting, so a run is tied to the exact saved graph. Recent runs are scoped to the authenticated actor and workspace.

## Authentication implementation

Credential auth uses scrypt password hashes and opaque session tokens whose SHA-256 hashes alone are stored in TiDB. Cookies are HttpOnly and SameSite; mutation routes verify origin, and persistent HMAC-keyed buckets rate-limit accounts and client IPs. Private routes resolve the current session and workspace membership on the server. Email verification and password recovery are unavailable in this preview; OAuth has not been added.

## AI and model-based workflows (Module 4)

The Gemini SDK exists only behind `src/server/ai/provider.ts` and `server-only`; Next.js Node Route Handlers call it only after same-origin, session, workspace/project, short-window rate-limit, explicit-consent, and transactional usage-recording checks. Structured model outputs are parsed with Zod and checked against graph integrity. Configured model IDs are selected from the server-side pool, which is disabled until `GEMINI_ENABLED` and `GEMINI_FREE_TIER_CONFIRMED` are explicitly true with a server-only key. HoloStack has no per-user, guest, or app-wide daily AI cap. It tracks usage and rotates the starting model; provider errors fall through the remaining pool once each.

Generation and optimization return saved candidate artifacts. Copilot messages are saved per project. A deterministic local patch applier constructs and validates proposals; a deterministic graph diff and before/after diagrams run with no model call. Only explicit user approval loads a candidate into HoloCanvas, where the existing revision-aware autosave records a normal project version. The AI cannot mutate infrastructure, measure performance, or silently overwrite a saved graph. See `AI_INTEGRATION.md` for external data-sharing and Google free-tier limits. The account key/model is not probed on page load; actual model access remains unverified until a user-requested provider call succeeds.

Templates use zero AI requests. Guest AI calls are user-initiated, consent-gated, and routed through server-only Gemini handlers. No personal, guest, or app-wide daily AI cap is imposed; short-window abuse protection and provider quotas still apply. Guest prompts and model results are not written to HoloStack database records; hashed usage counters are retained for usage display and model rotation. Signed-in AI actions record usage and save successful conversation/artifact records in the authenticated project workspace. ScaleLab and deterministic risk analysis are TypeScript-only. The review evaluates explicit rules and returns evidence, recommendation, confidence, and assumptions without a composite risk score. AI optimization stays user-initiated; no findings are placed in the prompt unless explicitly requested and supplied.

## Deterministic intelligence (Module 5)

ScaleLab chooses the higher of direct RPS and `concurrent users × requests per user per minute ÷ 60`, then propagates read/write requests across directed graph edges using each edge multiplier. Cache assumptions reduce downstream reads only. Node capacity is `maxRps × replicas`; utilization, headroom, and warnings are estimates. Feedback loops use bounded fixed-point iteration with per-node caps and visibly flag non-convergence. Sliders and presets recalculate in the browser and never call Gemini.

The rule review checks modeled trust boundaries, authentication/observability presence, single modeled database replicas, read-heavy cache opportunities, synchronous fanout, and text-indicated background work. Every finding carries category, severity, evidence, confidence, assumptions, and a recommendation; absence of a finding is not a safety claim. Markdown report export and graph rendering are local. Version restore writes a new revision and preserves the current state; stale expected revisions are rejected.

## Later modules

P1: RepoLens, ADRs, team membership UX, comments/reviews, tokenized read-only sharing, threat modeling, pricing-date-aware CloudCost. P2: deployment blueprints, read-only cloud discovery, real observability, API/CLI integrations, subscriptions, billing, and retention/recovery administration. These are roadmap items, not current functionality.
