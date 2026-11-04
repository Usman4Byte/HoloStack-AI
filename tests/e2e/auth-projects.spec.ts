import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { account, database, fixtureEmail, fixturePassword, headers, origin } from "./fixtures";

test("sign up, save a project, reopen it, manage its lifecycle, and sign out", async ({ page }, info) => {
  const email = fixtureEmail(), password = fixturePassword();
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Test Architect");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  try { await page.waitForURL(/\/dashboard$/, { timeout: 15_000 }); }
  catch (error) {
    await expect(page.getByRole("alert")).toHaveText("The service is temporarily unavailable. Please retry.");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    try { await page.waitForURL(/\/dashboard$/, { timeout: 15_000 }); }
    catch { throw error; }
  }
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("My test architecture");
  await page.getByLabel("Description", { exact: true }).fill("A private design persisted in TiDB.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  const projectUrl = page.url();
  await page.getByLabel("Component name", { exact: true }).fill("Private application API");
  await page.getByLabel("Engineering notes").fill("Use explicit workspace authorization.");
  await page.getByLabel("Project name", { exact: true }).fill("Renamed architecture");
  await expect(page.getByRole("status").filter({ hasText: "Saved to your workspace · Version 2" })).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByLabel("Component name", { exact: true })).toHaveValue("Private application API");
  await expect(page.getByLabel("Engineering notes")).toHaveValue("Use explicit workspace authorization.");
  await expect(page.getByRole("heading", { name: "Renamed architecture", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View recent versions" }).click();
  await expect(page.locator(".version-list li")).toHaveCount(2);
  const externalSave = await page.request.patch(`/api/projects/${new URL(projectUrl).pathname.split("/").at(-1)}`, { headers: { Origin: "http://localhost:3100" }, data: { revision: 2, notes: "Competing tab edit" } });
  expect(externalSave.status()).toBe(200);
  await page.getByLabel("Component name", { exact: true }).fill("Local conflict draft");
  await expect(page.getByRole("status").filter({ hasText: "changed in another tab" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Component name", { exact: true })).toHaveValue("Local conflict draft");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Reload latest" }).click();
  await expect(page.getByLabel("Component name", { exact: true })).toHaveValue("Private application API");
  await expect(page.getByLabel("Engineering notes")).toHaveValue("Competing tab edit");
  await page.getByRole("link", { name: "All projects" }).click();
  await page.getByRole("button", { name: "Duplicate Renamed architecture", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renamed architecture (copy)", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "All projects" }).click();
  await page.getByRole("button", { name: "Archive Renamed architecture", exact: true }).click();
  await page.getByRole("link", { name: "Archived", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renamed architecture", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore Renamed architecture", exact: true }).click();
  await page.getByRole("link", { name: "Active", exact: true }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Move Renamed architecture to Trash", exact: true }).click();
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renamed architecture", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore Renamed architecture", exact: true }).click();
  await page.goto("/settings");
  await page.getByLabel("Display name").fill("Updated Architect");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome back, Updated." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath("dashboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(projectUrl);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Make room for your ideas." })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("tenant boundaries, stale writes, CSRF, expiration, password changes and revocation", async ({ playwright }) => {
  const owner = await playwright.request.newContext({ baseURL: origin });
  const stranger = await playwright.request.newContext({ baseURL: origin });
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  try {
    const credentials = await account(owner); await account(stranger);
    expect((await anonymous.get("/api/projects")).status()).toBe(401);
    expect((await owner.post("/api/projects", { data: { name: "Rejected", templateId: "ai-saas" } })).status()).toBe(403);
    const created = await owner.post("/api/projects", { headers, data: { name: "Owner only", templateId: "ai-saas" } });
    expect(created.status()).toBe(201);
    const { project } = await created.json(); const url = `/api/projects/${project.id}`;
    expect((await stranger.get(url)).status()).toBe(404);
    expect((await stranger.patch(url, { headers, data: { revision: 1, name: "Taken" } })).status()).toBe(404);
    expect((await stranger.delete(url, { headers, data: { revision: 1 } })).status()).toBe(404);
    expect((await stranger.post(`${url}/duplicate`, { headers, data: {} })).status()).toBe(404);
    expect((await stranger.get(`${url}/versions`)).status()).toBe(404);
    const changed = await owner.patch(url, { headers, data: { revision: 1, notes: "First writer" } });
    expect(changed.status()).toBe(200);
    expect((await owner.patch(url, { headers, data: { revision: 1, notes: "Stale" } })).status()).toBe(409);
    expect((await owner.patch(url, { headers, data: { revision: 2, workspaceId: "other" } })).status()).toBe(400);
    expect((await owner.patch(url, { headers, data: { revision: 2, notes: "x".repeat(600000) } })).status()).toBe(413);
    const concurrent = await Promise.all(["A", "B"].map(notes => owner.patch(url, { headers, data: { revision: 2, notes } })));
    expect(concurrent.map(response => response.status()).sort()).toEqual([200, 409]);
    expect((await owner.get("/api/projects?page=-1")).status()).toBe(400);
    expect((await (await stranger.get("/api/projects")).json()).total).toBe(0);
    const cookies = (await owner.storageState()).cookies; const session = cookies.find(cookie => cookie.name === "holostack_session")!;
    expect(session.httpOnly).toBe(true); expect(session.sameSite).toBe("Lax");
    const hash = createHash("sha256").update(session.value).digest("hex");
    await database(async db => {
      const result = await db.query("SELECT token_hash FROM holostack.sessions WHERE token_hash=$1", [hash]); expect(result.rowCount).toBe(1);
      await db.query("UPDATE holostack.sessions SET expires_at=$1 WHERE token_hash=$2", [new Date(0), hash]);
    });
    expect((await owner.get(url)).status()).toBe(401);
    expect((await owner.post("/api/auth/login", { headers, data: credentials })).status()).toBe(200);
    const replacement = fixturePassword();
    expect((await owner.post("/api/account/password", { headers, data: { currentPassword: credentials.password, newPassword: replacement } })).status()).toBe(200);
    expect((await owner.get(url)).status()).toBe(401);
    expect((await owner.post("/api/auth/login", { headers, data: credentials })).status()).toBe(401);
    expect((await owner.post("/api/auth/login", { headers, data: { ...credentials, password: replacement } })).status()).toBe(200);
    expect((await owner.delete("/api/account/sessions", { headers })).status()).toBe(200);
    expect((await owner.get(url)).status()).toBe(401);
  } finally { await owner.dispose(); await stranger.dispose(); await anonymous.dispose(); }
});
