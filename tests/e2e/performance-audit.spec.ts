import { expect, test } from "@playwright/test";
import { templates } from "@/domain/architecture/templates";

function graphWithNodes(count: number) {
  const base = templates[0];
  const nodes = Array.from({ length: count }, (_, index) => {
    const source = base.nodes[index % base.nodes.length];
    return { ...source, id: `perf-node-${index}`, label: `Performance component ${index + 1}`, position: { x: index * 30, y: (index % 8) * 30 } };
  });
  const edges = Array.from({ length: count - 1 }, (_, index) => ({
    id: `perf-edge-${index}`, source: `perf-node-${index}`, target: `perf-node-${index + 1}`,
    kind: "https" as const, label: "request", requestMultiplier: 1, metadata: { contract: "Synthetic performance fixture." },
  }));
  return { ...base, id: `perf-${count}`, nodes, edges };
}

test("measure production canvas import acknowledgment for 10/50/100 and 200-node rejection", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.getByRole("status")).toContainText("Sample reset to its authored starting point.");
  const input = page.getByLabel("Import architecture JSON file");
  const graphCount = page.locator(".studio-footer > span").first();
  const measurements: Array<{ nodes: number; result: string; importAcknowledgmentMs: number }> = [];

  for (const count of [10, 50, 100]) {
    const started = Date.now();
    await input.setInputFiles({ name: `performance-${count}.json`, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(count))) });
    await expect(page.getByRole("status")).toContainText(`Imported ${count} components`, { timeout: 15_000 });
    await expect(graphCount).toContainText(`${count} components`);
    measurements.push({ nodes: count, result: "accepted", importAcknowledgmentMs: Date.now() - started });
    await page.getByRole("button", { name: "Fit architecture to view" }).click();
  }

  const started = Date.now();
  await input.setInputFiles({ name: "performance-200.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(graphWithNodes(200))) });
  await expect(page.getByRole("status")).toContainText("does not match a valid HoloStack architecture", { timeout: 15_000 });
  await expect(graphCount).toContainText("100 components");
  measurements.push({ nodes: 200, result: "rejected at schema bound", importAcknowledgmentMs: Date.now() - started });

  await testInfo.attach("production-import-timings.json", { body: Buffer.from(JSON.stringify(measurements, null, 2)), contentType: "application/json" });
  console.log(`AUDIT_IMPORT_TIMINGS ${JSON.stringify(measurements)}`);
});
