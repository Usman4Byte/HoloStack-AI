import { z } from "zod";
import { compareProjectVersion } from "@/server/projects/service";
import { requireActor } from "@/server/auth/session";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const revision = z.coerce.number().int().min(1).max(2147483647).safeParse(new URL(request.url).searchParams.get("revision"));
    if (!revision.success) return json({ error: "Choose a valid architecture version.", code: "INVALID_REVISION" }, 400);
    return json({ comparison: await compareProjectVersion(await requireActor(), (await ctx.params).id, revision.data) });
  });
}
