import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { rateLimits } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { appOrigin } from "@/server/http/request";

export async function rateLimit(scope: string, subject: string, limit: number, windowSeconds: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "Authentication is not configured.");
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = createHmac("sha256", secret).update(`${scope}:${subject}:${window}`).digest("hex");
  const expiresAt = new Date((window + 1) * windowSeconds * 1000);
  const [row] = await getDb().insert(rateLimits).values({ key, attempts: 1, expiresAt })
    .onConflictDoUpdate({ target: rateLimits.key, set: { attempts: sql`${rateLimits.attempts} + 1` } }).returning({ attempts: rateLimits.attempts });
  if (row.attempts > limit) throw new ApiError(429, "Too many attempts. Please wait and try again.", "RATE_LIMITED", Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)));
}
export function clientAddress(request: Request) {
  // Vercel supplies this trusted header. Never accept arbitrary forwarded headers locally.
  return process.env.VERCEL === "1" ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim().slice(0,128) || "unknown") : `local:${appOrigin().origin}`;
}
