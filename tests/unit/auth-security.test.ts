import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";
import { appOrigin, assertSameOrigin, readJson } from "../../src/server/http/request";
import { signUpSchema } from "@/domain/accounts/schema";
import { updateProjectSchema } from "@/domain/projects/schema";

describe("authentication boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("salts passwords, verifies them, and rejects wrong or malformed credentials", async () => {
    const password = "a-test-only-long-passphrase";
    const first = await hashPassword(password), second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("wrong", first)).toBe(false);
    expect(await verifyPassword(password, "malformed")).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
  }, 15000);
  it("normalizes email and rejects weak passwords and privilege injection", () => {
    const input = { name: " User ", email: " USER@example.com ", password: "long-test-passphrase" };
    expect(signUpSchema.parse(input).email).toBe("user@example.com");
    expect(signUpSchema.safeParse({ ...input, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...input, role: "admin" }).success).toBe(false);
  });
  it("requires a trusted origin and rejects cross-site browser submissions", () => {
    const valid = new Request("http://localhost:3000/api/projects", { headers: { origin: "http://localhost:3000" } });
    expect(() => assertSameOrigin(valid)).not.toThrow();
    for (const headers of [{} as Record<string, string>, { origin: "https://evil.example" }, { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }]) {
      expect(() => assertSameOrigin(new Request(valid.url, { headers }))).toThrow();
    }
  });
  it("requires an explicit HTTPS application URL on Vercel production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_URL", "");
    expect(() => appOrigin()).toThrow(/not configured/i);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(() => appOrigin()).toThrow(/HTTPS/i);
    vi.stubEnv("APP_URL", "https://app.example.test");
    expect(appOrigin().origin).toBe("https://app.example.test");
  });
  it("enforces actual streamed body size even without Content-Length", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: "x".repeat(500) }) });
    await expect(readJson(request, signUpSchema, 100)).rejects.toMatchObject({ status: 413 });
  });
  it("requires revision numbers and rejects attempts to change project ownership", () => {
    expect(updateProjectSchema.safeParse({ name: "Oops" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ revision: 1 }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ revision: 1, name: "New", workspaceId: "another" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ revision: 1, notes: "Decision recorded" }).success).toBe(true);
  });
});
