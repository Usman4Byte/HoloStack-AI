import { expect, test } from "@playwright/test";

test("sample studio supports editing, history, layout, JSON import, PNG export, and reset", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Big ideas. Better systems." })).toBeVisible();
  await expect(page.getByText("Sample mode · not saved")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: /E-commerce 6 components/ }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  await page.getByLabel("Component name").fill("Order API");
  await expect(page.locator(".react-flow__node").filter({ hasText: "Order API" })).toHaveCount(1);
  await page.getByRole("button", { name: "Undo architecture change" }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  await page.getByRole("button", { name: "Redo architecture change" }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Order API");
  const undoButton = page.getByRole("button", { name: "Undo architecture change" });
  await undoButton.focus();
  await expect(undoButton).toBeFocused();
  await page.keyboard.press("Control+z");
  await expect(page.locator(".react-flow__node").filter({ hasText: "Commerce API" })).toHaveCount(1);
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  const redoButton = page.getByRole("button", { name: "Redo architecture change" });
  await redoButton.focus();
  await expect(redoButton).toBeFocused();
  await page.keyboard.press("Control+Shift+z");
  await expect(page.locator(".react-flow__node").filter({ hasText: "Order API" })).toHaveCount(1);
  await expect(page.getByLabel("Component name")).toHaveValue("Order API");

  await page.getByLabel("Component to add").selectOption("database");
  await page.getByRole("button", { name: "Add selected component" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  await expect(page.getByLabel("Component name")).toHaveValue("Database");
  await page.getByRole("button", { name: "Automatically arrange components" }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Database");
  const addedDatabase = page.locator(".react-flow__node").filter({ hasText: "Database" }).last();
  await addedDatabase.click();
  await expect(addedDatabase).toHaveClass(/selected/);
  await addedDatabase.focus();
  await expect(addedDatabase).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: "Undo architecture change" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(7);

  const jsonDownloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export architecture as JSON" }).click();
  const download = await jsonDownloadEvent;
  expect(download.suggestedFilename()).toBe("holostack-commerce.json");
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream!) chunks.push(chunk);
  const graph = JSON.parse(Buffer.concat(chunks).toString());
  expect(graph.nodes.find((node: { id: string }) => node.id === "api").label).toBe("Order API");
  expect(graph.nodes).toHaveLength(7);

  const imageDownloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export architecture as PNG" }).click();
  const imageDownload = await imageDownloadEvent;
  expect(imageDownload.suggestedFilename()).toBe("holostack-commerce.png");
  const imageStream = await imageDownload.createReadStream();
  const imageChunks = []; for await (const chunk of imageStream!) imageChunks.push(chunk);
  expect(Buffer.concat(imageChunks).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  const imported = { ...graph, nodes: graph.nodes.map((node: { id: string; label: string }) => node.id === "api" ? { ...node, label: "Imported Order API" } : node) };
  await page.getByLabel("Import architecture JSON file").setInputFiles({ name: "architecture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.locator(".react-flow__node").filter({ hasText: "Imported Order API" })).toHaveCount(1);
  await page.locator(".react-flow__node").filter({ hasText: "Imported Order API" }).click({ force: true });
  await expect(page.getByLabel("Component name")).toHaveValue("Imported Order API");
  await page.getByLabel("Import architecture JSON file").setInputFiles({ name: "too-large.json", mimeType: "application/json", buffer: Buffer.alloc(256 * 1024 + 1) });
  await expect(page.getByRole("status")).toContainText("256 KiB");
  await expect(page.locator(".react-flow__node")).toHaveCount(7);

  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.getByLabel("Component name")).toHaveValue("Commerce API");
  await expect(page.locator(".react-flow__node").first()).toBeInViewport();
  await expect(page.locator(".react-flow__node").last()).toBeInViewport();
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("workspace.png"), fullPage: true });
});

test("setup, liveness, and database readiness communicate their actual scope", async ({ page, request }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Connection not verified here" })).toBeVisible();
  await expect(page.getByText("npm run db:check", { exact: false })).toBeVisible();
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", service: "holostack-ai" });
  expect(response.headers()["cache-control"]).toBe("no-store");
  const ready = await request.get("/api/ready");
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: "ready", checks: { database: "ready", applicationSchema: "ready" } });
  expect(ready.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
