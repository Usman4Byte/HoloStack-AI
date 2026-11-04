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

Milestone 1 is complete. The password supplied in chat was saved locally at the user's request; rotate it in TiDB and update `.env.local` before sharing or deploying. The local workspace is a sample; authentication and cloud persistence are still Milestone 2 work.

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

Milestone 2 application work and checks are complete. Commit `8c61649` was pushed to the requested private GitHub repository; the local tree is clean.

## Milestone 3 — full visual studio

- [x] Starter XYFlow canvas, drag/edit/select/connect/delete, inspector, minimap, zoom, animated edges, JSON export.
- [ ] Add full node palette, robust undo/redo, graph import with byte limits, PNG export, generated layout, autosave and 409 conflict handling.
- [ ] Complete keyboard workflows and accessibility audit.

## Milestone 4 — AI workflows

- [ ] Configurable backend provider integration, structured generation, schema repair, quotas and timeouts.
- [ ] Copilot with architecture context and typed graph patches.
- [x] Clearly labeled authored templates without an API key.

## Milestone 5 — intelligence

- [ ] Deterministic capacity model with visible assumptions and bounded cycle handling.
- [ ] Evidence-based rule review, scenarios, and saved results.
- [ ] Candidate optimization graph, diff, accept/reject, history and restoration.
- [ ] Markdown architecture report.

## Milestone 6 — launch hardening and approved deployment

- [x] Complete end-to-end acceptance flow from sign-in to protected-project logout.
- [ ] Auth/persistence/AI boundary tests, rate-limit and concurrency validation, recovery rehearsal, production monitoring.
- [ ] Marketing/onboarding polish and truthful feature availability.
- [x] Existing GitHub repo was explicitly requested and Milestone 1 was pushed. Push subsequent milestones after local review; Vercel deployment still needs explicit approval.

P1/P2 modules remain roadmap-only; see `ARCHITECTURE.md`.
