import { expect, test } from "@playwright/test";
import { architectureSchema } from "@/domain/architecture/schema";
import { account, headers } from "./fixtures";

test("one explicitly enabled AI action returns a renderable HoloCanvas graph without exposing model metadata", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "The real-provider smoke test runs once, not once per browser viewport.");
  test.skip(process.env.HOLOSTACK_LIVE_AI_SMOKE !== "true", "Set HOLOSTACK_LIVE_AI_SMOKE=true for an explicit live verification.");
  test.skip(process.env.GEMINI_ENABLED !== "true" || process.env.GEMINI_FREE_TIER_CONFIRMED !== "true" || !process.env.GEMINI_API_KEY, "No live Gemini call unless the developer explicitly configures and confirms the free-tier key.");
  test.setTimeout(270_000);
  const { email } = await account(request);
  const projectResponse = await request.post("/api/projects", { headers, data: { name: "Gemini API smoke design", description: "Synthetic verification fixture.", templateId: "serverless" } });
  expect(projectResponse.status()).toBe(201);
  const { project } = await projectResponse.json();
  const result = await request.post("/api/ai/generate", { headers, timeout: 240_000, data: { projectId: project.id, requirements: "Design a very small private notes application with a browser client, an authenticated API, and a PostgreSQL-compatible database. Return a concise, beginner-friendly graph.", consent: true } });
  expect(result.status()).toBe(201);
  const response = await result.json();
  expect(architectureSchema.safeParse(response.graph).success).toBe(true);
  expect(response).not.toHaveProperty("model");
  expect(response.graph.nodes.length).toBeGreaterThan(0);
  expect(email).toMatch(/^e2e-/);
  console.log(`Live Gemini graph validated with ${response.model}.`);
});
