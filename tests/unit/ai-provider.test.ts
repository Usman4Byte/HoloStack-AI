import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assistantResultSchema, generatedArchitectureSchema } from "@/domain/ai/schema";

const sdk = vi.hoisted(() => ({ generate: vi.fn(), clientOptions: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  ApiError: class MockGoogleApiError extends Error { status: number; constructor(status: number) { super("provider-private-detail"); this.status = status; } },
  GoogleGenAI: class MockGoogleGenAI { models = { generateContent: sdk.generate }; constructor(options: unknown) { sdk.clientOptions = options; } },
}));

import { aiConfiguration, generateStructured, friendlyProviderError } from "@/server/ai/provider";

const content = {
  name: "Private assistant", description: "A tenant-aware service.", requirements: "Private assistant requirements.", assumptions: [], tradeoffs: [],
  nodes: [{ id: "api", type: "service", label: "API", description: "Authorize each request.", technology: "Next.js", trustBoundary: "private", notes: "No secrets in clients." }],
  edges: [],
};

describe("server Gemini provider boundary", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "unit-test-key-that-is-not-real");
    vi.stubEnv("GEMINI_ENABLED", "true");
    vi.stubEnv("GEMINI_FREE_TIER_CONFIRMED", "true");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GEMINI_LIGHT_MODEL", "gemini-2.5-flash-lite");
    sdk.generate.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires the key, explicit free-tier confirmation, and an allow-listed model", () => {
    expect(aiConfiguration().ready).toBe(true);
    vi.stubEnv("GEMINI_FREE_TIER_CONFIRMED", "false");
    expect(aiConfiguration().ready).toBe(false);
    vi.stubEnv("GEMINI_FREE_TIER_CONFIRMED", "true");
    vi.stubEnv("GEMINI_MODEL", "gemini-expensive-model");
    expect(aiConfiguration().ready).toBe(false);
  });

  it("defaults to current stable Flash models and routes a lightweight question to Flash-Lite", async () => {
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_LIGHT_MODEL", "");
    expect(aiConfiguration()).toMatchObject({ model: "gemini-3.8-flash", lightModel: "gemini-3.5-flash-lite", ready: true });
    sdk.generate.mockResolvedValue({ text: JSON.stringify({ answer: "A grounded answer.", changes: [], tradeoffs: [] }) });
    const result = await generateStructured({ prompt: "Explicit mocked question", schema: assistantResultSchema, feature: "copilot", maxOutputTokens: 300, lightweight: true });
    expect(result.model).toBe("gemini-3.5-flash-lite");
    expect(sdk.generate.mock.calls[0][0].model).toBe("gemini-3.5-flash-lite");
  });

  it("fails closed without making a Gemini request when live AI is disabled", async () => {
    vi.stubEnv("GEMINI_ENABLED", "false");
    await expect(generateStructured({ prompt: "No call", schema: generatedArchitectureSchema, feature: "generate", maxOutputTokens: 100 })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(sdk.generate).not.toHaveBeenCalled();
  });

  it("requests structured JSON with bounded tokens, timeout, and no SDK retries", async () => {
    sdk.generate.mockResolvedValue({ text: JSON.stringify(content), usageMetadata: { promptTokenCount: 81, candidatesTokenCount: 120 } });
    const result = await generateStructured({ prompt: "Explicit unit test action", schema: generatedArchitectureSchema, feature: "generate", maxOutputTokens: 50000 });
    expect(result.data.name).toBe("Private assistant");
    expect(result.usage).toEqual({ inputTokens: 81, outputTokens: 120 });
    const [request] = sdk.generate.mock.calls[0];
    expect(request.model).toBe("gemini-2.5-flash");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema.type).toBe("object");
    expect(request.config.maxOutputTokens).toBe(5000);
    expect((sdk.clientOptions as { httpOptions: { timeout: number; retryOptions: { attempts: number } } }).httpOptions).toEqual({ timeout: 25_000, retryOptions: { attempts: 1 } });
  });

  it("rejects malformed and schema-invalid model responses without repair calls", async () => {
    sdk.generate.mockResolvedValueOnce({ text: "not-json" }).mockResolvedValueOnce({ text: JSON.stringify({ ...content, nodes: [] }) });
    await expect(generateStructured({ prompt: "Explicit unit test action", schema: generatedArchitectureSchema, feature: "generate", maxOutputTokens: 100 })).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
    await expect(generateStructured({ prompt: "Explicit unit test action", schema: generatedArchitectureSchema, feature: "generate", maxOutputTokens: 100 })).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
    expect(sdk.generate).toHaveBeenCalledTimes(2);
  });

  it("maps provider quota errors to a safe message without exposing the raw error", () => {
    const mapped = friendlyProviderError({ status: 429, message: "provider-private-detail" });
    expect(mapped.message).toContain("quota or rate limit");
    expect(mapped.message).not.toContain("provider-private-detail");
    expect(mapped.status).toBe(429);
  });
});
