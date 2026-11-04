import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/pool", () => ({ getDatabase: () => ({ query: mocks.query }) }));
import { GET } from "@/app/api/ready/route";

describe("database readiness probe", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue({ rows: [{ ok: 1 }] }); });
  afterEach(() => vi.restoreAllMocks());

  it("checks the database and required application tables without exposing environment data", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ status: "ready", checks: { database: "ready", applicationSchema: "ready" } });
    expect(mocks.query).toHaveBeenNthCalledWith(1, "SELECT 1 AS ok");
    expect(mocks.query).toHaveBeenNthCalledWith(2, "SELECT 1 FROM holostack.projects LIMIT 0");
    expect(mocks.query).toHaveBeenNthCalledWith(3, "SELECT 1 FROM holostack.intelligence_runs LIMIT 0");
  });

  it("returns a generic 503 and never returns a raw provider error", async () => {
    const error = Object.assign(new Error("password=secret-value"), { code: "28P01" });
    mocks.query.mockRejectedValueOnce(error);
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).not.toContain("secret-value");
    expect(body).not.toContain("password");
    expect(body).toContain("not_ready");
    expect(logger).toHaveBeenCalledWith("Readiness probe failed (28P01); details withheld.");
  });

  it("treats a missing application migration table as not ready", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] }).mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(Object.assign(new Error("raw"), { code: "42P01" }));
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready", checks: { database: "ready", applicationSchema: "unavailable" } });
    expect(logger).toHaveBeenCalledWith("Readiness probe failed (42P01); details withheld.");
  });
});
