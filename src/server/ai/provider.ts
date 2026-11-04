import "server-only";
import { ApiError as GoogleApiError, GoogleGenAI, type ThinkingLevel } from "@google/genai";
import { z, type ZodType } from "zod";
import { ApiError } from "@/server/http/errors";

export type AIModelFeature = "generate" | "copilot" | "optimize";
export type TokenUsage = { inputTokens: number | null; outputTokens: number | null };
export type StructuredRequest<T> = { prompt: string; schema: ZodType<T>; feature: AIModelFeature; maxOutputTokens: number; model?: string };
export type StructuredResponse<T> = { data: T; model: string; usage: TokenUsage };
export interface AIProvider {
  readonly id: string;
  generateStructured<T>(options: StructuredRequest<T>): Promise<StructuredResponse<T>>;
}

const verifiedModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
const allowedModels = new Set([...verifiedModels, "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]);

export function aiConfiguration() {
  const key = process.env.GEMINI_API_KEY?.trim() || "";
  const explicitlyEnabled = process.env.GEMINI_ENABLED === "true";
  const freeTierConfirmed = process.env.GEMINI_FREE_TIER_CONFIRMED === "true";
  const pool = process.env.GEMINI_MODELS;
  const legacyModels = [process.env.GEMINI_MODEL?.trim(), process.env.GEMINI_LIGHT_MODEL?.trim()].filter((id): id is string => Boolean(id));
  const candidates = pool === undefined ? (legacyModels.length ? legacyModels : verifiedModels) : pool.split(",").map(id => id.trim());
  const models = candidates.every(id => allowedModels.has(id)) ? [...new Set(candidates)] : [];
  return { ready: explicitlyEnabled && freeTierConfirmed && key.length >= 20 && models.length > 0, key, enabled: explicitlyEnabled, freeTierConfirmed, models };
}

export function aiStatus() {
  const config = aiConfiguration();
  return {
    configured: Boolean(config.key),
    enabled: config.ready,
    provider: "Google Gemini" as const,
    model: config.models[0] ?? null,
    models: config.models,
    message: config.ready ? null : !config.key ? "Add GEMINI_API_KEY in your local environment to enable live AI." : !config.enabled ? "Live AI is off. Enable it only after confirming the Google AI Studio project has no billing enabled." : !config.freeTierConfirmed ? "Confirm your Google AI Studio project is on the free tier and has no billing enabled." : "Choose an allow-listed free-tier Gemini model ID.",
  };
}

function statusOf(error: unknown) {
  if (error instanceof GoogleApiError) return error.status;
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return error.status;
  return 0;
}

function geminiResponseSchema(schema: ZodType) {
  const json = z.toJSONSchema(schema, {
    target: "draft-7",
    override: ({ jsonSchema }) => {
      delete jsonSchema.pattern;
      delete jsonSchema.minLength;
      delete jsonSchema.maxLength;
      delete jsonSchema.maxItems;
    },
  });
  delete json.$schema;
  return json;
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
  if (status === 408 || status >= 500 || status === 0) {
    const detail = Number.isInteger(status) && status >= 400 && status <= 599 ? `HTTP ${status}` : "no HTTP status";
    console.error(`Gemini request unavailable (${detail}).`);
    return new ApiError(503, "Gemini is temporarily unavailable. You can retry this action; the retry uses another AI action from your daily allowance.", "AI_PROVIDER_UNAVAILABLE");
  }
  const detail = Number.isInteger(status) && status >= 400 && status <= 599 ? `HTTP ${status}` : "unknown status";
  console.error(`Gemini request rejected (${detail}).`);
  return new ApiError(502, "Gemini could not complete this model attempt.", "AI_PROVIDER_FAILED");
}

class GeminiProvider implements AIProvider {
  readonly id = "google-gemini";
  async generateStructured<T>(options: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const config = aiConfiguration();
    if (!config.ready) throw new ApiError(503, aiStatus().message ?? "Live AI is not configured.", "AI_NOT_CONFIGURED");
    const model = options.model ?? config.models[0];
    if (!config.models.includes(model)) throw new ApiError(503, "The selected model is outside the configured Gemini pool.", "AI_NOT_CONFIGURED");
    const client = new GoogleGenAI({ apiKey: config.key, httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } });
    const isGemini3 = model.startsWith("gemini-3.");
    const thinkingLevel = (model.endsWith("-lite") ? "MINIMAL" : "LOW") as ThinkingLevel;
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: geminiResponseSchema(options.schema),
          maxOutputTokens: Math.min(5000, Math.max(100, options.maxOutputTokens)),
          temperature: 0.2,
          ...(isGemini3 || model === "gemini-3-flash-preview" ? { thinkingConfig: { thinkingLevel } } : {}),
        },
      });
    } catch (error) { throw friendlyProviderError(error); }
    const text = response.text;
    if (!text || text.length > 32_000) throw new ApiError(502, "Gemini returned an empty or oversized response.", "AI_INVALID_OUTPUT");
    let json: unknown;
    try { json = JSON.parse(text); }
    catch { throw new ApiError(502, "Gemini returned invalid structured output.", "AI_INVALID_OUTPUT"); }
    const result = options.schema.safeParse(json);
    if (!result.success) throw new ApiError(502, "Gemini’s response did not match the required architecture format.", "AI_INVALID_OUTPUT");
    return { data: result.data, model, usage: { inputTokens: response.usageMetadata?.promptTokenCount ?? null, outputTokens: response.usageMetadata?.candidatesTokenCount ?? null } };
  }
}

export function getAIProvider(): AIProvider { return new GeminiProvider(); }
export function generateStructured<T>(options: StructuredRequest<T>) { return getAIProvider().generateStructured(options); }
