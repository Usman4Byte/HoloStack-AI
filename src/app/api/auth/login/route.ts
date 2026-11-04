import { signInSchema } from "@/domain/accounts/schema";
import { signIn } from "@/server/auth/service";
import { clientAddress, rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    await rateLimit("login-ip", clientAddress(request), 60, 900);
    const input = await readJson(request, signInSchema);
    await rateLimit("login-email", input.email, 10, 900);
    await signIn(input);
    return json({ ok: true });
  });
}
