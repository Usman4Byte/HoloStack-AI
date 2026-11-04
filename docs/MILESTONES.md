# Build milestones

Updated: 2026-11-04 (Asia/Karachi). This file distinguishes implemented functionality from the complete product brief.

## Milestone 1 — foundation and database integration

- [x] Read the entire brief and inspect the initially empty project folder.
- [x] Initialize Git and push the Milestone 1 foundation to the explicitly requested private GitHub repository. No deployment.
- [x] Bootstrap one Next.js App Router / strict TypeScript application with Tailwind, local UI primitives, Lucide, XYFlow, Zod, Vitest, and Playwright.
- [x] Add `.env.example`, ignored `.env.local`, server-only database entry points, strict certificate validation, bounded pooling, and sanitized errors.
- [x] Configure the actual TiDB instance locally; create the empty `holostackdb` database.
- [x] Execute real `pg` SELECT 1 over verified TLS.
- [x] Pass 13 actual database capability checks, including Drizzle CRUD/transactions and scratch migration idempotency; remove all scratch database objects.
- [x] Select Drizzle over pg for the tested subset; retain application-migration checkpoint.
- [x] Implement polished responsive sample workspace, setup guide, seven validated templates, interactive graph, inspector edits, connections, reset, JSON export, and loading/error/404 boundaries.
- [x] Document architecture, provider limitations, deployment preparation, and backup/exit path.
- [x] Final type checks, lint, unit tests, production build, and desktop/mobile browser flows.

### Verification evidence

- Real database: 13 checks passed; report is `.local/db-verification.json`.
- Unit tests: 12 passed, covering graph trust boundaries and credential/TLS configuration.
- Type checks, lint (zero warnings), and production build passed.
- Browser tests: 4/4 passed in Microsoft Edge at desktop and mobile sizes. They verify template selection, inspector editing, exported JSON contents, reset, layout overflow, setup guidance, health response, headers, and absence of browser runtime errors. A mobile reset accessible-name defect was fixed before the passing run.
- Credential boundary: 60 source/build files scanned, zero actual database credential matches; `.env.local` confirmed Git-ignored.
- Dependency audit: production dependencies have zero reported vulnerabilities. There are 16 moderate development-tool findings propagated from minimatch in the ESLint toolchain. Do not use `npm audit fix --force`: it proposes incompatible downgrades. This remains a development-tool maintenance item.
- Application migration checkpoint was exercised and correctly refused to apply a not-yet-authored schema.

Milestone 1 is complete. The password supplied in chat was saved locally at the user's request; rotate it in TiDB and update `.env.local` before sharing or deploying. At the end of Milestone 1, the workspace remained sample-only; authentication and cloud persistence were completed in Milestone 2.

## Milestone 2 — functional SaaS skeleton

- [x] Recheck the real PostgreSQL endpoint, pg TLS, JSON/JSONB, transaction and index baseline.
- [x] Test the exact checked-in schema, Drizzle ledger twice, row locking and eight concurrent rate increments in a disposable schema before applying the first application migration.
- [x] Apply reviewed Drizzle SQL migration only after exact-schema report matched the database, timestamp, and migration hash.
- [x] Implement scrypt password hashes, minimum 15 character passphrases, generic sign-in failures, random opaque 256-bit tokens, SHA-256 token hashes, HttpOnly/SameSite cookies, seven-day expiry, persistent account/IP rate buckets, origin/CSRF checks and sign-out-all-devices.
- [x] Enforce a database session and personal workspace lookup on private pages and API routes. Resolve project ownership by the authenticated workspace, not an input owner/workspace ID.
- [x] Implement project list, capped pagination, create from the seven local templates, open, edit graph/details/notes, duplicate, archive, trash, and restore. Delete is soft and reversible.
- [x] Snapshot every project revision in the same database transaction as its update; reject stale revisions and preserve editor drafts.
- [x] Implement profile/password settings, usage counters, restoreable project status tabs, retry/error UI, loading skeletons and auth boundaries.
- [x] Complete DB-backed desktop/mobile browser integration suite; fix the sign-up/sign-in transition assertion and verify exact-run fixture cleanup.
- [x] Verify production build, final type/lint, 82-file credential marker scan, and Git diff whitespace.

