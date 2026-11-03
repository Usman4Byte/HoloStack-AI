# HoloStack AI project rules

- Read `HoloStack_AI_Desktop_Build_Brief.md` and `docs/MILESTONES.md` before continuing milestone work.
- Keep this one Next.js App Router application for Vercel. TiDB must use PostgreSQL compatibility, not MySQL.
- Never print or commit `.env.local`, credentials, raw DB errors, or sensitive prompt data. Do not read secret files into tool output. Server secrets must never reach client modules or `NEXT_PUBLIC_*` variables.
- Real database verification precedes application migrations. Isolated scratch probes may create/drop only their own randomly named objects. Never alter TiDB-managed metadata tables.
- No external deployment, GitHub push, destructive user-data migration, or irreversible operation without user authorization.
- Sample fixtures and assumptions must be explicit. Do not simulate sign-in, cloud saves, live AI, infrastructure telemetry, or completed roadmap modules.
- Use strict schemas, parameterized queries, tenant-scoped authorization, and conflict-aware writes. No persistent in-memory application state on the server.
- Update milestone evidence after real checks. Run appropriate type/lint/build and focused tests; report provider or environment limitations honestly.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
