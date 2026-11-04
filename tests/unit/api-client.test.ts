import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson, RequestError } from "@/lib/api-client";

afterEach(() => vi.unstubAllGlobals());

async function rejectedRequest(timeoutMs: number) {
  try { await requestJson("/api/ai/generate", "POST", { consent: true }, timeoutMs); }
  catch (error) {
    if (error instanceof RequestError) return error;
    throw error;
  }
  throw new Error("Expected the request to fail.");
}

describe("requestJson network failures", () => {
  it("distinguishes a long AI request timeout from loss of server connectivity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
    const error = await rejectedRequest(90_000);
    expect(error).toBeInstanceOf(RequestError);
    expect(error.status).toBe(408);
    expect(error.code).toBe("CLIENT_TIMEOUT");
    expect(error.message).toContain("configured models are tried");
  });

  it("keeps a distinct message for an actual network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = await rejectedRequest(90_000);
    expect(error).toBeInstanceOf(RequestError);
    expect(error.status).toBe(0);
    expect(error.message).toBe("Could not reach the server. Check your connection and retry.");
  });
});
