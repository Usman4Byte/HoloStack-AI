import "./env";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { integer, pgSchema, text, timestamp } from "drizzle-orm/pg-core";
import { verifiedMigrationInputs } from "./migration-helpers";
import { safeDatabaseError } from "../src/server/db/config";

async function main() {
  const input = await verifiedMigrationInputs();
  const schema = `holostack_schema_${randomUUID().replaceAll("-", "")}`;
  const folder = `.local/${schema}`;
  await mkdir(`${folder}/meta`, { recursive: true });
  await writeFile(`${folder}/meta/_journal.json`, input.journal);
  for (const file of input.files) await writeFile(`${folder}/${file.tag}.sql`, file.sql.replaceAll('"holostack"', `"${schema}"`).replace(`CREATE SCHEMA "${schema}";`, `CREATE SCHEMA IF NOT EXISTS "${schema}";`));
  const pool = new Pool(input.config);
  pool.on("error", () => {});
  const db = drizzle(pool);
  let passed = false;
  try {
    const options = { migrationsFolder: folder, migrationsSchema: schema, migrationsTable: "migration_ledger" };
    await migrate(db, options);
    await migrate(db, options);
    const writes = await Promise.all(Array.from({ length: 8 }, () => pool.query(`INSERT INTO ${schema}.rate_limits (key,attempts,expires_at) VALUES ($1,1,$2) ON CONFLICT (key) DO UPDATE SET attempts=${schema}.rate_limits.attempts+1 RETURNING attempts`, ["concurrency-probe", new Date(Date.now() + 60000)])));
    if (new Set(writes.map(r => r.rows[0].attempts)).size !== 8) throw new Error("Atomic counter failed");
    if ((await pool.query(`SELECT attempts FROM ${schema}.rate_limits WHERE key=$1`, ["concurrency-probe"])).rows[0]?.attempts !== 8) throw new Error("Counter mismatch");
    const quotaSchema = pgSchema(schema);
    const quotaCounters = quotaSchema.table("ai_quota_counters", { key: text("quota_key").primaryKey(), day: text("day_key").notNull(), used: integer("used").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull() });
    const quotaKeys = ["global:quota-probe", "user:quota-probe"];
    let reservations: boolean[];
    try {
      reservations = await Promise.all(Array.from({ length: 8 }, () => db.transaction(async tx => {
        await tx.insert(quotaCounters).values(quotaKeys.map(key => ({ key, day: "quota-probe", used: 0, createdAt: new Date() }))).onConflictDoNothing();
        const rows = await tx.select().from(quotaCounters).where(inArray(quotaCounters.key, quotaKeys)).orderBy(asc(quotaCounters.key)).for("update");
        const global = rows.find(row => row.key === quotaKeys[0]), user = rows.find(row => row.key === quotaKeys[1]);
        if (!global || !user || user.used >= 3 || global.used >= 30) return false;
        for (const row of rows) await tx.update(quotaCounters).set({ used: sql`${quotaCounters.used} + 1` }).where(eq(quotaCounters.key, row.key));
        return true;
      })));
    } catch (error) {
      const category = error instanceof Error ? error.name : "UnknownError";
      const localIdentifier = error instanceof ReferenceError ? error.message.match(/^([A-Za-z_$][\w$]*) is not defined$/)?.[1] : undefined;
      console.error(`FAIL: AI quota reservation transaction (${category}${localIdentifier ? `: ${localIdentifier}` : ""}). ${safeDatabaseError(error)}`);
      throw error;
    }
    if (reservations.filter(Boolean).length !== 3 || (await pool.query(`SELECT used FROM ${schema}.ai_quota_counters WHERE quota_key=$1`, [quotaKeys[1]])).rows[0]?.used !== 3) throw new Error("Concurrent AI daily quota cap failed");
    const requestLocks = quotaSchema.table("rate_limits", { key: text("key").primaryKey(), attempts: integer("attempts").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull() });
    const duplicateLocks = await Promise.all(Array.from({ length: 8 }, () => db.transaction(async tx => {
      const [lock] = await tx.insert(requestLocks).values({ key: "same-ai-request-probe", attempts: 1, expiresAt: new Date(Date.now() + 60000) }).onConflictDoNothing().returning({ key: requestLocks.key });
      if (lock) return true;
      const [existing] = await tx.select().from(requestLocks).where(eq(requestLocks.key, "same-ai-request-probe")).for("update");
      return !existing || existing.expiresAt <= new Date();
    })));
    if (duplicateLocks.filter(Boolean).length !== 1) throw new Error("Concurrent identical AI request lock failed");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT attempts FROM ${schema}.rate_limits WHERE key=$1 FOR UPDATE`, ["concurrency-probe"]);
      await client.query("ROLLBACK");
    } finally { client.release(); }
    passed = true;
    console.log("PASS: application DDL, migration repeat-run, row-lock syntax, eight atomic rate-limit increments, exactly three concurrent user-quota reservations, and one winner for eight identical in-flight requests.");
  } finally {
    try {
      for (const table of ["ai_messages", "ai_artifacts", "ai_usage_records", "ai_quota_counters", "usage_events", "architecture_versions", "projects", "workspace_members", "sessions", "workspaces", "users", "rate_limits", "migration_ledger"]) await pool.query(`DROP TABLE IF EXISTS ${schema}.${table}`);
      await pool.query(`DROP SCHEMA IF EXISTS ${schema}`);
    } catch { passed = false; console.error(`Cleanup incomplete for generated schema ${schema}.`); }
    await pool.end();
    await writeFile(".local/schema-verification.json", JSON.stringify({ passed, checkedAt: new Date().toISOString(), targetFingerprint: input.fingerprint, migrationHash: input.migrationHash }, null, 2));
    if (!passed) process.exitCode = 1;
  }
}
main().catch(() => { console.error("Schema verification failed. Check configuration and baseline report; raw database errors withheld."); process.exitCode = 1; });
