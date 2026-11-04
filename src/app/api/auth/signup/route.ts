import { signUpSchema } from "@/domain/accounts/schema";
import { signUp } from "@/server/auth/service";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    await rateLimit("signup-ip", clientAddress(request), 10, 3600);
    const input = await readJson(request, signUpSchema);
    await rateLimit("signup-email", input.email, 3, 3600);
    await signUp(input);
    return json({ ok: true }, 201);
  });
}
