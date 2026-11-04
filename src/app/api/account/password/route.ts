import { changePasswordSchema } from "@/domain/accounts/schema";
import { changePassword } from "@/server/auth/service";
import { clearSessionCookie, requireActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("password-change", actor.id, 5, 900);
    await changePassword(actor, await readJson(request, changePasswordSchema));
    await clearSessionCookie(); return json({ ok: true });
  });
}
