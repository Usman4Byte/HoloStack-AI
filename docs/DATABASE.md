# TiDB verification and persistence decision

Verified on 2026-11-03 against the user's actual PostgreSQL-compatible TiDB Cloud Starter instance in `us-east-1`, using the `holostackdb` database. The empty application database was created after the default `postgres` database connected successfully. No application tables or application migrations have been installed.

## Evidence

`npm run db:check` passed a real `SELECT 1` through `pg` with certificate verification enabled. `npm run db:verify` passed all 13 checks and cleaned up its randomly named probe schema:

| Capability | Observed result |
| --- | --- |
| PostgreSQL wire protocol, pg driver, TLS | Connected, verified certificate, SELECT 1 |
| Schema and tables | Created isolated schema and conventional tables |
| UUID, text, integer, JSON, JSONB, timestamptz | Inserted and decoded correctly |
| Parameter binding / INSERT RETURNING | Bound values and returned rows correctly |
| JSONB path extraction | Correct value from nested document |
| B-tree index and catalog | Created index and found it in pg_indexes |
| Transactions | Commit persisted; rollback restored prior revision |
| Optimistic updates | Expected revision updated; stale revision affected zero rows |
| Unique constraint | Duplicate value rejected with SQLSTATE 23505 |
| Foreign-key constraint | Invalid reference rejected with SQLSTATE 23503 |
| Upsert and scoped join | ON CONFLICT and filtered join behaved as expected |
| Drizzle CRUD and mapping | Insert/select/join/update/delete returning, JSONB and dates passed |
| Drizzle transaction and migration machinery | Rollback passed; scratch CREATE/ALTER/index migration and ledger passed; repeat run skipped applied migration |

The full local evidence is `.local/db-verification.json`. It includes a target fingerprint, timestamp, cleanup result, and named checks, without credentials or host/role values. Scratch migration source is retained under ignored `.local/holostack_probe_*` folders for inspection. The check is evidence for the tested subset on this instance, not a blanket PostgreSQL-compatibility claim.

## Selected implementation

Use **Drizzle ORM with its node-postgres adapter**, over the server-only bounded `pg` pool. Use explicit, reviewed SQL migration files and the tested Drizzle migration ledger. Do not use automatic schema push or rely on unverified catalog introspection. Author the application schema in Milestone 2 and review its SQL before applying it. `npm run db:migrate` intentionally refuses to apply anything until this next step exists; it also checks report version, target identity, and freshness.

Use application-generated UUIDs, ordinary foreign keys, B-tree indexes, JSONB graph documents, and revision-conditional writes. Proposed workspace/auth/project schema is in `ARCHITECTURE.md`. Keep DDL under one controlled operator, not concurrent serverless requests.

## Constraints and unverified behavior

- True SERIALIZABLE isolation is not supported according to provider documentation. No application behavior may depend on it.
- Probe cleanup drops child tables before parent tables, without CASCADE, following the provider's foreign-key dependency caveat.
- pg query timeout limits client waiting; it is not proof of cancellation of server-side work. Add and verify server statement/lock timeouts for production operations.
- Concurrency races, row locks, transaction isolation under contention, DDL failure recovery, high-volume pagination, connection saturation, backup tooling, and production schema migrations remain untested.
- Do not assume extensions, triggers, vector operations, special index types, introspection tools, or pg_dump/pg_restore work merely because the basic probe passed.
- The report binds to host/port/database/role, not a password. Rotating a password does not change target identity. Re-run checks after provider changes or dependency upgrades.

## Backup and exit path

The provider documents automatic daily backups and restore into a new PostgreSQL-compatible instance. Before critical data, perform a real restore drill and verify retention and recovery objectives in the account. Cross-protocol restore into MySQL-compatible TiDB is not supported.

Keep migrations under source control. Add an authenticated operator export of tenant-scoped relational records plus validated graph JSON, using portable values and stable UUIDs. Test replay into standard managed PostgreSQL and verify row counts, relationship integrity, graph hashes, and user/session handling. Large binary objects remain in object storage. Test pg_dump/restore separately if selected; do not claim it has passed.

Do not accept paid or critical production workloads on the basis of this preview evaluation. Either confirm GA/SLA suitability and rehearse recovery or migrate to production PostgreSQL before launch.

## Sources checked

- [TiDB PostgreSQL quickstart](https://docs.pingcap.com/tidbcloud/pg-quickstart/)
- [TiDB PostgreSQL compatibility](https://docs.pingcap.com/tidbcloud/postgresql-compatibility/)
- [TiDB preview FAQ and backup limitations](https://docs.pingcap.com/tidbcloud/pg-faq/)
- [node-postgres TLS configuration caveat](https://node-postgres.com/features/ssl)
- [Drizzle node-postgres integration](https://orm.drizzle.team/docs/get-started-postgresql)

Official docs can change; actual instance verification is required for every new feature the app depends on.
