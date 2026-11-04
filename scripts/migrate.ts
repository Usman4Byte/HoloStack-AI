import "./env";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { verifiedMigrationInputs } from "./migration-helpers";

async function main() {
  const input = await verifiedMigrationInputs();
  const report = JSON.parse(await readFile(".local/schema-verification.json", "utf8"));
  const age = Date.now() - Date.parse(report.checkedAt);
  if (!report.passed || report.targetFingerprint !== input.fingerprint || report.migrationHash !== input.migrationHash || !Number.isFinite(age) || age < 0 || age > 86400000) {
    throw new Error("Exact schema verification is required.");
  }
  const client = new Client(input.config);
  client.on("error", () => {});
  try {
    await client.connect();
    await client.query("SELECT 1");
    await migrate(drizzle(client), { migrationsFolder: "drizzle", migrationsSchema: "holostack_migrations", migrationsTable: "journal" });
    console.log("PASS: reviewed application migrations applied (already-applied migrations skipped).");
  } finally { await client.end().catch(() => {}); }
}
main().catch(() => {
  console.error("Migration stopped. Run db:check, db:verify, and db:verify-schema for this target and exact SQL. Raw errors withheld; do not blindly retry partial DDL.");
  process.exitCode = 1;
});
