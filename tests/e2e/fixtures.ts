import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { APIRequestContext } from "@playwright/test";
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
