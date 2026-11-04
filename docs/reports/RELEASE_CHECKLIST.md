# HoloStack AI — Release Checklist

**Audit snapshot:** 2026-11-04
**Decision:** **READY WITH LIMITATIONS** for a supervised portfolio/demo review. Production launch is not cleared.
**Deployment state:** Not deployed.

## Passed in this audit

- [x] One Next.js App Router application; strict TypeScript; production build succeeds.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes with no lint output.
- [x] `npm test` passes: 51 unit tests across 11 files.
- [x] Full production-browser E2E passes: 16 passed on desktop/mobile; 2 opt-in live Gemini cases skipped.
- [x] Public sample, seven templates, deterministic sliders/review/report, and local prepared graph comparison function without Gemini.
- [x] Public sample browser journey observed zero AI-route calls.
- [x] Authentication, logout, session expiry/revocation, password change, CSRF/origin checks, account rate limits, and protected routes passed the exercised cases.
- [x] Project create/edit/reopen/duplicate/archive/trash/restore, revision conflicts, tenant isolation, version compare/restore, and saved intelligence-run flows passed the exercised cases.
- [x] HoloCanvas inspector, connections, layout, undo/redo, JSON import, PNG/JSON export, reset, canvas movement, and controls passed the exercised cases.
- [x] Verified TLS `SELECT 1`, PostgreSQL/Drizzle scratch compatibility, exact application DDL, quota/rate concurrency, and duplicate request lock checks passed.
- [x] Responsive screenshots inspected at 375, 768, 1440, and 1920 CSS pixels. No document-level horizontal overflow in those checks.
- [x] 10/50/100 component imports accepted; 200 components rejected at the documented 100-node schema limit.
- [x] One desktop production-browser import-acknowledgment sample recorded: 10 nodes 605 ms, 50 nodes 702 ms, 100 nodes 1,120 ms, and 200-node schema rejection 728 ms (`tests/e2e/performance-audit.spec.ts`). These include automation/browser handoff and are not a benchmark or SLO.
- [x] E2E cleanup removed 10 synthetic users and their test fixtures.
- [x] `npm audit --omit=dev`: zero production dependency vulnerabilities.
- [x] `.env.local` remains ignored; no credential values were read into this report or added to source control.

## Guest workspace follow-up — 2026-11-04

The prior public sample route is retired. `/guest` provides a tab-session workspace backed by validated browser `sessionStorage`; signed-in projects continue to use TiDB. A fresh validation run passed **56 unit tests across 12 files**, typecheck, lint, and production build. Focused Playwright checks passed the guest workspace on desktop and mobile, including refresh persistence, another-context isolation, ScaleLab scenario retention, and zero project API writes. The signed-in project lifecycle test and tenant/auth boundary test passed on desktop. Guest AI quota status loaded without making a provider POST; a live guest or member generation request was intentionally not repeated in this run. No migration, deployment, push, or external release occurred.

The AI generation client timeout was later aligned with its server-side model retry window. Typecheck, lint, build, and 58 unit tests pass with timeout/network distinction coverage. No live provider request was used for that fix.

## Limitations and required before general production release

- [ ] Select a production-suitable database tier/provider. TiDB PostgreSQL-compatible Starter is a public preview without a production SLA as of the audit snapshot.
- [ ] Verify a provider-managed database backup restore into a separate instance. The passing rehearsal was synthetic and application-level only.
- [ ] Configure external uptime/error monitoring, alert routing, and named ownership. `/api/health` and `/api/ready` are implemented, but no deployed endpoint is monitored.
- [ ] Confirm the actual Google AI Studio project's no-cost model access, quota, billing status, and data-use terms. No live provider call was made; AI remains opt-in/disabled until verified.
- [ ] Resolve or consciously accept the 16 moderate dev dependency findings in the ESLint/minimatch chain with compatible upstream versions. Do not run the current `npm audit fix --force` suggestion; it introduces an incompatible ESLint major downgrade.
- [ ] Choose a Vercel plan appropriate to commercial SaaS use; Hobby is documented for personal/non-commercial use. Verify current limits, environment scopes, region, function duration, and platform terms.
- [ ] Approve and perform a controlled deployment after release gates are closed. No deployment was performed in this audit.
- [ ] Define service-level objectives, recovery objectives, connection limits, incident support, data retention, and customer-data handling before accepting paying users.
- [ ] Decide whether email verification, password reset, account deletion, team administration/RBAC, public share, billing, and support are launch requirements; these are not implemented.

## Recorded warnings

- Several DB-backed browser journeys logged a transient TiDB `ECONNRESET`, recovered, and passed. Repeatability and provider-side cause were not established. Monitor connection errors and retry behavior before production traffic.
- Gemini live smoke tests were deliberately skipped. This is a verification gap, not a test pass for a live Google key.
- Capacity numbers and the prepared cache variant are modeled from visible assumptions; no load test, production telemetry, or measured optimization was performed.
- This audit is not an independent penetration test, accessibility certification, compliance review, or production-load test.

## Approval boundary

Local code changes, checks, and isolated scratch probes were completed. A Vercel deployment, user-data migration, Gemini quota-consuming smoke test, or other external release action requires explicit authorization. The existing local TiDB application schema was already migrated before this audit; this checklist run did not apply application migrations.
