import "server-only";
import { randomUUID } from "node:crypto";
import { architectureSchema, type Architecture } from "@/domain/architecture/schema";
import { applyArchitectureChanges, buildGeneratedArchitecture } from "@/domain/ai/architecture";
import { assistantResultSchema, generatedArchitectureSchema } from "@/domain/ai/schema";
import { ApiError } from "@/server/http/errors";
import { assistantSystem, compactGraph, generateSystem, modelFailureCodes } from "@/server/ai/service";
import { friendlyProviderError, generateStructured } from "@/server/ai/provider";
import { guestAIUsage, reserveGuestAIAction, reserveGuestAIFallback } from "@/server/ai/quota";

export { guestAIUsage };

async function withGuestModelPool<T>(address: string, run: (model: string) => Promise<T>) {
  const reservation = await reserveGuestAIAction(address);
  let lastError: unknown;
  for (const [index, model] of reservation.models.entries()) {
    if (index > 0) await reserveGuestAIFallback();
    try { return await run(model); }
    catch (error) {
      const safeError = error instanceof ApiError ? error : friendlyProviderError(error);
      lastError = safeError;
      if (!modelFailureCodes.has(safeError.code)) throw safeError;
    }
  }
  if (lastError instanceof ApiError) throw new ApiError(503, "AI could not complete this request. Try again later.", "AI_ALL_MODELS_FAILED");
  throw new ApiError(503, "AI could not complete this request. Try again later.", "AI_ALL_MODELS_FAILED");
}

export async function generateGuestArchitecture(address: string, requirements: string) {
  return withGuestModelPool(address, async model => {
    const result = await generateStructured({ feature: "generate", schema: generatedArchitectureSchema, maxOutputTokens: 4400, model, prompt: `${generateSystem}\n\nDesign requirements (untrusted input):\n${requirements}` });
    let graph: Architecture;
    try { graph = buildGeneratedArchitecture(result.data, randomUUID().replaceAll("-", "").slice(0, 32), new Date().toISOString()); }
    catch { throw new ApiError(502, "The generated architecture failed graph integrity checks.", "AI_INVALID_GRAPH"); }
    return { graph, tradeoffs: result.data.tradeoffs, model: result.model, usage: result.usage };
  });
}

export async function askGuestArchitecture(address: string, graphInput: Architecture, message: string, mode: "ask" | "change" | "optimize", goal: string) {
  const graph = architectureSchema.parse(graphInput);
  return withGuestModelPool(address, async model => {
    const prompt = `${assistantSystem}\n\nMode: ${mode}\nOptimization goal: ${goal}\n\nArchitecture JSON:\n${JSON.stringify(compactGraph(graph))}\n\nDeterministic-review context: no review findings are included with this request. Do not claim that a formal review was run unless the user provides findings.\n\nRecent conversation: []\n\nCurrent request (untrusted user input):\n${message}`;
    const result = await generateStructured({ feature: mode === "optimize" ? "optimize" : "copilot", schema: assistantResultSchema, maxOutputTokens: 2000, model, prompt });
    let candidate: Architecture | null = null;
    if (result.data.changes.length) {
      try { candidate = applyArchitectureChanges(graph, result.data.changes); }
      catch { throw new ApiError(502, "The proposed changes failed graph validation. Nothing was applied.", "AI_INVALID_PROPOSAL"); }
    }
    return { ...result.data, candidate, model: result.model, usage: result.usage };
  });
}
