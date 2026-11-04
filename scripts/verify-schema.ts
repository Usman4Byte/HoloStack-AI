import "./env";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { verifiedMigrationInputs } from "./migration-helpers";

async function main() {
  const input = await verifiedMigrationInputs();
  const schema = `holostack_schema_${randomUUID().replaceAll("-", "")}`;
  const folder = `.local/${schema}`;
  await mkdir(`${folder}/meta`, { recursive: true });
  await writeFile(`${folder}/meta/_journal.json`, input.journal);
  for (const file of input.files) await writeFile(`${folder}/${file.tag}.sql`, file.sql.replaceAll('"holostack"', `"${schema}"`).replace(`CREATE SCHEMA "${schema}";`, `CREATE SCHEMA IF NOT EXISTS "${schema}";`));
  const pool = new Pool(input.config);
  pool.on("error", () => {});
  let passed = false;
  try {
    const options = { migrationsFolder: folder, migrationsSchema: schema, migrationsTable: "migration_ledger" };
    await migrate(drizzle(pool), options);
    await migrate(drizzle(pool), options);
    const writes = await Promise.all(Array.from({ length: 8 }, () => pool.query(`INSERT INTO ${schema}.rate_limits (key,attempts,expires_at) VALUES ($1,1,$2) ON CONFLICT (key) DO UPDATE SET attempts=${schema}.rate_limits.attempts+1 RETURNING attempts`, ["concurrency-probe", new Date(Date.now() + 60000)])));
    if (new Set(writes.map(r => r.rows[0].attempts)).size !== 8) throw new Error("Atomic counter failed");
    if ((await pool.query(`SELECT attempts FROM ${schema}.rate_limits WHERE key=$1`, ["concurrency-probe"])).rows[0]?.attempts !== 8) throw new Error("Counter mismatch");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT attempts FROM ${schema}.rate_limits WHERE key=$1 FOR UPDATE`, ["concurrency-probe"]);
      await client.query("ROLLBACK");
    } finally { client.release(); }
    passed = true;
    console.log("PASS: application DDL, migration repeat-run, row-lock syntax, and eight concurrent atomic rate-limit increments.");
  } finally {
    try {
      for (const table of ["usage_events", "architecture_versions", "projects", "workspace_members", "sessions", "workspaces", "users", "rate_limits", "migration_ledger"]) await pool.query(`DROP TABLE IF EXISTS ${schema}.${table}`);
      await pool.query(`DROP SCHEMA IF EXISTS ${schema}`);
    } catch { passed = false; console.error(`Cleanup incomplete for generated schema ${schema}.`); }
    await pool.end();
    await writeFile(".local/schema-verification.json", JSON.stringify({ passed, checkedAt: new Date().toISOString(), targetFingerprint: input.fingerprint, migrationHash: input.migrationHash }, null, 2));
    if (!passed) process.exitCode = 1;
  }
}
main().catch(() => { console.error("Schema verification failed. Check configuration and baseline report; raw database errors withheld."); process.exitCode = 1; });
