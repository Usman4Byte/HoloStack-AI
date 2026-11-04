import "server-only";
import { getDatabase } from "@/server/db/pool";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
type ReadinessState = "ready" | "unavailable";

function failure(error: unknown, checks: { database: ReadinessState; applicationSchema: ReadinessState }) {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : "UNCLASSIFIED";
  console.error(`Readiness probe failed (${code}); details withheld.`);
  return Response.json({ status: "not_ready", checks }, { status: 503, headers });
}

export async function GET() {
  const checks: { database: ReadinessState; applicationSchema: ReadinessState } = {
    database: "unavailable",
    applicationSchema: "unavailable",
  };
  let db: ReturnType<typeof getDatabase>;
  try {
    db = getDatabase();
    const result = await db.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected readiness result.");
    checks.database = "ready";
  } catch (error) {
    return failure(error, checks);
  }

  try {
    await db.query("SELECT 1 FROM holostack.projects LIMIT 0");
    await db.query("SELECT 1 FROM holostack.intelligence_runs LIMIT 0");
    checks.applicationSchema = "ready";
    return Response.json({ status: "ready", checks: { database: "ready", applicationSchema: "ready" } }, { headers });
  } catch (error) {
    return failure(error, checks);
  }
}
