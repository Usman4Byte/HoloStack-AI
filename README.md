# HoloStack AI

An architecture design and intelligence workspace, built as one Next.js App Router application for Vercel. The master scope is in `HoloStack_AI_Desktop_Build_Brief.md`.

## Current scope

Milestones 1–5: foundation, real TiDB integration, email/password authentication, server-side sessions, private project persistence and version restoration, full architecture studio, explicit Gemini workbench, deterministic ScaleLab, evidence-based architecture review, saved scenarios, and Markdown reports. The workspace at `/` remains a clearly labeled public sample with seven authored templates and an editable XYFlow graph. HoloCanvas includes a 16-type palette, undo/redo, deterministic layout, bounded JSON import, and PNG/JSON export. Private projects autosave with revision checks. Authenticated project owners can request architecture generation, explanations, copilot patches, and optimization candidates; every candidate is schema-validated and reviewed before applying. AI remains fail-closed until a server key and both opt-in flags are configured. ScaleLab, reviews, reports, and sliders use local deterministic TypeScript and never call Gemini. `/api/health` is liveness only, not database readiness.

## Local development

Requirements: Node.js 22.18+ in the Node 22 release line, npm, and optionally a TiDB PostgreSQL-compatible Starter instance. The UI works without database credentials.

```powershell
npm ci
Copy-Item .env.example .env.local # only when .env.local does not already exist
npm run dev
```

Open http://localhost:3000. Do not overwrite an existing `.env.local`. Environment files, local probe reports, build output, and test artifacts are ignored by Git. Never paste secrets into chat, commit them, or put them in `NEXT_PUBLIC_*` variables.

## Database setup

1. In [TiDB Cloud](https://tidbcloud.com/), select **Create Resource → Starter → PostgreSQL Compatible → AWS us-east-1**. Suggested instance name: `holostack-ai-db`.
2. Open **Connect**, generate a password, and collect host, port, role, and database. The instance name is not the database name. A new instance may expose only the default `postgres` database; create the desired application database through the provider SQL console if absent. This project uses `holostackdb` locally.
3. Set `DATABASE_URL` privately in `.env.local`. Replace every placeholder and percent-encode special characters in credentials. `DATABASE_CA_CERT` optionally accepts a provider CA PEM; do not disable TLS validation.
4. Run `npm run db:check` for a read-only, certificate-verified `SELECT 1`.
5. Run `npm run db:verify` for isolated compatibility probes. These create randomly named scratch objects, use synthetic data, then remove only those objects. A failed cleanup names the scratch schema for manual inspection. No user tables are touched.
6. Review `.local/db-verification.json`; migrations must never run automatically at app startup, build time, or in a public API route. The first reviewed application migration is already applied to the `holostack` schema.
7. For a new database target or migration, run `npm run db:verify-schema` to test the exact checked-in DDL and a concurrent counter. Review `.local/schema-verification.json`, then run `npm run db:migrate` as a controlled operator action. The runner verifies target, freshness, and migration file hash.

Connection errors intentionally omit raw driver messages and credentials. SQLSTATE categories are retained when safe. The database pool is lazy, server-only, bounded to three connections per warm function instance, and configured with acquisition and query timeouts. Fleet-wide connection usage still needs load testing.

TiDB PostgreSQL Starter is a preview service without a production SLA. See `docs/DATABASE.md` for compatibility and recovery limits before accepting customer data.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright runs desktop and mobile viewport tests in installed Microsoft Edge on Windows and Chromium elsewhere. On Linux CI, install Chromium with `npx playwright install --with-deps chromium`. Override the browser channel with `PLAYWRIGHT_CHANNEL` if needed. Build before the E2E suite. Auth and project integration tests use randomly named `.invalid` email fixtures against TiDB and remove only those fixtures in global teardown; read `tests/e2e/cleanup.ts` before adapting or changing the prefix.

## Code map

- `src/app`: pages, layouts, boundaries, and Node.js route handlers.
- `src/components/studio`: HoloCanvas editing controls and component inspector.
- `src/components/ai`: consent-gated, quota-aware AI workbench and saved candidate review.
- `src/domain/ai`: strict AI request/response schemas, graph patch application, and deterministic diffs.
- `src/server/ai`: server-only Gemini provider, transactional quotas, usage records, and scoped chat/artifact persistence.
- `src/components/ui`: local shadcn-style primitives.
- `src/domain/architecture`: strict Zod graph schemas, bounded studio operations, and seven authored templates.
- `src/server/db`: server-only connection infrastructure and shared CLI configuration.
- `scripts`: credential-safe connection and isolated capability checks.
- `tests/unit`, `tests/e2e`: trust-boundary tests and browser flows.
- `docs`: milestone evidence, AI privacy/quota controls, architecture decisions, and deployment preparation.

See [AI integration and zero-budget controls](docs/AI_INTEGRATION.md) for local provider setup, Google AI Studio billing caveats, data-sharing consent, and the opt-in live smoke test.

## Deployment

No application deployment has been performed. See `docs/DEPLOYMENT.md`. The target is a single Vercel Next.js application near the database (`iad1`). Deployment requires the owner's approval and separately configured Vercel environment variables.
