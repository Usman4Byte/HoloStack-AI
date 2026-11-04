# HoloStack AI — Final Audit, QA & Release Readiness

**Audit snapshot:** 2026-11-04 (Asia/Karachi)
**Decision:** **READY WITH LIMITATIONS** for a supervised portfolio/demo review. **Not cleared for a production SaaS launch.**
**Deployment:** Not performed.
**Live Gemini calls:** None.
**Database migrations:** None run during this audit; the existing application schema was verified in isolation and the already-migrated local database was exercised by tests.

## Executive summary

HoloStack AI is a single Next.js App Router application with real TiDB PostgreSQL-compatible persistence, credential-safe authentication, tenant-scoped project operations, an interactive React Flow canvas, saved versions, deterministic capacity/risk analysis, and an explicitly consented server-side Gemini integration. The public sample works without an account, database connection, Gemini key, or AI request.

The audit found and fixed two concrete issues: production deployments now fail closed unless an HTTPS `APP_URL` is configured, and the public sample now includes deterministic ScaleLab/rule-review controls plus a locally authored cache comparison. The review rules explicitly report evidence and uncertainty. Tests verify that routine page, slider, canvas, and project interactions do not call AI routes.

All 51 unit tests passed. Typecheck, lint, and the production build passed. The full production-browser suite passed **16 tests** across desktop and mobile; **2 live Gemini tests were skipped** because live-provider verification is intentionally disabled. Four responsive captures were inspected at 375, 768, 1440, and 1920 CSS pixels with no document-level horizontal overflow. Database connection, PostgreSQL compatibility probes, exact schema/concurrency checks, authentication, tenant isolation, project persistence, versioning, and deterministic intelligence flows passed. Browser tests logged intermittent TiDB `ECONNRESET` events; affected journeys recovered and completed. This is a real stability observation and should be monitored before production use.

The principal release limits are the TiDB PostgreSQL-compatible Starter preview/no-SLA status, unverified account-specific Gemini model/quota access, the absence of external monitoring and a provider-managed restore rehearsal, and the 16 moderate development-tool dependency findings in the ESLint/minimatch chain. Production dependencies have zero reported npm audit vulnerabilities. Vercel deployment has not been prepared against a live Vercel project or approved.

**Zero-budget assessment:** HoloStack's public deterministic demo does not require Gemini and sends no AI traffic. The audit cannot promise a zero-cost commercial SaaS: the TiDB PostgreSQL-compatible offering is a free preview with no SLA, Vercel Hobby is limited to personal/non-commercial use, and the actual Google project quota/billing state is unverified. Confirm each provider's current terms and eligible free quotas; do not treat a free model price as a billing safeguard.

## Audit matrix

Status meanings: **PASS** means the stated local/code/provider check passed; **PARTIAL** means only the listed boundary was verified; **BLOCKED** means verification needs provider configuration or separate authorization; **MISSING** means the capability is not present; **N/A** means outside the Phase 1 release scope. No unresolved implementation test failure remained after the mobile import-test hydration guard was added. Items that are not shipped or externally verified are recorded as missing/blocked rather than inferred as passes.

