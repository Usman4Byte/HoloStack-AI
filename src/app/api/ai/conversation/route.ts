import { projectIdSchema } from "@/domain/projects/schema";
import { recentAIMessages } from "@/server/ai/quota";
import { requireActor } from "@/server/auth/session";
import { getProject } from "@/server/projects/service";
import { ApiError } from "@/server/http/errors";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () => {
    const actor = await requireActor();
    const parsed = projectIdSchema.safeParse(new URL(request.url).searchParams.get("projectId"));
    if (!parsed.success) throw new ApiError(400, "Choose a valid project.", "INVALID_PROJECT");
    await getProject(actor, parsed.data);
    return json({ messages: await recentAIMessages(actor, parsed.data) });
  });
}
