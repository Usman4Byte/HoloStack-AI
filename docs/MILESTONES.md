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
- [x] Persistent per-user/global usage counters, usage records, project-scoped artifacts/conversation, and concurrent duplicate-request suppression. (Daily-cap enforcement was later removed; see AI daily cap removal below.)
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

## Final comprehensive audit snapshot — 2026-11-04

- [x] Run typecheck, lint, production build, unit tests, full desktop/mobile Playwright, current TiDB connection, compatibility, and exact-schema/concurrency checks.
- [x] Add the public deterministic ScaleLab/rule-review sample and prepared, locally authored cache comparison; verify that sample interactions make no AI-route calls.
- [x] Tighten production origin configuration so production requires an explicit HTTPS `APP_URL`.
- [x] Capture and visually inspect the public page at 375, 768, 1440, and 1920 CSS pixels. No document-level horizontal overflow was observed.
- [x] Add release, AI usage, deployment, and limitation reports at the repository root.
- [x] Verify successful live Gemini generation. On 2026-11-04, four consecutive synthetic generation actions passed on the local production build. TiDB attempt records confirmed round robin wraparound and successful fallback. See [AI integration verification](AI_INTEGRATION.md#current-verification-boundary).
- [ ] Verify provider-managed backup restore, external uptime/error monitoring, and a Vercel deployment. These require separate production resources and release authorization.

### Audit evidence

`npm test`: **51/51**. Typecheck, lint, and production build passed. Full Playwright: **16 passed, 2 skipped** (only the explicit live-Gemini smoke tests); a separate production-browser performance audit passed and recorded 605/702/1,120 ms import acknowledgments for 10/50/100 nodes and 728 ms schema rejection for 200 nodes (one-run, automation-inclusive samples, not an SLO). TiDB `db:check`, isolated `db:verify`, and exact DDL/concurrency `db:verify-schema` all passed. Production npm dependencies have zero audit findings; the development tree reports 16 moderate ESLint/minimatch findings. Browser E2E logged transient TiDB resets that recovered; treat provider connection stability as an operational item. No application migration, live Gemini request, or deployment was performed during the audit. The full status and evidence are in `reports/FINAL_AUDIT_REPORT.md`, `reports/AI_USAGE_AUDIT.md`, `reports/RELEASE_CHECKLIST.md`, `reports/DEPLOYMENT_GUIDE.md`, and `reports/KNOWN_LIMITATIONS.md`.

## Workspace usability follow-up — 2026-11-04

This earlier flow directed visitors to signup or a temporary public sample. It was superseded by the guest-workspace strategy below. The private project editor still offers separate tools for Scale & review, AI assistant, and Details & history. The canvas guides users through adding and connecting components. The inspector edits component and connection settings and highlights the selected item on the diagram.

Typecheck, lint, the production build, and **55 unit tests** passed. The production browser suite recorded **18 passed and 2 skipped** across desktop and mobile. It checked selection highlights, temporary edits and reload, signup from the sample, persistence of private component and connection edits, access controls, scenario runs, and exports. The two live Gemini smoke cases were skipped under the default offline test configuration.

## Guest workspace strategy — 2026-11-04

- [x] Replace the public sample route with `/guest`; visitors can create, edit, archive, duplicate, trash, and restore projects without an account.
- [x] Keep guest project data, current graph, project details, bounded version history, saved deterministic scenarios, AI candidates, and copilot messages in a strict, validated `sessionStorage` envelope. Guest writes do not call project persistence APIs.
- [x] Preserve authenticated persistence in TiDB. The existing private dashboard and project APIs remain session-checked and workspace-scoped.
- [x] Add explicit guest Gemini status/generation/copilot endpoints. Require same-origin, explicit consent, schema validation, server-side provider calls, and short-window rate limiting. Guest prompts and results are not stored by HoloStack on the server; hashed usage metadata is.
- [x] Remove `/sample` and replace signup/sample navigation with a clear guest entry point.

Verification: `npm run typecheck`, `npm run lint`, and `npm run build` passed. The new production-browser guest flow passed on desktop and mobile. It checks creating a blank project, adding/editing a component, writing notes, persisting a ScaleLab scenario and versions through refresh, and isolating session data in a second browser context. It also confirms guest edits do not write to `/api/projects`, and the AI quota display is requested without any AI provider POST. Authenticated route protection remains covered by the existing release audit. Browser `sessionStorage` normally ends with its tab session; browser session-restore behavior can restore tabs, depending on the browser.

## AI generation timeout correction — 2026-11-04

The UI's generic “Could not reach the server” can be emitted when browser `fetch` aborts, so it does not prove the Next.js server was unreachable. The local configuration had three models, each with a 25-second provider timeout, while the shared client wrapper aborted all requests after 30 seconds. That could cancel generation while model failover was still running. AI generation and assistant requests now receive a timeout derived from configured model count (25 seconds per model plus 15 seconds of overhead, capped below the route's 240-second runtime); genuine network failures retain their distinct connectivity message, while an elapsed timeout explains that server processing may still be underway. This uses no additional DB schema and does not call Gemini automatically.

