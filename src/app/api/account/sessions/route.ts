import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { sessions } from "@/server/db/schema";
import { clearSessionCookie, requireActor } from "@/server/auth/session";
import { api, assertSameOrigin, json } from "@/server/http/request";
export const runtime = "nodejs";
export async function DELETE(request: Request) {
  return api(async () => {
    assertSameOrigin(request); const actor = await requireActor();
    await getDb().delete(sessions).where(eq(sessions.userId, actor.id));
    await clearSessionCookie(); return json({ ok: true });
  });
}
