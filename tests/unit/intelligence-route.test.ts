import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/http/errors";
const mocks = vi.hoisted(() => ({ requireActor: vi.fn(), requireWriter: vi.fn(), rateLimit: vi.fn(), list: vi.fn(), save: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireActor: mocks.requireActor, requireWriter: mocks.requireWriter }));
vi.mock("@/server/auth/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/server/intelligence/service", () => ({ listIntelligenceRuns: mocks.list, saveIntelligenceRun: mocks.save }));
import { GET, POST } from "@/app/api/projects/[id]/intelligence/route";
const actor = { id: "01234567-89ab-4def-8123-456789abcdef", workspaceId: "11234567-89ab-4def-8123-456789abcdef", role: "owner" };
const params = { params: Promise.resolve({ id: "21234567-89ab-4def-8123-456789abcdef" }) };
const body = { name: "Peak read", expectedRevision: 3, workload: { requestsPerSecond: 100, concurrentUsers: 0, requestsPerUserPerMinute: 0, readShare: 0.8 } };
const request = (payload: unknown) => new Request("http://localhost:3000/api/projects/id/intelligence", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify(payload) });

describe("project intelligence API tenant and input boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireActor.mockResolvedValue(actor); mocks.save.mockResolvedValue({ id: "run-1" }); mocks.list.mockResolvedValue([]); });
  it("requires an actor before listing project-scoped runs", async () => {
    mocks.requireActor.mockRejectedValue(new ApiError(401, "Please sign in to continue.", "UNAUTHENTICATED"));
    const response = await GET(new Request("http://localhost/api"), params);
    expect(response.status).toBe(401); expect(mocks.list).not.toHaveBeenCalled();
  });
  it("saves validated scenarios only after same-origin auth and rate limiting", async () => {
    const response = await POST(request(body), params);
    expect(response.status).toBe(201);
    expect(mocks.requireWriter).toHaveBeenCalledWith(actor);
    expect(mocks.rateLimit).toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith(actor, "21234567-89ab-4def-8123-456789abcdef", body);
  });
  it("rejects an invalid workload without invoking persistence", async () => {
    const response = await POST(request({ ...body, workload: { ...body.workload, readShare: 8 } }), params);
    expect(response.status).toBe(400); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin save", async () => {
    const invalidOrigin = new Request("http://localhost:3000/api/projects/id/intelligence", { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: JSON.stringify(body) });
    const response = await POST(invalidOrigin, params);
    expect(response.status).toBe(403); expect(mocks.save).not.toHaveBeenCalled();
  });
});