| Area | Status | Evidence and limits |
|---|---|---|
| Required stack and application shape | **PASS** | One Next.js 16.4.4 App Router application; strict TypeScript; Drizzle/`pg`; React Flow; one-app Vercel configuration. `npm run build` passed and enumerated app/API routes. |
| TiDB PostgreSQL-compatible connection | **PASS** | `npm run db:check`: certificate-verified TLS and `SELECT 1`. No credential values were emitted. |
| PostgreSQL/Drizzle compatibility | **PASS** | `npm run db:verify`: isolated scratch checks for UUID/JSON/JSONB/timestamps, constraints/indexes, parameterized CRUD, transactions, `ON CONFLICT`, tenant-scoped joins, Drizzle mapping, and scratch-migration repeatability. |
| Current schema and concurrency | **PASS** | `npm run db:verify-schema`: exact application DDL, migration repeat-run, row-lock behavior, eight atomic rate increments, three concurrent user quota reservations, and one winner for eight identical in-flight requests. Scratch-only verification; no managed metadata tables changed. |
| Authentication and session security | **PASS** | Signup, login/logout, password change, expiry, revocation, CSRF/origin, rate limits, and protected pages exercised in browser/unit checks. Passwords use scrypt; opaque tokens are hashed in storage; cookies are HttpOnly/SameSite=Lax and secure on HTTPS. |
| Tenant isolation and conflict handling | **PASS** | Cross-tenant access and stale revisions rejected; project updates and revision snapshots are transactional and workspace-scoped. Auth/project E2E scenarios passed. |
| HoloCanvas editing/import/export | **PASS** | React Flow canvas edits, connection/layout/history operations, import validation, PNG/JSON export, reset, inspector, minimap/controls, and drag behavior passed focused browser checks. |
| Public deterministic demo | **PASS** | Seven authored templates, local sliders, rule review, report export, and a labeled prepared graph comparison work without login or Gemini. E2E captured zero `/api/ai/` requests during the sample journey. |
| ScaleLab and rule review | **PASS WITH MODEL LIMITS** | Deterministic TypeScript calculation, bounded cycle handling, visible assumptions, evidence, and low-confidence heuristics. Outputs are estimates and text/graph heuristics, not measured telemetry or proof of security. |
| Project versions and scenario persistence | **PASS** | Project lifecycle, snapshots, compare/restore-as-new-revision, and saved intelligence scenarios were exercised against TiDB in browser tests. |
| Gemini architecture integration | **PARTIAL / BLOCKED FOR LIVE VERIFICATION** | Provider calls are server-side, quota-controlled and consent-gated. Unit/mock and offline-path checks pass. No live key/model/quota probe was performed; the two explicitly enabled live smoke tests were skipped. |
| Graph-size and responsiveness checks | **PASS FOR THE TESTED BOUNDS** | Imported 10, 50, and 100-node graphs at desktop and mobile; the strict schema rejected 200 nodes. Document overflow check passed at 375/768/1440/1920. One desktop production-browser import-acknowledgment timing sample is recorded below; this is not a load/performance benchmark. |
| Operational readiness | **PARTIAL** | Health/readiness endpoints and a synthetic isolated-schema recovery rehearsal exist. External monitoring, alert ownership, and provider-managed backup restore have not been configured or tested. |
| External production deployment | **NOT PERFORMED** | No production Vercel project/environment was verified and no deployment was requested for this audit. |
| Live Gemini model/key/quota check | **BLOCKED** | No authorized live request; actual Google AI Studio project access, billing status, and per-model quota remain unverified. |
| External uptime/error monitoring | **MISSING** | No monitor or alert owner is configured. |
| Provider-managed backup restore | **MISSING** | Only an application-level synthetic recovery rehearsal has been run. |
| Sustained app/browser/load performance test | **MISSING** | Graph-size behavior was checked; request throughput, latency SLOs, concurrent active users, and real infrastructure capacity were not measured. |
| Email verification, password recovery, account deletion, team administration/RBAC, public sharing, billing | **MISSING** | Not implemented in the audited Phase 1 product. |
| Future brief modules beyond current milestones | **N/A — ROADMAP** | These modules are not claimed complete; see `docs/ARCHITECTURE.md` and `docs/MILESTONES.md`. |

## Verification record

### Code and dependency checks

