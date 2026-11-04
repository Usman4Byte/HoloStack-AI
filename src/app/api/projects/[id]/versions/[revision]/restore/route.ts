import { z } from "zod";
import { requireActor, requireWriter } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { restoreProjectVersion } from "@/server/projects/service";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
const bodySchema = z.object({ expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
export async function POST(request: Request, ctx: { params: Promise<{ id: string; revision: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(); requireWriter(actor);
    await rateLimit("project-write", actor.id, 60, 60);
    const { id, revision } = await ctx.params;
    const targetRevision = z.coerce.number().int().min(1).max(2147483646).safeParse(revision);
    if (!targetRevision.success) return json({ error: "Choose a valid architecture version.", code: "INVALID_REVISION" }, 400);
    const input = await readJson(request, bodySchema);
    return json({ project: await restoreProjectVersion(actor, id, targetRevision.data, input.expectedRevision) });
  });
}
