import { clientAddress } from "@/server/auth/rate-limit";
import { guestAIUsage } from "@/server/ai/guest-service";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return api(async () => json(await guestAIUsage(clientAddress(request)))); }
