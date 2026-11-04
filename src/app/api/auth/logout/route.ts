import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { sessions } from "@/server/db/schema";
import { clearSessionCookie, currentTokenHash } from "@/server/auth/session";
import { api, assertSameOrigin, json } from "@/server/http/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const hash = await currentTokenHash();
    if (hash) await getDb().delete(sessions).where(eq(sessions.tokenHash, hash));
    await clearSessionCookie();
    return json({ ok: true });
  });
}