### Milestone 2 verification evidence

The real TiDB PostgreSQL-compatible endpoint passed TLS connection checks and all 13 provider/driver compatibility checks. The application schema was exercised in a disposable schema, including repeat application of the Drizzle ledger, row locking, and eight concurrent rate-limit increments; scratch objects were removed. The reviewed first application migration was then applied to `holostackdb`, and a repeat run safely skipped the existing migration after validating the report target, timestamp, and SQL hash.

The DB-backed end-to-end suite passed **8/8** on desktop and mobile; this covers account creation and sign-in, private workspace project create/edit/reload, history snapshots, duplicate/archive/trash/restore, profile edits, logout and protected-route redirect, tenant isolation, CSRF rejection, stale/concurrent revisions, payload limits, session expiry, password change, and session revocation. The test teardown removed all six synthetic accounts and their private fixtures. The focused account/project lifecycle rerun also verifies the optimized transaction-scoped cleanup.

Unit tests: **17 passed**. `npm run typecheck`, `npm run lint`, and `npm run build` passed. A source scan across 82 tracked/untracked code, docs, and config files found zero matches for the database credential markers or API-key marker pattern. `.env.local` remains Git-ignored and was not included in the scan output. No Vercel deployment was performed.

Milestone 2 application work and checks are complete. Commit `75235ae` is the current pushed baseline in the requested private GitHub repository.

## Milestone 3 — full visual studio

- [x] Full 16-type palette, drag/edit/select/connect/delete, component inspector, animated edges, minimap, zoom, fit view and generated layout.
- [x] Snapshot-based undo/redo with keyboard and button controls, including batched node-drag history.
- [x] Strict JSON import with a 256 KiB UTF-8 cap and graph schema validation; draft JSON export.
- [x] Bounded, self-contained PNG export with escaped architecture text and a clear design-model footer.
- [x] Debounced 850 ms project autosave, revision-aware save sequencing, conflict draft preservation/reload, manual retry for transient failures, and unsaved-navigation protection.
- [x] Keyboard undo/redo, delete shortcuts, labeled palette/actions, reduced-motion support, and desktop/mobile no-overflow and canvas-visibility checks.

### Milestone 3 verification evidence

Unit tests: **21 passed** across four files, including deterministic bounded layout with cyclic graphs, schema-validated/size-capped imports, and XML-safe SVG generation. Production build, typecheck, and lint passed. The complete production-browser suite passed **8/8** on desktop and mobile, covering TiDB autosave and 409 conflict recovery along with keyboard history, palette actions, JSON import, real PNG signature/export, responsive rendering, and reset. After visually inspecting the generated mobile screenshot, a viewport reset defect was fixed; the focused studio/setup suite then passed **4/4**, with explicit assertions that components remain in view after reset and selected-node Delete/undo works from the focused canvas.

No AI generation, measured performance data, or infrastructure provisioning is part of this milestone.

## Milestone 4 — AI workflows

- [x] Server-only Gemini integration with structured output, strict schema/graph validation, bounded output and timeout, sanitized failures, and one provider attempt per explicit user action (no automatic repair/retry).
- [x] Persistent per-user/global daily quotas, usage records, project-scoped artifacts/conversation, and concurrent duplicate-request suppression.
- [x] Copilot with architecture context and typed graph patches; local deterministic validation, diff, visualization, and user-approved application.
- [x] Clearly labeled authored templates without an API key.

### Milestone 4 verification evidence

The AI workflow migration was applied to the verified TiDB PostgreSQL-compatible database. TLS `SELECT 1` passed. The isolated schema probe passed application DDL/repeat-run checks, row locking, eight atomic rate-limit increments, exactly three concurrent daily quota reservations, and a simultaneous identical-request probe with one winner. Unit tests: **33 passed**; typecheck, lint (zero warnings), and production build passed. No live Gemini request was sent and no Vercel deployment was performed. The first full browser run encountered transient database `ECONNRESET` errors and failed project writes; the subsequent complete production-browser run during Module 5 passed all 12 runnable tests on desktop/mobile and reported the 2 opted-in live Gemini tests as skipped. The provider remains unverified because no key/free-tier opt-in is configured.

