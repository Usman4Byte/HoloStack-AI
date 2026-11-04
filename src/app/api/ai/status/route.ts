import { requireActor } from "@/server/auth/session";
import { aiUsage } from "@/server/ai/quota";
import { publicAIStatus } from "@/server/ai/public";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() { return api(async () => json(publicAIStatus(await aiUsage(await requireActor())))); }
