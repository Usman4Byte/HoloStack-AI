import { expect, test } from "@playwright/test";
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

test("public demo stays deterministic, exportable, and responsive without Gemini requests", async ({ page }, testInfo) => {
  const aiRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/ai/")) aiRequests.push(`${request.method()} ${request.url()}`); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Big ideas. Better systems." })).toBeVisible();
  const analysis = page.getByRole("region", { name: "Public sample ScaleLab and architecture review" });
  await expect(analysis.getByText("DETERMINISTIC ENGINE · NO AI REQUESTS")).toBeVisible();
  await expect(analysis.getByRole("heading", { name: "Rule-based architecture review" })).toBeVisible();
  await expect(analysis.getByRole("button", { name: "Compare prepared variant" })).toBeVisible();
  await analysis.getByRole("button", { name: "Compare prepared variant" }).click();
  const comparison = analysis.getByRole("region", { name: "Prepared local architecture comparison" });
  await expect(comparison.getByText("PREPARED FIXTURE · NO PROVIDER CALL · NOT APPLIED")).toBeVisible();
  await expect(comparison.getByText(/Modeled database requests:/)).toBeVisible();

  const traffic = analysis.getByLabel("Sample direct requests per second");
  await traffic.focus(); await traffic.press("ArrowRight");
  await expect(analysis.getByText("90", { exact: true })).toBeVisible();
  await expect(analysis.getByText(/Modeled database requests:/)).toBeVisible();

  const reportEvent = page.waitForEvent("download");
  await analysis.getByRole("button", { name: "Export report" }).click();
  const report = await reportEvent;
  expect(report.suggestedFilename()).toBe("ai-saas-rag-report.md");
  const reportStream = await report.createReadStream();
  const reportChunks = []; for await (const chunk of reportStream!) reportChunks.push(chunk);
  const markdown = Buffer.concat(reportChunks).toString("utf8");
  expect(markdown).toContain("not load tests");
  expect(markdown).toContain("Evidence:");

  for (const viewport of viewportCases) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Big ideas. Better systems." })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`release-${viewport.width}.png`), fullPage: true });
  }
  await expect(page.getByRole("button", { name: "Automatically arrange components" })).toBeVisible();
  expect(aiRequests).toEqual([]);
});

test("canvas imports usable graphs through 100 components and rejects 200 at the documented limit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.getByRole("status")).toContainText("Sample reset to its authored starting point.");
  const input = page.getByLabel("Import architecture JSON file");
  const graphCount = page.locator(".studio-footer > span").first();
  for (const count of [10, 50, 100]) {
    await input.setInputFiles({ name: `audit-${count}.json`, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(count))) });
    await expect(page.getByRole("status")).toContainText(`Imported ${count} components`, { timeout: 15_000 });
    await expect(graphCount).toContainText(`${count} components`, { timeout: 15_000 });
    await page.getByRole("button", { name: "Fit architecture to view" }).click();
  }
  await input.setInputFiles({ name: "audit-200.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(200))) });
  await expect(page.getByRole("status")).toContainText("does not match a valid HoloStack architecture");
  await expect(graphCount).toContainText("100 components");
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
