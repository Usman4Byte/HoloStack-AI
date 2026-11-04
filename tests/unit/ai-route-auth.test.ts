import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/http/errors";

const mocks = vi.hoisted(() => ({ requireActor: vi.fn(), requireWriter: vi.fn(), rateLimit: vi.fn(), clientAddress: vi.fn(() => "unit-test"), generateArchitecture: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireActor: mocks.requireActor, requireWriter: mocks.requireWriter }));
vi.mock("@/server/auth/rate-limit", () => ({ rateLimit: mocks.rateLimit, clientAddress: mocks.clientAddress }));
vi.mock("@/server/ai/service", () => ({ generateArchitecture: mocks.generateArchitecture }));
import { POST } from "@/app/api/ai/generate/route";

const actor = { id: "01234567-89ab-4def-8123-456789abcdef", workspaceId: "11234567-89ab-4def-8123-456789abcdef", role: "owner" };
const request = (body: unknown) => new Request("http://localhost:3000/api/ai/generate", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify(body) });

describe("AI generation route authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireActor.mockResolvedValue(actor); mocks.generateArchitecture.mockResolvedValue({ graph: { id: "generated" } }); });

  it("requires an authenticated owner before invoking the model service", async () => {
    mocks.requireActor.mockRejectedValue(new ApiError(401, "Please sign in to continue.", "UNAUTHENTICATED"));
    const response = await POST(request({ projectId: "21234567-89ab-4def-8123-456789abcdef", requirements: "Build a document search platform.", consent: true }));
    expect(response.status).toBe(401);
    expect(mocks.generateArchitecture).not.toHaveBeenCalled();
  });

  it("enforces explicit provider sharing consent before a Gemini action", async () => {
    const response = await POST(request({ projectId: "21234567-89ab-4def-8123-456789abcdef", requirements: "Build a document search platform.", consent: false }));
    expect(response.status).toBe(400);
    expect(mocks.generateArchitecture).not.toHaveBeenCalled();
  });

  it("uses same-origin checks, ownership route service, and returns the validated generation", async () => {
    const response = await POST(request({ projectId: "21234567-89ab-4def-8123-456789abcdef", requirements: "Build a document search platform.", consent: true }));
    expect(response.status).toBe(201);
    expect(mocks.requireWriter).toHaveBeenCalledWith(actor);
    expect(mocks.rateLimit).toHaveBeenCalled();
    expect(mocks.generateArchitecture).toHaveBeenCalledWith(actor, "21234567-89ab-4def-8123-456789abcdef", "Build a document search platform.");
    expect(await response.json()).toEqual({ graph: { id: "generated" } });
  });
});