AI remains explicitly disabled locally until the owner supplies a key and independently confirms eligible no-cost access in Google AI Studio. Provider access, current account/model availability, and free-tier status remain unverified.

## Milestone 5 — intelligence

- [x] Deterministic capacity model with visible assumptions and bounded cycle handling.
- [x] Evidence-based rule review, named workload scenarios, and tenant-scoped saved results.
- [x] Candidate optimization graph, before/after diff, explicit apply/discard, version comparison, and conflict-aware restore as a new revision.
- [x] Markdown architecture report with components, flows, capacity assumptions, limits, and rule findings.

### Milestone 5 verification evidence

`0002_intelligence_runs.sql` was applied to the actual TiDB database after TLS `SELECT 1`, all 13 compatibility checks, and exact scratch-schema migration verification. The scratch probe applied and repeated all three migrations, checked row locking and quota concurrency, and admitted exactly one of eight identical in-flight requests. Scenario persistence, revision binding, version comparison, and restoring version 1 as a new revision passed in the real DB-backed production-browser flow on desktop and mobile. The full browser suite passed **12/12 runnable tests** (2 live Gemini smoke tests skipped because opt-in credentials are absent); test teardown removed all 10 synthetic accounts and related fixtures. Unit tests: **42 passed** across 9 files. `npm run typecheck`, `npm run lint`, and `npm run build` passed. A transient TiDB `ECONNRESET` appeared during the full suite and recovered; monitor provider connection stability during launch hardening. No live Gemini call or deployment was performed.

## Milestone 6 — launch hardening and approved deployment

- [x] Complete end-to-end acceptance flow from sign-in to protected-project logout.
- [x] Add distinct liveness and database/application-schema readiness endpoints with sanitized failures and correct partial readiness reporting.
- [x] Extend auth, persistence, AI-boundary, rate-limit, and concurrency validation; rehearse synthetic application recovery across isolated schemas.
- [x] Clarify onboarding and feature availability; label local estimates, optional AI configuration, and unimplemented monitoring/deployment capabilities truthfully.
- [ ] Configure external production uptime/error monitoring and alert ownership; test TiDB provider-managed backup restoration in a separate instance.
- [x] Continue using the explicitly requested private GitHub repository. No Vercel deployment has been requested or performed; deployment requires separate approval.

### Milestone 6 verification evidence

`GET /api/health` is a database-independent liveness check. `GET /api/ready` checks a live database query and the required project/intelligence tables, returns non-cacheable readiness state, distinguishes a reachable database from a missing application schema, and logs only allow-listed error codes. The readiness route unit tests cover success and both failure boundaries. The production-browser suite passed **12/12 runnable tests** on desktop/mobile; two live Gemini tests were skipped because explicit provider opt-in credentials are absent. It exercised DB-backed auth, tenant/project boundaries, scenario persistence, offline AI behavior, and readiness against TiDB; teardown removed all 10 synthetic accounts. After refining partial readiness reporting, the focused desktop/mobile setup/liveness/readiness suite passed **4/4**.

Unit tests: **45 passed** across 10 files. `npm run typecheck`, `npm run lint`, and `npm run build` passed. The real TiDB synthetic recovery rehearsal copied a fixture tenant, project graph, architecture history, and intelligence scenario between two disposable migrated schemas; canonical JSON hashes, row counts, and joins matched, and both schemas were removed. Prior exact-schema verification continues to cover concurrent rate/quota reservation and duplicate-request suppression. The browser suite logged transient TiDB `ECONNRESET` messages and recovered; connection stability still needs monitoring.

The recovery rehearsal is application-level and synthetic. Provider-managed backup restoration and external production monitoring remain unverified because no separate restore instance, deployed URL, or monitor/alert owner is configured. A Vercel deployment has not been performed and still requires explicit approval.

P1/P2 modules remain roadmap-only; see `ARCHITECTURE.md`.
