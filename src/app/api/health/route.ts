export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  // Public liveness only. No DB query, environment details, or readiness claims.
  return Response.json({ status: "ok", service: "holostack-ai" }, { headers: { "Cache-Control": "no-store" } });
}
