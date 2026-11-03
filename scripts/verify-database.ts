import "./env";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pgSchema, uuid, text, integer, jsonb, json, timestamp } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { databaseConfig, databaseFingerprint, safeDatabaseError } from "../src/server/db/config";

async function main() {
  const config = databaseConfig();
  const client = new Client(config);
  client.on("error", () => {});
  const schema = `holostack_probe_${randomUUID().replaceAll("-", "")}`;
  const parent = `${schema}.parents`;
  const child = `${schema}.records`;
  const results: { feature: string; passed: boolean; detail?: string }[] = [];
  let created = false;
  let connected = false;
  let clean = false;
  const check = async (feature: string, run: () => Promise<void>) => {
    try { await run(); results.push({ feature, passed: true }); console.log(`PASS: ${feature}`); }
    catch (error) {
      results.push({ feature, passed: false, detail: safeDatabaseError(error) });
      console.error(`FAIL: ${feature}. ${safeDatabaseError(error)}`);
      throw error;
    }
  };
  const expect = (condition: boolean) => { if (!condition) throw new Error("Probe assertion failed"); };
  try {
    await check("pg + verified TLS + SELECT 1", async () => {
      await client.connect(); connected = true;
      expect((await client.query("SELECT 1 AS ok")).rows[0]?.ok === 1);
    });
    await check("isolated schema creation", async () => {
      await client.query(`CREATE SCHEMA ${schema}`); created = true;
    });
    await check("tables, UUID, JSON, JSONB, timestamptz, primary and foreign keys", async () => {
      await client.query(`CREATE TABLE ${parent} (id uuid PRIMARY KEY, name text NOT NULL UNIQUE)`);
      await client.query(`CREATE TABLE ${child} (id uuid PRIMARY KEY, parent_id uuid NOT NULL REFERENCES ${parent}(id), graph jsonb NOT NULL, metadata json NOT NULL, revision integer NOT NULL, created_at timestamptz NOT NULL)`);
    });
    const owner = randomUUID();
    const id = randomUUID();
    await check("parameter binding, INSERT RETURNING, JSON round-trip", async () => {
      await client.query(`INSERT INTO ${parent} (id, name) VALUES ($1, $2)`, [owner, "probe ' bound value"]);
      const row = (await client.query(`INSERT INTO ${child} (id, parent_id, graph, metadata, revision, created_at) VALUES ($1,$2,$3::jsonb,$4::json,$5,$6) RETURNING id, graph, metadata, created_at`, [id, owner, JSON.stringify({ nodes: [{ id: "api" }], enabled: true }), JSON.stringify({ source: "probe" }), 1, new Date()])).rows[0];
      expect(row?.id === id && row.graph.nodes[0].id === "api" && row.metadata.source === "probe" && row.created_at instanceof Date);
      expect((await client.query(`SELECT graph->'nodes'->0->>'id' AS node FROM ${child} WHERE id=$1`, [id])).rows[0]?.node === "api");
    });
    await check("B-tree index and index catalog visibility", async () => {
      await client.query(`CREATE INDEX records_parent_idx ON ${child} (parent_id)`);
      const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname=$1 AND indexname=$2", [schema, "records_parent_idx"]);
      expect(indexes.rowCount === 1);
    });
    await check("transaction rollback", async () => {
      await client.query("BEGIN");
      await client.query(`UPDATE ${child} SET revision=2 WHERE id=$1`, [id]);
      await client.query("ROLLBACK");
      expect((await client.query(`SELECT revision FROM ${child} WHERE id=$1`, [id])).rows[0]?.revision === 1);
    });
    await check("transaction commit and conflict-aware UPDATE RETURNING", async () => {
      await client.query("BEGIN");
      const update = await client.query(`UPDATE ${child} SET revision=revision+1 WHERE id=$1 AND revision=$2 RETURNING revision`, [id, 1]);
      expect(update.rows[0]?.revision === 2);
      await client.query("COMMIT");
      expect((await client.query(`SELECT revision FROM ${child} WHERE id=$1`, [id])).rows[0]?.revision === 2);
      expect((await client.query(`UPDATE ${child} SET revision=revision+1 WHERE id=$1 AND revision=$2 RETURNING revision`, [id, 1])).rowCount === 0);
    });
    await check("unique constraint enforcement", async () => {
      let rejected = false;
      try { await client.query(`INSERT INTO ${parent} (id, name) VALUES ($1,$2)`, [randomUUID(), "probe ' bound value"]); }
      catch (error) { rejected = (error as { code?: string }).code === "23505"; }
      expect(rejected);
    });
    await check("foreign-key enforcement", async () => {
      let rejected = false;
      try { await client.query(`UPDATE ${child} SET parent_id=$1 WHERE id=$2`, [randomUUID(), id]); }
      catch (error) { rejected = (error as { code?: string }).code === "23503"; }
      expect(rejected);
    });
    await check("ON CONFLICT and tenant-scoped join", async () => {
      await client.query(`INSERT INTO ${parent} (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`, [owner, "updated"]);
      expect((await client.query(`SELECT r.id FROM ${child} r JOIN ${parent} p ON r.parent_id=p.id WHERE p.id=$1 AND p.name=$2`, [owner, "updated"])).rowCount === 1);
      expect((await client.query(`SELECT id FROM ${child} WHERE parent_id=$1`, [randomUUID()])).rowCount === 0);
    });
    const db = drizzle(client);
    const probeSchema = pgSchema(schema);
    const parents = probeSchema.table("parents", { id: uuid("id").primaryKey(), name: text("name").notNull() });
    const records = probeSchema.table("records", {
      id: uuid("id").primaryKey(), parentId: uuid("parent_id").notNull(),
      graph: jsonb("graph").$type<{ nodes: { id: string }[] }>().notNull(),
      metadata: json("metadata").$type<{ source: string }>().notNull(), revision: integer("revision").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    });
    const ormId = randomUUID();
    await check("Drizzle parameterized CRUD, JSONB and date mapping", async () => {
      const rows = await db.insert(records).values({ id: ormId, parentId: owner, graph: { nodes: [{ id: "orm" }] }, metadata: { source: "drizzle" }, revision: 1, createdAt: new Date() }).returning();
      expect(rows[0]?.graph.nodes[0].id === "orm" && rows[0].createdAt instanceof Date);
      const joined = await db.select({ id: records.id }).from(records).innerJoin(parents, eq(records.parentId, parents.id)).where(eq(records.id, ormId));
      expect(joined.length === 1);
      const updated = await db.update(records).set({ revision: 2 }).where(eq(records.id, ormId)).returning();
      expect(updated[0]?.revision === 2);
    });
    await check("Drizzle transaction rollback and delete returning", async () => {
      const rollback = new Error("intentional probe rollback");
      try { await db.transaction(async tx => { await tx.update(records).set({ revision: 3 }).where(eq(records.id, ormId)); throw rollback; }); }
      catch (error) { if (error !== rollback) throw error; }
      const rows = await db.select().from(records).where(eq(records.id, ormId));
      expect(rows[0]?.revision === 2);
      expect((await db.delete(records).where(eq(records.id, ormId)).returning()).length === 1);
    });
    await check("Drizzle scratch migration, ledger and repeat-run idempotency", async () => {
      // Exercises migration machinery only after SQL features pass. Not an application migration.
      const folder = `.local/${schema}`;
      await mkdir(`${folder}/meta`, { recursive: true });
      await writeFile(`${folder}/meta/_journal.json`, JSON.stringify({ version: "7", dialect: "postgresql", entries: [{ idx: 0, version: "7", when: 1, tag: "0000_probe", breakpoints: true }] }));
      await writeFile(`${folder}/0000_probe.sql`, `CREATE TABLE ${schema}.migration_probe (id integer PRIMARY KEY);\n--> statement-breakpoint\nALTER TABLE ${schema}.migration_probe ADD COLUMN note text;\n--> statement-breakpoint\nCREATE INDEX migration_note_idx ON ${schema}.migration_probe(note);`);
      const options = { migrationsFolder: folder, migrationsSchema: schema, migrationsTable: "migration_ledger" };
      await migrate(db, options);
      await migrate(db, options);
      expect((await client.query(`SELECT hash FROM ${schema}.migration_ledger`)).rowCount === 1);
      await client.query(`INSERT INTO ${schema}.migration_probe (id,note) VALUES ($1,$2)`, [1, "verified"]);
      expect((await client.query(`SELECT note FROM ${schema}.migration_probe WHERE id=$1`, [1])).rows[0]?.note === "verified");
    });
  } catch { process.exitCode = 1; }
  finally {
    if (connected) {
      // Only randomly named objects created by this run. No CASCADE or user tables.
      try {
        await client.query("ROLLBACK");
        if (created) {
          await client.query(`DROP TABLE IF EXISTS ${schema}.migration_probe`);
          await client.query(`DROP TABLE IF EXISTS ${schema}.migration_ledger`);
          await client.query(`DROP TABLE IF EXISTS ${child}`);
          await client.query(`DROP TABLE IF EXISTS ${parent}`);
          await client.query(`DROP SCHEMA ${schema}`);
        }
        clean = true;
      } catch {
        console.error(`Probe cleanup failed. Inspect only the generated schema: ${schema}`);
        process.exitCode = 1;
      }
    }
    await client.end().catch(() => {});
    await mkdir(".local", { recursive: true });
    const passed = clean && results.length === 13 && results.every(result => result.passed);
    await writeFile(".local/db-verification.json", JSON.stringify({
      version: 2, targetFingerprint: databaseFingerprint(config), checkedAt: new Date().toISOString(),
      passed, cleanupPassed: clean, results,
      orm: passed ? "Drizzle node-postgres CRUD, transaction rollback, SQL migrations and repeat-run ledger validated in scratch schema. Application schema still requires review." : "Not approved: required compatibility probes failed.",
    }, null, 2));
    if (!passed) process.exitCode = 1;
    console.log(passed ? "Compatibility baseline passed. Review the report before designing application migrations." : "Compatibility unverified or failed. Application migrations remain blocked.");
    console.log("Secret-free report: .local/db-verification.json");
  }
}
main().catch(error => { console.error(safeDatabaseError(error)); process.exitCode = 1; });
