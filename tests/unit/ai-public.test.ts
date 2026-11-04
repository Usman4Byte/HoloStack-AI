import { describe, expect, it } from "vitest";
import { publicAIResult, publicAIStatus } from "@/server/ai/public";

describe("public AI response metadata", () => {
  it("keeps status useful without returning provider or model configuration", () => {
    const result = publicAIStatus({
      enabled: true,
      usage: { todayActions: 4 },
      configured: true,
      provider: "private-provider",
      models: ["private-model-a", "private-model-b"],
      message: "private setup detail",
    });

    expect(result).toEqual({ enabled: true, usage: { todayActions: 4 } });
    expect(JSON.stringify(result)).not.toMatch(/private-provider|private-model|private setup detail/);
  });

  it("removes model metadata from successful AI responses while retaining the product result", () => {
    const result = publicAIResult({ graph: { name: "Example" }, usage: { inputTokens: 3 }, model: "private-model-id" });

    expect(result).toEqual({ graph: { name: "Example" }, usage: { inputTokens: 3 } });
    expect(result).not.toHaveProperty("model");
  });
});