- `npm test`: **51 tests passed** across 11 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no lint output.
- `npm run build`: passed; static pages generated and dynamic API/project routes enumerated.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm audit`: **16 moderate development dependency findings**, all in the ESLint/minimatch toolchain; no high or critical findings reported. npm's suggested `--force` remediation would replace ESLint with an incompatible major version and was not applied.
- Full `npx playwright test`: **16 passed, 2 skipped**. The skips are opt-in live Gemini smoke tests; the provider was not contacted.
- Browser test teardown removed **10 synthetic accounts and related fixtures**. No real customer fixture was used.

### Database checks

- `npm run db:check`: pass; verified TLS and `SELECT 1`.
- `npm run db:verify`: pass; isolated PostgreSQL/Drizzle compatibility and transaction checks.
- `npm run db:verify-schema`: pass; exact migration/schema and concurrency checks.
- Existing application migrations were already applied to the configured local database before this audit. The audit did not invoke `npm run db:migrate` or modify application records outside generated, isolated test fixtures.
- Playwright logs contained transient TiDB connection resets during signup/project journeys. The tested journeys recovered, passed, and cleaned their synthetic data. Repeated transient resets remain an operational concern.

### Responsive and graph-size review

The public demo was rendered at **375, 768, 1440, and 1920 CSS pixels**. The document had no horizontal overflow at any width. On the narrow viewport, the top navigation wraps and the canvas remains an interactive, internally pannable surface. Desktop layouts display the canvas, inspector, and intelligence panels side by side where space permits. Full-page captures were visually reviewed from the final production build.

Graph import checks covered **10, 50, and 100 components**. The app accepted each graph; the schema rejected 200 components at the documented 100-component bound. This establishes functional behavior at those sample sizes only. It does not establish a latency SLO, throughput, browser-memory ceiling, or infrastructure capacity.

One production-build Playwright sample on desktop Microsoft Edge measured file-selection-to-visible-status acknowledgment as follows:

| Components | Result | Acknowledgment time |
|---:|---|---:|
| 10 | Accepted | 605 ms |
| 50 | Accepted | 702 ms |
| 100 | Accepted | 1,120 ms |
| 200 | Rejected at the strict schema bound | 728 ms |

These are one-run, test-machine measurements that include Playwright/browser handoff and wait for the status message; they are not render-only measurements, statistically repeated benchmarks, server throughput, or an SLO. The reproducible focused test is `tests/e2e/performance-audit.spec.ts`.

## Findings and release actions

### Release blockers for general production use

1. **TiDB PostgreSQL-compatible Starter is a preview service with no production SLA.** Keep this release to supervised demos until the data store has a production-suitable availability commitment or a reviewed alternative. Provider details can change; recheck the [TiDB PostgreSQL-compatible FAQ](https://docs.pingcap.com/tidbcloud/pg-faq/) before a launch decision.
2. **Google Gemini access is unverified.** No live provider request was made. Model availability, per-project free quota, billing state, and data-use settings must be checked in the actual Google AI Studio project before enabling AI. A listed free price does not prove free access or quota. See the [model catalog](https://ai.google.dev/gemini-api/docs/models), [structured output guide](https://ai.google.dev/gemini-api/docs/structured-output), and [pricing page](https://ai.google.dev/gemini-api/docs/pricing).
3. **Recovery and alerting are incomplete.** The application-level synthetic recovery exercise passed, but provider-managed backup restoration to a separate instance and external uptime/error alerts with a named owner have not been verified.
4. **Vercel production release remains unverified and unapproved.** No deploy was run. Verify project settings, environment scopes, deployment region, plan suitability, function duration, and secrets after the owner chooses a target. Vercel Hobby is documented for personal/non-commercial use; it is not a commercial SaaS launch plan. Check current [Hobby plan](https://vercel.com/docs/plans/hobby), [function limits](https://vercel.com/docs/functions/limitations), and [regions](https://vercel.com/docs/regions).
5. **Development dependency maintenance remains open.** Resolve the 16 moderate ESLint/minimatch advisories through compatible upstream versions, then rerun lint and the full audit. Production dependencies currently report zero npm audit vulnerabilities.

### Product and security boundaries

- No email verification, password recovery, account deletion, team membership administration, public sharing, billing, or production support workflow is implemented.
- Sample-architecture findings are deterministic heuristics. A missing node or text term is not evidence that a deployed implementation lacks the control; a model finding does not prove a vulnerability.
- ScaleLab is an assumption-based calculator, not load testing or live infrastructure telemetry. The public cache comparison is locally authored, not a Gemini recommendation, is not applied, and is not measured performance improvement.
- AI prompts and resulting artifacts are intentionally stored in the signed-in project database; Gemini free-tier data-handling terms may allow submitted content to improve provider products. Consent is shown per action. Do not submit secrets or confidential/customer data unless those terms are acceptable.
- The audit is not an independent penetration test, accessibility certification, compliance assessment, or production traffic test.

## Evidence map

- Build scope: `docs/MILESTONES.md`, `README.md`, `src/app`, `src/components/studio/sample-studio.tsx`.
- Database: `scripts/check-database.ts`, `scripts/verify-database.ts`, `scripts/verify-schema.ts`, `.local/db-verification.json` (generated, ignored).
- Authentication and origin policy: `src/server/auth`, `src/server/http/request.ts`, `tests/unit/auth-security.test.ts`, `tests/e2e/auth-projects.spec.ts`.
- AI boundaries: `src/server/ai/provider.ts`, `src/server/ai/quota.ts`, `src/app/api/ai`, `docs/AI_INTEGRATION.md`, `tests/e2e/ai-offline.spec.ts`, `tests/e2e/ai-live-smoke.spec.ts`.
- Deterministic public intelligence: `src/domain/intelligence/engine.ts`, `src/domain/architecture/prepared-cache-variant.ts`, `src/components/intelligence/public-sample-panel.tsx`, `tests/e2e/release-audit.spec.ts`.
- Deployment prerequisites and known gaps: `DEPLOYMENT_GUIDE.md`, `KNOWN_LIMITATIONS.md`, `RELEASE_CHECKLIST.md`.

## Decision

**READY WITH LIMITATIONS** for a local or supervised portfolio/demo review using the real tested database and the public deterministic sample. The authenticated app and persistence paths passed the audited journeys. Do not present this as a production SaaS release until the TiDB service tier, provider access/consent, dependency findings, backups, monitoring, and deployment environment have been addressed and re-audited.
