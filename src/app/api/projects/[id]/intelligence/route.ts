import { scenarioSaveSchema } from "@/domain/intelligence/schema";
import { requireActor, requireWriter } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { listIntelligenceRuns, saveIntelligenceRun } from "@/server/intelligence/service";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, ctx: Context) {
  return api(async () => json({ runs: await listIntelligenceRuns(await requireActor(), (await ctx.params).id) }));
}
export async function POST(request: Request, ctx: Context) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(); requireWriter(actor);
    await rateLimit("project-write", actor.id, 60, 60);
    const input = await readJson(request, scenarioSaveSchema);
    return json({ run: await saveIntelligenceRun(actor, (await ctx.params).id, input) }, 201);
  });
}
