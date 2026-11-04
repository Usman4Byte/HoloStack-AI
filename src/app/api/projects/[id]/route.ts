import { z } from "zod";
import { updateProjectSchema } from "@/domain/projects/schema";
import { requireActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { getProject, updateProject } from "@/server/projects/service";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, ctx: Context) {
  return api(async () => json({ project: await getProject(await requireActor(), (await ctx.params).id) }));
}
export async function PATCH(request: Request, ctx: Context) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("project-write", actor.id, 60, 60);
    const input = await readJson(request, updateProjectSchema, 512 * 1024);
    return json({ project: await updateProject(actor, (await ctx.params).id, input) });
  });
}
export async function DELETE(request: Request, ctx: Context) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("project-write", actor.id, 60, 60);
    const input = await readJson(request, z.object({ revision: z.number().int().positive().max(2147483646) }).strict());
    return json({ project: await updateProject(actor, (await ctx.params).id, { ...input, status: "deleted" }) });
  });
}
