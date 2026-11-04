import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(), reserve: vi.fn(), fallback: vi.fn(), finish: vi.fn(), release: vi.fn(), save: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/projects/service", () => ({ getProject: vi.fn() }));
vi.mock("@/server/ai/provider", () => ({ generateStructured: mocks.generate }));
vi.mock("@/server/ai/quota", () => ({
  reserveAIAction: mocks.reserve, reserveAIFallback: mocks.fallback, finishAIAction: mocks.finish,
  releaseAIRequestLock: mocks.release, saveAIArtifact: mocks.save,
  recentAIMessages: vi.fn(), saveAIConversation: vi.fn(),
}));

import { generateArchitecture } from "@/server/ai/service";

const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
const actor = { id: "user", workspaceId: "workspace" } as Actor;
const request = () => generateArchitecture(actor, "project", "A synthetic design.");

describe("Gemini action failover", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.reserve.mockResolvedValue({ usageId: "first", models, requestLockKey: "lock", expiresAt: new Date(300_000) });
    mocks.fallback.mockImplementation(async (_actor, _project, _feature, model: string) => model);
  });

  it("hides a provider failure and saves only the successful fallback", async () => {
    mocks.generate.mockRejectedValueOnce(new ApiError(503, "Unavailable", "AI_PROVIDER_UNAVAILABLE"))
      .mockResolvedValueOnce({
        model: models[1], usage: { inputTokens: 20, outputTokens: 30 },
        data: {
          name: "Synthetic design", description: "Example service", requirements: "Example requirements",
          assumptions: [], tradeoffs: [], edges: [],
          nodes: [{ id: "api", type: "service", label: "API", description: "Serve requests", technology: "Node.js", trustBoundary: "private", notes: "" }],
        },
      });

    await expect(request()).resolves.toMatchObject({ model: models[1] });
    expect(mocks.generate.mock.calls.map(([options]) => options.model)).toEqual(models.slice(0, 2));
    expect(mocks.fallback).toHaveBeenCalledExactlyOnceWith(actor, "project", "generate", models[1]);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenNthCalledWith(1, { usageId: "first", status: "failed", errorCode: "AI_PROVIDER_UNAVAILABLE" });
    expect(mocks.finish).toHaveBeenNthCalledWith(2, { usageId: models[1], status: "succeeded", inputTokens: 20, outputTokens: 30 });
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith("lock", new Date(300_000));
  });

  it("tries every model once and then returns one safe error", async () => {
    mocks.generate.mockRejectedValue(new ApiError(429, "Provider quota", "AI_PROVIDER_QUOTA"));
    await expect(request()).rejects.toMatchObject({ code: "AI_ALL_MODELS_FAILED" });
    expect(mocks.generate.mock.calls.map(([options]) => options.model)).toEqual(models);
    expect(mocks.fallback).toHaveBeenCalledTimes(2);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("stops before calling a fallback that could not reserve quota", async () => {
    mocks.generate.mockRejectedValue(new ApiError(503, "Unavailable", "AI_PROVIDER_UNAVAILABLE"));
    mocks.fallback.mockRejectedValue(new ApiError(429, "Daily cap", "AI_DAILY_QUOTA"));
    await expect(request()).rejects.toMatchObject({ code: "AI_DAILY_QUOTA" });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
});
