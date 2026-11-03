import "./env";
import { Client } from "pg";
import { databaseConfig, safeDatabaseError } from "../src/server/db/config";

async function main() {
  const client = new Client(databaseConfig());
  client.on("error", () => {});
  try {
    await client.connect();
    const result = await client.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected result");
    console.log("PASS: pg connected using certificate-verified TLS; SELECT 1 returned 1.");
    console.log("No schema changes made. Next: npm run db:verify.");
  } finally { await client.end().catch(() => {}); }
}
main().catch(error => { console.error(safeDatabaseError(error)); process.exitCode = 1; });
