import { eq } from "drizzle-orm";
import { profileSchema } from "@/domain/accounts/schema";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { publicActor, requireActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { api, assertSameOrigin, json, readJson } from "@/server/http/request";
export const runtime = "nodejs";
export async function GET() { return api(async () => json({ user: publicActor(await requireActor()) })); }
export async function PATCH(request: Request) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await rateLimit("profile", actor.id, 20, 60);
    const input = await readJson(request, profileSchema);
    await getDb().update(users).set({ name: input.name }).where(eq(users.id, actor.id));
    return json({ ok: true });
  });
}
