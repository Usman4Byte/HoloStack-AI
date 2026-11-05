# HoloStack AI — Deployment Guide

**Status:** Preparation only. No production Vercel deployment has been performed.
**Application shape:** One Next.js App Router application deployed as one Vercel project.

## Current release boundary

The application passes its local production build, database verification, unit suite, and desktop/mobile browser suite. The current TiDB PostgreSQL-compatible Starter offering is a preview without a production SLA. The configured Gemini project has not been live-verified. External monitoring and a provider-managed restore rehearsal are incomplete. Treat this guide as controlled deployment preparation, not a production approval.

Vercel documents Hobby for personal, non-commercial use. A commercial SaaS needs a plan whose terms allow the intended business use. Check current [Vercel plans](https://vercel.com/docs/plans/hobby), [function limits](https://vercel.com/docs/functions/limitations), and [regions](https://vercel.com/docs/regions) before selecting a target. As of this audit, `vercel.json` selects `iad1`, the Vercel region identifier for AWS `us-east-1`; recheck the mapping and database proximity at deployment time.

TiDB's PostgreSQL-compatible Starter is in public preview and has no production SLA as of this audit snapshot. See the [TiDB PostgreSQL-compatible FAQ](https://docs.pingcap.com/tidbcloud/pg-faq/) for current availability, limits, and backup behavior. Do not use preview availability assumptions as a production recovery commitment.

The deterministic local/demo experience runs without a Gemini key. That makes it possible to demonstrate core design/review interactions without AI usage charges, but it does not establish that a commercial production stack can run at $0. Vercel Hobby's use terms, TiDB preview limits, database availability, and project-specific Gemini quota/billing must all be evaluated for the actual deployment.

## 1. Prepare the target environment

1. Choose separate development, preview, and production database instances. Never point preview or test automation at production user data.
2. Prefer a production-supported PostgreSQL-compatible service with an availability commitment and a tested restore path for customer data. If TiDB is retained, explicitly accept the preview/no-SLA boundary and define an exit path.
3. Create the production database and role using the provider console. Grant only the permissions required by the application and the controlled migration operator. Keep the migration role separate if the provider supports it.
4. Save the provider's connection string and CA material directly into the deployment secret store. Do not paste them into chat, source code, build logs, or docs.
5. Choose a Vercel plan that permits the intended commercial use and verify current function duration, memory, bandwidth, invocation, and region limits. Match AI/database timeouts to the selected function duration.
6. Arrange an external uptime/error monitor with named alert ownership and escalation. Configure it to call `/api/ready` after deploy; `/api/health` only reports process liveness.
7. Test a provider-managed backup restoration into a separate instance and record recovery point/time results before accepting critical customer data.

## 2. Configure server-only environment variables

Set variables in the Vercel project environment UI or approved secret manager. Use separate values for Preview and Production.

| Variable | Requirement |
|---|---|
| `DATABASE_URL` | Required PostgreSQL-compatible connection string for the selected environment. Keep private. |
| `DATABASE_CA_CERT` | Optional provider CA PEM if required by that instance. TLS verification remains enabled. |
| `AUTH_SECRET` | Required random secret of at least 32 characters. Generate independently per environment. |
| `APP_URL` | Recommended canonical HTTPS origin in production, with no path. On Vercel, if unset or set to localhost, the app uses the HTTPS project production URL or deployment URL; public HTTP values are upgraded to HTTPS. Enable Vercel system environment variables. |
| `GEMINI_API_KEY` | Optional server-only key. Leave unset unless the project is verified for no-cost access and its data-use terms are accepted. |
| `GEMINI_ENABLED` | Keep `false` until the model, billing state, quota, and data-sharing behavior are verified. |
| `GEMINI_FREE_TIER_CONFIRMED` | Keep `false` until an operator confirms eligible access and no billing-enabled paid path. |
| `GEMINI_MODELS` | Comma-separated, ordered pool of verified generation models. See [AI integration](docs/AI_INTEGRATION.md#explicit-configuration) for the current pool. |

Never use a `NEXT_PUBLIC_*` variable for a database URL, CA certificate, auth secret, or AI key. Do not put secrets into build arguments or `vercel.json`. AI remains unavailable unless the key and both explicit opt-in flags are enabled. Review [AI_USAGE_AUDIT.md](AI_USAGE_AUDIT.md) before enabling it.

## 3. Verify schema and apply migrations deliberately

Migrations must not run during `next build`, application startup, or public API requests.

1. Review the selected target and verify its database name/role without printing the connection string.
2. From the controlled operator environment, run `npm run db:check` for verified TLS and `SELECT 1`.
3. Run `npm run db:verify` against an isolated scratch schema to confirm PostgreSQL and Drizzle behavior. The script uses synthetic data and removes only its randomly named objects.
4. Run `npm run db:verify-schema` to validate the exact checked-in application DDL and concurrency behavior in isolation. Review its generated secret-free report and expected target before proceeding.
5. Review each migration SQL diff and target name. Back up the target and confirm the recovery procedure.
6. Apply the reviewed migration from a controlled operator workflow using `npm run db:migrate`. The runner checks target, migration freshness, and file hash. It is not called by the app automatically.
7. Run `npm run db:verify-schema` again as appropriate, then test `/api/ready` against the target. Never alter TiDB-managed metadata tables.

The local development database already has the application migrations applied. Do not use the local database URL in a production or preview environment.

## 4. Build and deploy

The owner has not approved a Vercel deployment as part of this audit. After explicit release authorization:

1. Connect the approved private Git repository to one Vercel project. Keep the repository root as the project root and use Next.js framework defaults.
2. Use the Node 22 release line supported by the repository (Node.js 22.18+). Install with the lockfile (`npm ci`) and build with `npm run build`.
3. Configure environment variables with the correct Preview/Production scopes. Keep preview AI disabled unless it has a separately verified test key and explicit test allowance.
4. Set the deployment region near the chosen database after checking the current platform region list. Confirm the application pool and total warm-function connections fit provider and plan limits.
5. Run `npm run typecheck`, `npm run lint`, `npm test`, and a fresh `npm run build`. Run Playwright against the production build and only the intended non-production database.
6. Deploy after the release checklist is approved. Do not run migrations from the build step.

## 5. Post-deployment acceptance

- `GET /api/health` returns liveness without requiring the database.
- `GET /api/ready` returns ready only when the database and required application tables are available. Its errors are sanitized.
- Sign up and sign in with a synthetic account. Verify secure cookie flags on HTTPS, same-origin mutation behavior, logout, and protected-page redirect.
- Create a private project, change its graph, reload it, compare history, and restore an earlier version as a new revision. Verify another workspace cannot read it.
- Run deterministic ScaleLab/review and confirm slider movement produces no AI request.
- If AI is intentionally enabled, confirm the actual model/project access and free quota first, perform one user-consented request, verify quota accounting and safe failure behavior, and inspect the user's data-sharing notice.
- Confirm monitoring sees `/api/ready`, alert routing works, database backup/restore is documented, and a test alert reaches the named owner.
- Review platform function duration, database pool totals, connection resets, rate-limit storage, logs, and cost/usage alerts.

## 6. Rollback and recovery

- Revert application code through the Vercel deployment history after checking database compatibility. Do not assume code rollback reverses schema changes.
- Keep additive, backward-compatible migrations where possible. Destructive schema/data migrations require a separately reviewed backup and recovery plan.
- Use provider-managed snapshots/restore into a separate instance; verify application-level row counts, joins, and checksums before directing traffic. The repository's `npm run db:verify-recovery` exercises synthetic application rows only and is not a backup restore.
- If the database is unavailable, `/api/health` can remain live while `/api/ready` reports unavailable. Disable writes and AI rather than claiming service readiness.

## Troubleshooting

- **Missing DB configuration:** inspect Vercel environment scope and redeploy; do not print values to logs.
- **TLS connection failure:** verify provider CA and host settings. Do not disable certificate checking.
- **Readiness fails after deployment:** check schema state and target identity from the operator console; do not run an unreviewed migration from the app runtime.
- **AI reports unavailable model/quota:** verify the selected project's model access and quota in AI Studio. The app intentionally has no hidden fallback.
- **Repeated TiDB connection resets:** inspect provider-side connection metrics, network location, pool limits, and serverless concurrency; this audit observed transient resets that recovered.
