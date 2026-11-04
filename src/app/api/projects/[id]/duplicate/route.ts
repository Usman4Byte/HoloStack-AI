import { z } from "zod";
import { requireActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { duplicateProject } from "@/server/projects/service";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("project-write", actor.id, 60, 60);
    await readJson(request, z.object({}).strict());
    return json({ project: await duplicateProject(actor, (await ctx.params).id) }, 201);
  });
}
