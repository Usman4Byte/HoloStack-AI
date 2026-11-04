import { clientAddress } from "@/server/auth/rate-limit";
import { guestAIUsage } from "@/server/ai/guest-service";
import { publicAIStatus } from "@/server/ai/public";
import { api, json } from "@/server/http/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return api(async () => json(publicAIStatus(await guestAIUsage(clientAddress(request))))); }
