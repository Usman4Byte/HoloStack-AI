import "./env";
import { readFile } from "node:fs/promises";
import { databaseConfig, databaseFingerprint, safeDatabaseError } from "../src/server/db/config";

async function main() {
  const fingerprint = databaseFingerprint(databaseConfig());
  let report;
  try { report = JSON.parse(await readFile(".local/db-verification.json", "utf8")); }
  catch { throw new Error("Run npm run db:check and npm run db:verify before planning migrations."); }
  const age = Date.now() - Date.parse(report.checkedAt);
  if (report.version !== 2 || !report.passed || report.targetFingerprint !== fingerprint || !Number.isFinite(age) || age < 0 || age > 86_400_000) {
    throw new Error("A successful compatibility report for this database from the last 24 hours is required.");
  }
  // Deliberate fail-closed checkpoint until the application schema is authored and reviewed.
  throw new Error("Baseline verified. Drizzle is compatible with the tested subset. Application migrations are not authored yet; implement and review the schema in Milestone 2.");
}
main().catch(error => {
  // Only the explicitly created checkpoint messages are safe; config errors are sanitized.
  const messages = ["Run npm run db:check", "A successful compatibility", "Baseline verified."];
  console.error(error instanceof Error && messages.some(prefix => error.message.startsWith(prefix)) ? error.message : safeDatabaseError(error));
  process.exitCode = 1;
});
