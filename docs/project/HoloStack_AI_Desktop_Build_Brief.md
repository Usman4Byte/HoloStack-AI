# HoloStack AI — Desktop Coding Handoff & Master Build Brief

## Instructions to the coding assistant

You are my senior full-stack engineer, AI engineer, product designer, and pragmatic technical architect. Build a real, functioning, aesthetically polished SaaS MVP called **HoloStack AI** in my local project folder. Do not stop at wireframes, generic advice, or a mock landing page. Implement working routes, data models, API handlers, auth boundaries, AI workflows, visualizations, and deployment documentation, then run tests/builds and fix errors wherever your environment supports it.

I am a developer familiar with React, MERN, Node.js, TypeScript, and WordPress. My public handles are GitHub `@usman4byte` and LinkedIn `/in/usman4byte`. I want this to be a credible engineering product and an impressive LinkedIn demonstration, not a fake AI wrapper.

**Operating style:** Break the implementation into executable milestones, but keep this complete product vision in mind. Prefer actually editing files and running commands over merely describing changes. Maintain a checklist and finish as much of the launchable MVP as possible. Do not claim that unavailable services, APIs, deployments, or tests succeeded. If a credential, sign-in, provider setup, or approval is needed, give the exact steps and continue with nonblocked work. Never request my secret keys in chat or print them in logs. If you have access to a browser, assist with provider setup while I personally enter credentials and approve actions.

## 1. Product vision

**Name:** HoloStack AI

**Positioning:** The intelligent workspace for designing, reviewing, simulating, documenting, and evolving software architecture.

**Tagline:** Design it. Understand it. Stress-test it. Optimize it. Ship it.

**Audience:** Full-stack developers, startup founders, students, technical leads, software architects, and small engineering teams.

**Problems solved:** Converting requirements into sound system designs; understanding service relationships and trade-offs; identifying architectural risks; modeling traffic under stated assumptions; planning optimizations; preserving design history; helping teams understand and share systems.

The product should look like a polished modern SaaS, not a hackathon demo. A standout 30–45 second video should show: enter “Design an AI SaaS chatbot for 100,000 users”; watch a beautiful interactive architecture appear; see animated data flow; increase traffic in ScaleLab; observe model-based bottleneck warnings; run an AI architecture review; click Optimize and inspect the before/after changes.

## 2. Deployment and database decisions — IMPORTANT

- Deploy the **Next.js frontend and backend together on Vercel**. Use Next.js App Router, Route Handlers / server-side functions, and Node.js runtime for PostgreSQL operations. No separate Express server or always-running backend for the MVP.
- **Database choice is fixed for now: PostgreSQL-compatible TiDB Cloud Starter** (NOT MySQL-compatible TiDB). During public preview the documented free allowance is 50 GiB row storage and 500M request units per month for eligible instances; preview quotas can change. At the time of this brief the supported public-preview region is AWS `us-east-1`.
- **The TiDB instance has NOT YET BEEN CREATED.** First guide me to create it via TiDB Cloud > Create Resource > Starter > PostgreSQL Compatible > region `us-east-1`; suggested name `holostack-ai-db`. Then help me collect its connection string and configure `DATABASE_URL` locally and on Vercel, without exposing secrets. Verify a real `SELECT 1` connection before using migrations.
- TiDB PostgreSQL compatibility is not identical to ordinary PostgreSQL. First validate the `pg` driver, TLS configuration, schema creation, key SQL features, JSON/JSONB behavior, transactions, indexes, and the proposed ORM/migrations on the actual instance. **Drizzle is a preferred ORM, not mandatory**; if specific features fail, use a compatible implementation and document the tradeoff. Never assume extensions, triggers, migrations, or PostgreSQL-specific behavior work without testing.
- TiDB's PostgreSQL-compatible tier is a **public preview without a production SLA**; use it for development / public demo, and document a migration or backup path before accepting paying customers or critical data. The goal is production-quality application code and architecture, not a claim that this preview DB is production-grade.
- Use server-side only `DATABASE_URL`; no secret leakage to browser bundles or version control. Add `.env.example` with placeholders, and `.env.local` to `.gitignore`.
- AI uses a **configurable external model API** accessed only from the backend, with env vars such as `AI_API_KEY` and `AI_MODEL`. Prefer an AI SDK if it is compatible and simplifies structured outputs. Add a clearly labeled sample/demo mode that works with no key; never describe demo data as live AI output.
- Keep the design compatible with Vercel's serverless constraints; no process-global durable state, long-running CPU tasks, or dependence on persistent WebSockets for MVP. Use pagination, safe connection handling, and timeouts. Keep functions in a region close to the DB if configurable.
- Object storage for uploaded reports/files can be added later via Cloudflare R2. Do not store large binaries inside SQL tables.

## 3. Core launch scope (P0, implement first)

### A. Marketing website & onboarding
- Responsive polished landing page, credible feature sections, sample architecture preview, CTA, tasteful animations, clear distinction between available and upcoming features.
- Sign-up/sign-in, protected app routes, user profile and settings. Select an authentication approach that works with our verified TiDB setup and Vercel; don't assume a managed auth provider is included with TiDB. OAuth is optional if it adds blockers. Implement proper sessions and authorization, no fake login.
- Dashboard with recent projects, templates, quick-create actions, status, and onboarding.

