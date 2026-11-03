import { expect, test } from "@playwright/test";

test("sample workspace supports template selection, editing, and valid export", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Big ideas. Better systems." })).toBeVisible();
  await expect(page.getByText("Sample mode · not saved")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: /E-commerce 6 components/ }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  await page.getByLabel("Component name").fill("Order API");
  await expect(page.locator(".react-flow__node").filter({ hasText: "Order API" })).toHaveCount(1);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("holostack-commerce.json");
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream!) chunks.push(chunk);
  const graph = JSON.parse(Buffer.concat(chunks).toString());
  expect(graph.nodes.find((node: { id: string }) => node.id === "api").label).toBe("Order API");
  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("workspace.png"), fullPage: true });
});

test("setup and liveness communicate their actual scope", async ({ page, request }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Connection not verified here" })).toBeVisible();
  await expect(page.getByText("npm run db:check", { exact: false })).toBeVisible();
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", service: "holostack-ai" });
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
