import "server-only";
import { ApiError as GoogleApiError, GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";
import { ApiError } from "@/server/http/errors";

export type AIModelFeature = "generate" | "copilot" | "optimize";
export type TokenUsage = { inputTokens: number | null; outputTokens: number | null };
export type StructuredRequest<T> = { prompt: string; schema: ZodType<T>; feature: AIModelFeature; maxOutputTokens: number; lightweight?: boolean };
export type StructuredResponse<T> = { data: T; model: string; usage: TokenUsage };
export interface AIProvider {
  readonly id: string;
  generateStructured<T>(options: StructuredRequest<T>): Promise<StructuredResponse<T>>;
}

export function aiConfiguration() {
  const key = process.env.GEMINI_API_KEY?.trim() || "";
  const explicitlyEnabled = process.env.GEMINI_ENABLED === "true";
  const freeTierConfirmed = process.env.GEMINI_FREE_TIER_CONFIRMED === "true";
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const lightModel = process.env.GEMINI_LIGHT_MODEL?.trim() || "gemini-2.5-flash-lite";
  const freeModels = new Set(["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
  const modelId = freeModels.has(model) ? model : "";
  const lightModelId = freeModels.has(lightModel) ? lightModel : "";
  return { ready: explicitlyEnabled && freeTierConfirmed && key.length >= 20 && Boolean(modelId && lightModelId), key, enabled: explicitlyEnabled, freeTierConfirmed, model: modelId, lightModel: lightModelId };
}

export function aiStatus() {
  const config = aiConfiguration();
  return {
    configured: Boolean(config.key),
    enabled: config.ready,
    provider: "Google Gemini" as const,
    model: config.model || null,
    message: config.ready ? null : !config.key ? "Add GEMINI_API_KEY in your local environment to enable live AI." : !config.enabled ? "Live AI is off. Enable it only after confirming the Google AI Studio project has no billing enabled." : !config.freeTierConfirmed ? "Confirm your Google AI Studio project is on the free tier and has no billing enabled." : "Choose an allow-listed free-tier Gemini model ID.",
  };
}

function statusOf(error: unknown) {
  if (error instanceof GoogleApiError) return error.status;
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return error.status;
  return 0;
}

export function friendlyProviderError(error: unknown): ApiError {
  const status = statusOf(error);
  // Keep diagnostics to a sanitized category/status only; SDK errors may include request details.
  if (status === 429) return new ApiError(429, "Gemini’s free-tier quota or rate limit was reached. Try again after the provider resets it.", "AI_PROVIDER_QUOTA");
  if (status === 401 || status === 403) {
    console.error("Gemini authentication rejected; credentials withheld.");
    return new ApiError(503, "Gemini rejected the server configuration. Check the key and model access locally.", "AI_CONFIGURATION");
  }
  if (status === 404) return new ApiError(503, "The configured Gemini model is unavailable to this project. Check AI Studio model access.", "AI_MODEL_UNAVAILABLE");
  if (status === 408 || status === 503 || status >= 500 || status === 0) return new ApiError(503, "Gemini is temporarily unavailable. You can retry this action; the retry uses another AI action from your daily allowance.", "AI_PROVIDER_UNAVAILABLE");
  return new ApiError(502, "Gemini could not complete this request. No automatic retry was made.", "AI_PROVIDER_FAILED");
}

class GeminiProvider implements AIProvider {
  readonly id = "google-gemini";
  async generateStructured<T>(options: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const config = aiConfiguration();
    if (!config.ready) throw new ApiError(503, aiStatus().message ?? "Live AI is not configured.", "AI_NOT_CONFIGURED");
    const model = options.lightweight ? config.lightModel : config.model;
    const client = new GoogleGenAI({ apiKey: config.key, httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } });
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(options.schema, { target: "draft-7" }),
          maxOutputTokens: Math.min(5000, Math.max(100, options.maxOutputTokens)),
          temperature: 0.2,
        },
      });
    } catch (error) { throw friendlyProviderError(error); }
    const text = response.text;
    if (!text || text.length > 32_000) throw new ApiError(502, "Gemini returned an empty or oversized response. No automatic repair request was sent.", "AI_INVALID_OUTPUT");
    let json: unknown;
    try { json = JSON.parse(text); }
    catch { throw new ApiError(502, "Gemini returned invalid structured output. No automatic repair request was sent.", "AI_INVALID_OUTPUT"); }
    const result = options.schema.safeParse(json);
    if (!result.success) throw new ApiError(502, "Gemini’s response did not match the required architecture format. No automatic repair request was sent.", "AI_INVALID_OUTPUT");
    return { data: result.data, model, usage: { inputTokens: response.usageMetadata?.promptTokenCount ?? null, outputTokens: response.usageMetadata?.candidatesTokenCount ?? null } };
  }
}

export function getAIProvider(): AIProvider { return new GeminiProvider(); }
export function generateStructured<T>(options: StructuredRequest<T>) { return getAIProvider().generateStructured(options); }
