import { generateRequestSchema } from "@/domain/ai/schema";
import { requireActor, requireWriter } from "@/server/auth/session";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { generateArchitecture } from "@/server/ai/service";
import { ApiError } from "@/server/http/errors";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export const maxDuration = 35;
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(); requireWriter(actor);
    await rateLimit("ai-action", `${actor.id}:${clientAddress(request)}`, 3, 60);
    const input = await readJson(request, generateRequestSchema, 8192);
    if (input.requirements.length > 4000) throw new ApiError(413, "Keep architecture requirements under 4,000 characters.", "AI_INPUT_TOO_LONG");
    return json(await generateArchitecture(actor, input.projectId, input.requirements), 201);
  });
}
