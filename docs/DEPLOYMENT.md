# Vercel deployment preparation

No deployment has been performed. Obtain explicit approval before pushing or deploying.

1. Review milestone completion and launch gaps. Milestone 1 alone is not a launchable authenticated SaaS.
2. Rotate any credential previously disclosed outside the intended secret store. Use separate development/preview/production databases and provider keys.
3. Run type checks, lint, unit tests, production build, browser flows, and database verification for the intended environment. Rehearse backups and restoration.
4. Import the approved Git repository into Vercel as a Next.js project. Use Node.js 22.x, the repository root, and the default Next.js output settings. `vercel.json` selects `iad1` near TiDB's `us-east-1` region.
5. Set server-only `DATABASE_URL`, optional `DATABASE_CA_CERT`, `AUTH_SECRET` (random, at least 32 characters), and the canonical `APP_URL` (production HTTPS origin, no path) in every applicable Vercel environment; add `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` only when AI is configured. Never put secrets in Vercel build command arguments or source files. Build must succeed without database connectivity.
6. Apply reviewed migrations once from a controlled operator workflow after target-specific compatibility verification. Do not migrate during `next build` or startup. No application migration is available in Milestone 1.
7. Deploy only after approval. Verify actual production URL, health route, auth protection, tenant boundaries, saved project round-trips, model quotas, and failure handling. A passing `/api/health` is not evidence that database calls work.

Before paid use: confirm provider GA/SLA suitability or move to production PostgreSQL; rehearse data export/restore, define recovery objectives, enable persistent rate limits, audit logs and error monitoring, and verify fleet-wide connection limits. Match query/AI timeouts to Vercel function budgets. No user-uploaded binaries in SQL.