### B. Projects, workspaces, and persistence
- Create, rename, duplicate, open, archive/delete projects; project descriptions and metadata.
- Personal workspace first, with data models allowing future team workspaces.
- Save graph nodes/edges, notes, AI-generated metadata, scenario assumptions, and version snapshots to the database. Show loading, empty, error, and save states; autosave with debounce and conflict-aware updates where appropriate.
- Public share links only if tokenized read-only access is implemented securely; otherwise defer and label as coming soon.

### C. AI Architecture Generator
- Natural-language requirements form: product description, anticipated traffic, data/storage needs, latency/availability goals, preferred technologies, preferred cloud, budget, constraints, and style (MVP / monolith / microservices / serverless / event-driven).
- Ask clarifying questions only when truly necessary; permit generating with explicitly stated defaults.
- Use server-side structured model output validated by Zod. The output schema must contain typed nodes, typed edges, technology labels, responsibilities, inter-service contracts, security boundaries, assumption lists, and explanations.
- Validate references to node IDs, allowed node types, duplicate IDs, numeric limits and edge cycles as appropriate. Repair/retry gracefully when AI output is invalid.
- Generate several grounded starter templates locally for offline demo.

### D. HoloCanvas interactive architecture studio
- Gorgeous dark-first UI with sophisticated restrained cyan/violet accents; high legibility, typography hierarchy, glass/soft panels, and good responsiveness. Avoid excessive glowing decoration that reduces usability.
- React Flow / XYFlow (latest compatible version) for pan/zoom, select, drag, add/remove nodes, connect/disconnect, handles, inspector panel, fit-to-view, minimap, keyboard shortcuts, undo/redo where feasible, and layout of generated graphs.
- Component types: client, CDN, load balancer, API gateway, web app, backend service, authentication, DB, cache, queue, object storage, search, external API, AI/LLM, background worker, monitoring.
- Animated connection flow with tasteful moving particles or dashed edges; performance-sensitive animations and reduced-motion accessibility support.
- Click components to inspect responsibilities, runtime, technologies, dependencies, estimated capacity parameters, assumptions, risk findings, and notes.
- Support export/import of JSON, PNG (SVG if reliable). Validate imported files and enforce size limits.

### E. ScaleLab workload and capacity modeling
- Adjustable requests/sec, concurrent-user assumptions, read/write proportions, and workload profiles.
- Model service capacities by **explicit configurable assumptions**, including max RPS / request amplification / cache hit ratio / service fanout. Use a deterministic transparent calculation engine to estimate service utilization, rough throughput headroom, and single points of failure.
- Color-code at-risk nodes and explain each warning with the input values used.
- Provide at least a few named scenarios and show what changes between them.
- **Never present this as real load testing, measured infrastructure performance, accurate latency predictions, or a guarantee that a system supports N users.** Label all results as estimates and expose assumptions.

### F. Architecture Review & Optimization
- Explainable rule-based checks for reliability, scalability, security architecture, operations, performance, and cost-efficiency concerns (for example: missing cache on read-heavy workload, single database instance, lack of asynchronous processing, direct secret flow to client, no retry/dead-letter handling, excessive synchronous fanout).
- Findings have severity, evidence, assumptions, recommended changes, and a confidence description. Do not invent precision in composite scores. Where scoring is used, make the rubric visible and repeatable.
- AI Copilot can answer questions about the selected architecture, explain choices, suggest modifications, and propose typed graph patches.
- The **Optimize** action creates a candidate graph and clear diff: added, modified, removed nodes/edges, benefits, risks and assumptions. User previews and accepts/rejects; do not silently overwrite the original.
- Store architecture history with restore capability.

### G. Templates and reporting
- Ready-to-open sample designs: AI SaaS / RAG, e-commerce, realtime chat, streaming, CRM, event-driven microservices, serverless app. Use reasonable components and clear educational notes.
- Generate architecture documentation and a summary report covering components, data flows, trade-offs, assumptions, risk findings, and suggested improvements. Markdown export first; PDF later if needed.

### H. Trust, safety, quality and administration essentials
- Every server route validates inputs, authenticates user, and checks ownership/tenant access. Parameterized DB queries only. Enforce sensible rate limits, quotas, timeouts and request size limits, especially for AI endpoints.
- Logging without credentials or sensitive prompt data; friendly user-facing errors and clear retry paths.
- Include loading skeletons, error boundaries, empty states, mobile layouts, accessibility labels/keyboard navigation, and reduced-motion behavior.
- No false testimonials, made-up usage metrics, fake payment success, or invented real-time performance readings.
- Basic usage tracking for AI calls and a simple account settings area. Subscription billing may be a documented future integration unless actual payment activation is possible with proper compliance.

## 4. Future product roadmap (record as P1/P2, do NOT fake implementation)

