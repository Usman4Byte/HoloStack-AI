# Build milestones

Updated: 2026-11-03 (Asia/Karachi). This file distinguishes implemented functionality from the complete product brief.

## Milestone 1 — foundation and database integration

- [x] Read the entire brief and inspect the initially empty project folder.
- [x] Initialize Git locally; no commit, remote, push, or deployment.
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

## Milestone 2 — functional SaaS skeleton (next)

- [ ] Review and apply first Drizzle SQL migration to the verified database.
- [ ] Implement real sign-up/sign-in/logout, session expiration, CSRF/origin checks, password/session security, and persistent rate limits.
- [ ] Enforce tenant membership and ownership in every private route/service.
- [ ] Implement project create/list/rename/duplicate/archive/delete and database-backed versioned graph saves.
- [ ] Add authenticated dashboard, account settings, pagination, empty/loading/error states, and integration tests for auth and isolation.

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

- [ ] Complete end-to-end acceptance flow from sign-in to protected-project logout.
- [ ] Auth/persistence/AI boundary tests, rate-limit and concurrency validation, recovery rehearsal, production monitoring.
- [ ] Marketing/onboarding polish and truthful feature availability.
- [ ] GitHub push and Vercel deployment only after explicit user approval; verify actual live routes and database calls.

P1/P2 modules remain roadmap-only; see `ARCHITECTURE.md`.
