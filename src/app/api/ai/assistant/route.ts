import { assistantRequestSchema } from "@/domain/ai/schema";
import { chatWithArchitecture } from "@/server/ai/service";
import { requireActor, requireWriter } from "@/server/auth/session";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export const maxDuration = 35;
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(); requireWriter(actor);
    await rateLimit("ai-action", `${actor.id}:${clientAddress(request)}`, 3, 60);
    const input = await readJson(request, assistantRequestSchema, 256 * 1024);
    return json(await chatWithArchitecture(actor, input.projectId, input.graph, input.message, input.mode, input.goal));
  });
}
