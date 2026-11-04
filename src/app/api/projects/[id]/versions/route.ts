import { requireActor } from "@/server/auth/session";
import { projectVersions } from "@/server/projects/service";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(async () => json({ versions: await projectVersions(await requireActor(), (await ctx.params).id) }));
}
