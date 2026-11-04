import { requireActor } from "@/server/auth/session";
import { aiUsage } from "@/server/ai/quota";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() { return api(async () => json(await aiUsage(await requireActor()))); }