Verification: typecheck, lint, production build, and **58/58 unit tests** passed. New focused tests cover timeout-vs-network error classification. No live Gemini request was issued, so provider latency and end-to-end failover are not reverified in this correction.

## AI daily cap removal — 2026-11-04

- [x] Remove signed-in, guest, and app-wide daily AI action/model-attempt caps. Usage counters remain for visibility and transactional round-robin selection.
- [x] Permit failover through each configured model once without HoloStack daily caps.
- [x] Replace remaining-quota UI with action/model usage counts and provider/abuse-limit disclosure.

Verification: `npm run typecheck`, `npm run lint`, `npm test` (**58/58**), and `npm run build` passed. The focused production-browser AI-offline test passed on desktop and verified the no-daily-cap status, disabled-provider path, and no AI generation request on page load; teardown removed its synthetic account and fixtures. No Gemini request was needed. Short-window endpoint rate limits and Google's own provider quotas remain in force.

## Complete light UI/UX rebuild — 2026-11-04

- [x] Replace the dark visual system with an editorial light design system: warm white surfaces, ink typography, orange emphasis, restrained borders, consistent focus indicators, and reduced-motion support.
- [x] Rebuild the public landing page with a working architecture preview, authored template gallery, deterministic capacity slider, clear onboarding paths, and truthful product capability copy.
- [x] Apply the visual system to authentication, guest and authenticated workspaces, architecture studio, AI tools, deterministic analysis, account settings, operational setup, and error states while retaining each route's existing service boundaries.
- [x] Improve small-screen navigation and layouts; add mobile password visibility controls and accessible confirmations for destructive or unsaved-work actions.
- [x] Preserve the guest/persisted-user split, React Flow CRUD, deterministic ScaleLab/risk checks, and explicit user-triggered AI actions. The landing simulation and routine canvas interactions make no Gemini request.
- [x] Add a route-by-route release audit in [UI redesign audit](UI_REDESIGN_AUDIT.md).

Verification: `npm run typecheck`, `npm run lint`, production `npm run build`, and `npm test` (**58/58**) passed. The focused Playwright redesign suite passed **4/4** using desktop and mobile projects. It checked public preview interactions, no AI calls from the deterministic slider, signup form visibility, guest template deep-link creation, the editable studio and AI tab with no AI POST, and no document-level horizontal overflow at 375, 768, 1024, 1440, and 1920 CSS pixels. Full-page marketing and studio captures at 375 and 1440 pixels were visually inspected. Authenticated database-backed dashboard/settings flows are preserved and were not re-exercised by this focused visual suite; their prior acceptance evidence remains above. No database migration, AI provider request, external deployment, or GitHub push was performed for this UI work.

## Frontend technology privacy and guest onboarding — 2026-11-04

- [x] Remove implementation-provider and database-vendor names from user-facing setup guidance, guest storage messages, usage copy, and authored template labels. Account data remains persisted as before; guest data remains session-scoped.
- [x] Keep provider/model identifiers server-side: AI status responses now contain only availability and action count, and successful AI responses omit model metadata.
- [x] Replace detailed AI configuration warnings with a concise availability message while retaining a clear disclosure that submitted prompts and architecture context go to an external AI service.
- [x] Add a prominent “Continue as guest” path on the marketing hero, mobile/public navigation, login, and signup.

Verification: typecheck, lint, `npm test` (**60/60**), and production build passed. Focused Playwright passed **4/4** light redesign tests and **2/2** authenticated offline-AI tests across desktop/mobile. Browser assertions confirmed guest entry links, no implementation stack names in public/AI/setup copy, no provider/model fields in the AI status payload, and no AI POST from opening the AI tab. No live AI request, database migration, or deployment was part of these checks.

## Mobile navigation and responsive workspace follow-up — 2026-11-05

- [x] Replace always-visible workspace links on tablet/phone with an accessible hamburger menu shared by guest and signed-in shells.
- [x] Fix narrow guest header actions and storage notice wrapping; refine studio section tabs, actions, and inspector layouts down to 320 CSS pixels.
- [x] Add a guest navigation link back to the landing page.
- [x] Show the Usman4Byte attribution and a GitHub/LinkedIn profile menu at both the top and bottom of every page.

Verification: typecheck, lint, and production build passed. The UI Playwright file passed **6/6** across desktop and mobile projects. It checked landing/auth responsiveness down to 320 CSS pixels, guest dashboard overflow at 320, 360, 375, 390, 414, 430, 768, 1024, and 1440 CSS pixels, editor overflow at 320 through 768, hamburger navigation, return-to-home link, and top/footer profile links. A 375px full-page capture was visually reviewed. No database migration, AI provider call, deployment, or repository push was performed.
