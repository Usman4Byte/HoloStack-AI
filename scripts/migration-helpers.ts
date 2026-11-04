import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { databaseConfig, databaseFingerprint } from "../src/server/db/config";
export async function verifiedMigrationInputs() {
  const config = databaseConfig();
  const baseline = JSON.parse(await readFile(".local/db-verification.json", "utf8"));
  const age = Date.now() - Date.parse(baseline.checkedAt);
  if (baseline.version !== 2 || !baseline.passed || baseline.targetFingerprint !== databaseFingerprint(config) || !Number.isFinite(age) || age < 0 || age > 86400000) throw new Error("Compatibility report missing, stale, or for another database.");
  const journal = await readFile("drizzle/meta/_journal.json", "utf8");
  const entries = JSON.parse(journal).entries as { tag: string }[];
  const files = await Promise.all(entries.map(async ({ tag }) => {
    if (!/^[a-z0-9_]+$/.test(tag)) throw new Error("Invalid migration name");
    return { tag, sql: await readFile(`drizzle/${tag}.sql`, "utf8") };
  }));
  const migrationHash = createHash("sha256").update(journal + files.map(f => f.sql).join("\n")).digest("hex");
  return { config, journal, files, migrationHash, fingerprint: databaseFingerprint(config) };
}
