import { expect, test } from "@playwright/test";
import { fixtureEmail, fixturePassword } from "./fixtures";

test("private architecture studio stays useful with AI disabled and makes no generation call on load", async ({ page }) => {
  test.skip(process.env.HOLOSTACK_LIVE_AI_SMOKE === "true", "This test uses the default offline Playwright server.");
  const generationCalls: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/ai/generate") || request.url().includes("/api/ai/assistant")) generationCalls.push(request.url()); });
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Offline AI Test");
  await page.getByLabel("Email address").fill(fixtureEmail());
  await page.getByLabel("Password", { exact: true }).fill(fixturePassword());
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Offline design workbench");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  await expect(page.getByText("Live AI is not configured.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate architecture" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add selected component" })).toBeEnabled();
  expect(generationCalls).toEqual([]);
});