- **RepoLens:** GitHub repository connection, code-informed architecture extraction, linked source paths, architecture drift detection.
- **CloudCost:** AWS/Azure/GCP cost estimates with pricing date, resource assumptions and regional breakdown.
- **Architecture documentation / ADRs:** versioned decisions and onboarding docs.
- **Team collaboration:** multi-member workspaces, comments, reviews, approval flows, read-only sharing, audit logs.
- **Threat modeling:** trust boundaries, entry points, security design review and reports.
- **Deployment blueprint generation:** reviewed Docker, CI/CD and infrastructure configuration templates.
- **Cloud discovery:** read-only provider resource inventory / Terraform import and infrastructure drift.
- **Observability:** real metrics and alerts mapped to architecture, clearly distinguished from simulated metrics.
- **Developer API/CLI/integrations:** GitHub Actions, notifications and exports.
- **Commercial SaaS:** subscriptions, quotas, billing, team seats, admin tooling, recovery/retention policies.

## 5. Technical defaults

- Next.js App Router + TypeScript with strict typing.
- Tailwind CSS + shadcn/ui components + Lucide icons; responsive, dark-first design.
- XYFlow / React Flow for architecture canvas; Motion for carefully scoped animation.
- `pg` driver for first DB verification. Use Drizzle ORM only after verified compatibility; prefer a conventional SQL schema and migrations that TiDB actually supports.
- Zod for request validation and AI output schema validation.
- External AI model behind secure Route Handlers; server-only secrets.
- Vitest for pure logic/schema tests and Playwright for at least the key UI flow if practical.
- Small reusable components, domain-oriented folders, typed service layer, and no unneeded microservices.
- Add README, `.env.example`, architecture/deployment notes, and sensible package scripts.

### Suggested domain model (adapt based on compatibility tests)

`users`, `auth_accounts`, `sessions`, `workspaces`, `workspace_members`, `projects`, `architecture_versions`, `scenarios`, `scenario_results`, `ai_conversations`, `ai_messages`, `review_findings`, `usage_events`, and optional `share_links`. Scope records by user/workspace; keep architecture graph as validated JSON or separate compatible tables, depending on tested TiDB SQL behavior. Use stable IDs and explicit foreign keys/indexes only if the feature is supported and verified.

### Example typed graph model

An architecture has `id`, `name`, `version`, `description`, `requirements`, `assumptions`, `nodes[]`, `edges[]`, `reviewFindings[]`, and `createdAt`. Each node has `id`, `type`, `label`, `description`, `technology`, `position`, `capacityAssumptions`, `metadata`. Each edge has `id`, `source`, `target`, `kind`, `label`, `requestMultiplier`, and `metadata`. Put Zod schemas around these structures, with all AI and imported data validated.

## 6. Build sequence and acceptance criteria

**Milestone 1: Setup and database connection**
- Inspect/open my local folder. Bootstrap the Next.js project if absent. Create a clean `.env.example` and safe configuration. Guide me through creating TiDB Starter in PostgreSQL Compatible mode. Do not ask me to paste the connection URL into chat. Run a real connectivity check after I configure the secret. Confirm supported schema/driver features and choose ORM accordingly.

**Milestone 2: Functional SaaS skeleton**
- Implement authentication, dashboard, project CRUD, persistence, protected routes, basic starter templates, robust validation, navigation, and loading/error states.

**Milestone 3: Visual studio**
- Implement HoloCanvas editable architecture graph, inspector, animated edges, autosave, diagram import/export, responsive presentation.

**Milestone 4: AI workflows**
- Implement secure generation and Copilot with schema-validated structured outputs and a clearly labeled no-key sample mode.

**Milestone 5: Intelligence**
- Implement deterministic ScaleLab engine, evidence-based review rules, AI proposal/diff/approval, architecture snapshots/history and comparison.

**Milestone 6: Finish and deploy**
- Add comprehensive tests for graph validation, persistence boundaries, simulation math, auth, and critical UI routes; run lint, types, build, and smoke tests. Fix failures. Push to GitHub when I authorize it, set Vercel environment variables through approved UI, deploy, verify routes and DB calls, and provide a live demo walkthrough. No unverified claims of deployment.

**Minimum end-to-end demo acceptance test:** Sign in; create project; generate AI architecture (or explicitly select demo mode); drag/edit nodes; save and reopen; change ScaleLab scenario and inspect warning; run risk review; preview/apply optimization; view history; export diagram; log out and ensure private project is protected.

## 7. How to begin this task

First, inspect the available local files and summarize the existing state without assuming any project already exists. Then propose a short implementation plan and immediately begin Milestone 1. If TiDB has not been created, give me the exact browser steps and proceed in parallel on repo scaffolding and demo fixtures. After each milestone show: what code was changed, what was truly tested, what remains blocked, and the next concrete action. Keep implementation momentum; do not spend the entire session writing plans instead of code.

## Useful official references

- TiDB PostgreSQL-compatible quickstart: https://docs.pingcap.com/tidbcloud/pg-quickstart/
- TiDB PostgreSQL public-preview FAQs: https://docs.pingcap.com/tidbcloud/pg-faq/
- TiDB Console: https://tidbcloud.com/
- Vercel: https://vercel.com/

**Start building HoloStack AI now.**
