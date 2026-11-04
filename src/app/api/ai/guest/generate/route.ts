import { generateRequestSchema } from "@/domain/ai/schema";
import { generateGuestArchitecture } from "@/server/ai/guest-service";
import { publicAIResult } from "@/server/ai/public";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { ApiError } from "@/server/http/errors";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const address = clientAddress(request);
    await rateLimit("guest-ai-action", address, 2, 60);
    const input = await readJson(request, generateRequestSchema, 8192);
    if (input.requirements.length > 4000) throw new ApiError(413, "Keep architecture requirements under 4,000 characters.", "AI_INPUT_TOO_LONG");
    return json(publicAIResult(await generateGuestArchitecture(address, input.requirements)), 201);
  });
}
