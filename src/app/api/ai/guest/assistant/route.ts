import { assistantRequestSchema } from "@/domain/ai/schema";
import { askGuestArchitecture } from "@/server/ai/guest-service";
import { publicAIResult } from "@/server/ai/public";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const address = clientAddress(request);
    await rateLimit("guest-ai-action", address, 2, 60);
    const input = await readJson(request, assistantRequestSchema, 256 * 1024);
    return json(publicAIResult(await askGuestArchitecture(address, input.graph, input.message, input.mode, input.goal)));
  });
}
