import { expect } from "@playwright/test";
import { projectTest as test } from "./fixtures";
import { templates } from "@/domain/architecture/templates";

const viewportCases = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

function graphWithNodes(count: number) {
  const base = templates[0];
  const nodes = Array.from({ length: count }, (_, index) => {
    const source = base.nodes[index % base.nodes.length];
    return { ...source, id: `audit-node-${index}`, label: `Audit component ${index + 1}`, position: { x: index * 30, y: (index % 8) * 30 } };
  });
  const edges = Array.from({ length: count - 1 }, (_, index) => ({
    id: `audit-edge-${index}`, source: `audit-node-${index}`, target: `audit-node-${index + 1}`,
    kind: "https" as const, label: "request", requestMultiplier: 1, metadata: { contract: "Synthetic performance fixture." },
  }));
  return { ...base, nodes, edges };
}

test("guests create and edit real projects that persist across refresh in this browser session", async ({ page, browser }, testInfo) => {
  const projectWrites: string[] = [], providerCalls: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/api/projects") && request.method() !== "GET") projectWrites.push(request.url());
    if (request.url().includes("/api/ai/") && request.method() === "POST") providerCalls.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Continue without signup" })).toHaveAttribute("href", "/guest");
  await page.getByRole("link", { name: "Continue without signup" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to your workspace." })).toBeVisible();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Guest architecture");
  await page.getByLabel("Starting point").selectOption("scratch");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page).toHaveURL(/\/guest\/projects\/[a-f0-9-]+$/);
  await page.getByLabel("Component to add").selectOption("service");
  await page.getByRole("button", { name: "Add selected component" }).click();
  await page.getByLabel("Component name", { exact: true }).fill("Guest API");
  await expect(page.getByRole("status").filter({ hasText: "Saved in this browser session" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Details & history" }).click();
  await page.getByLabel("Engineering notes").fill("Guest notes remain in this session.");
  await expect(page.getByRole("status").filter({ hasText: "Saved in this browser session" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Scale & review" }).click();
  await page.getByRole("button", { name: "Save in session" }).click();
  await expect(page.getByText("MVP baseline · v", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Guest architecture" })).toBeVisible();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(page.getByLabel("Component name", { exact: true })).toHaveValue("Guest API");
  await page.getByRole("button", { name: "Details & history" }).click();
  await expect(page.getByLabel("Engineering notes")).toHaveValue("Guest notes remain in this session.");
  await page.getByRole("button", { name: "View recent versions" }).click();
  await expect(page.locator(".version-list li").first()).toBeVisible();
  await page.getByRole("button", { name: "Scale & review" }).click();
  await expect(page.getByText(/MVP baseline · v/)).toBeVisible();
  await page.getByRole("button", { name: "AI assistant" }).click();
  await expect(page.getByText(/guest daily actions left/)).toBeVisible();
  await expect(page.getByRole("region", { name: "HoloStack AI workbench" })).toBeVisible();
  const storageSize = await page.evaluate(() => sessionStorage.getItem("holostack.guest-workspace.v1")?.length ?? 0);
  expect(storageSize).toBeGreaterThan(0);
  expect(projectWrites).toEqual([]);
  expect(providerCalls).toEqual([]);

  const isolated = await browser.newContext();
  try {
    const otherPage = await isolated.newPage();
    await otherPage.goto(page.url());
    await expect(otherPage.getByText("This guest project is not available in this browser session.")).toBeVisible();
  } finally { await isolated.close(); }

  for (const viewport of viewportCases) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`guest-${viewport.width}.png`), fullPage: true });
  }
  for (const path of ["/dashboard", "/settings", "/setup"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  expect((await page.request.get("/api/projects")).status()).toBe(401);
});

test("canvas imports usable graphs through 100 components and rejects 200 at the documented limit", async ({ page, openFixtureProject }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openFixtureProject(page, "Graph size audit");
  await page.getByRole("button", { name: "Fit architecture to view" }).click();
  const input = page.getByLabel("Import architecture JSON file");
  const graphCount = page.locator(".studio-footer > span").first();
  for (const count of [10, 50, 100]) {
    await input.setInputFiles({ name: `audit-${count}.json`, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(count))) });
    await expect(page.locator(".export-notice")).toContainText(`Imported ${count} components`, { timeout: 15_000 });
    await expect(graphCount).toContainText(`${count} components`, { timeout: 15_000 });
    await page.getByRole("button", { name: "Fit architecture to view" }).click();
  }
  await input.setInputFiles({ name: "audit-200.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(200))) });
  await expect(page.locator(".export-notice")).toContainText("does not match a valid HoloStack architecture");
  await expect(graphCount).toContainText("100 components");
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
