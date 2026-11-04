import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { test as base, type APIRequestContext, type Page } from "@playwright/test";
import { databaseConfig } from "../../src/server/db/config";
export const origin = "http://localhost:3100";
export const headers = { Origin: origin };
export const fixtureEmail = () => `e2e-${process.env.HOLOSTACK_TEST_RUN}-${randomUUID().slice(0,8)}@example.invalid`;
export const fixturePassword = () => `Test-only-${randomUUID()}!`;
export async function account(request: APIRequestContext) {
  const email = fixtureEmail(), password = fixturePassword();
  const response = await request.post("/api/auth/signup", { headers, data: { email, password, name: "Test Architect" } });
  if (response.status() !== 201) throw new Error(`Test account creation returned ${response.status()}`);
  return { email, password };
}
export async function database<T>(run: (pool: Pool) => Promise<T>) {
  const pool = new Pool(databaseConfig()); pool.on("error", () => {});
  try { return await run(pool); } finally { await pool.end(); }
}

// Canvas scenarios use a single synthetic account per worker and separate projects per test.
export const projectTest = base.extend<object, {
  openFixtureProject: (page: Page, name: string, templateId?: string) => Promise<string>;
}>({
  openFixtureProject: [async ({ playwright }, useFixture) => {
    const request = await playwright.request.newContext({ baseURL: origin });
    try {
      await account(request);
      const state = await request.storageState();
      await useFixture(async (page, name, templateId = "ai-saas") => {
        const response = await request.post("/api/projects", { headers, data: { name, templateId } });
        if (response.status() !== 201) throw new Error(`Test project creation returned ${response.status()}`);
        const { project } = await response.json();
        await page.context().addCookies(state.cookies);
        await page.goto(`/projects/${project.id}`);
        return project.id;
      });
    } finally {
      await request.dispose();
    }
  }, { scope: "worker" }],
});
