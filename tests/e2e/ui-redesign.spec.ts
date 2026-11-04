import { expect, test } from "@playwright/test";

test("editorial marketing, responsive auth, and interactive product previews stay useful without Gemini", async ({ page }) => {
  const aiPosts: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/ai/")) aiPosts.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build better systems/i })).toBeVisible();
  await expect(page.locator(".welcome-actions").getByRole("link", { name: "Continue as guest" })).toHaveAttribute("href", "/guest");
  const marketingText = await page.locator("body").innerText();
  expect(marketingText).not.toMatch(/TiDB|Gemini|Google AI|PostgreSQL|Vercel|Next\.js|Cloudflare/i);
  await expect(page.getByRole("tab", { name: "AI SaaS / RAG" })).toBeVisible();
  await page.getByRole("tab", { name: "Realtime chat" }).click();
  await expect(page.getByRole("img", { name: "Architecture graph for Realtime chat" })).toBeVisible();

  for (const width of [320, 360, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (process.env.HOLOSTACK_UI_CAPTURE === "true" && (width === 375 || width === 1440)) {
      await page.screenshot({ path: `.local/ui-redesign-home-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Continue as guest" })).toBeVisible();
  await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Templates", exact: true }).click();
  await expect(page).toHaveURL(/#templates$/);

  await page.getByLabel("Incoming requests per second").focus();
  await page.keyboard.press("End");
  await expect(page.getByText("2,000 RPS", { exact: true })).toBeVisible();
  await expect(page.getByText(/Illustrative template assumptions only/)).toBeVisible();
  expect(aiPosts).toEqual([]);

  await page.goto("/signup");
  await expect(page.getByRole("link", { name: /Continue as guest/ })).toHaveAttribute("href", "/guest");
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /Continue as guest/ })).toHaveAttribute("href", "/guest");
});

test("guest templates open into an editable light studio without horizontal overflow", async ({ page }) => {
  const aiPosts: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/ai/")) aiPosts.push(request.url()); });
  await page.goto("/guest?template=ai-saas");
  await expect(page.getByLabel("Project name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Starting point")).toHaveValue("ai-saas");
  await page.getByLabel("Project name", { exact: true }).fill("UI redesign walkthrough");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/guest\/projects\//);
  await expect(page.locator(".architecture-node").first()).toBeVisible();
  for (const width of [320, 360, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const canvas = await page.locator(".canvas-area").boundingBox();
    expect(canvas?.height).toBeGreaterThan(250);
    if (process.env.HOLOSTACK_UI_CAPTURE === "true" && (width === 375 || width === 1440)) {
      await page.screenshot({ path: `.local/ui-redesign-studio-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole("button", { name: "Scale & review" }).click();
  await expect(page.getByText("DETERMINISTIC ENGINE · NO AI REQUESTS")).toBeVisible();
  await page.getByRole("button", { name: "AI assistant" }).click();
  await expect(page.getByText(/AI features are unavailable right now|AI actions today/).first()).toBeVisible();
  const guestAIText = await page.locator("#ai-workbench").innerText();
  expect(guestAIText).not.toMatch(/Gemini|Google AI|TiDB|PostgreSQL|gemini-/i);
  expect(aiPosts).toEqual([]);
});

test("guest workspace navigation, notices, dashboard, and studio fit narrow phone widths", async ({ page }) => {
  await page.goto("/guest");
  await expect(page.locator(".site-author-bar")).toContainText("Made by Usman4Byte");
  await expect(page.locator(".site-footer")).toContainText("Made by Usman4Byte");
  const widths = [320, 360, 375, 390, 414, 430, 768, 1024, 1440];
  const signIn = page.getByRole("link", { name: "Sign in", exact: true });
  const signupCta = page.locator(".guest-storage-notice").getByRole("link", { name: "Create an account" });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(signIn).toBeVisible();
    await expect(signupCta).toBeVisible();
    if (width <= 430) expect(await signIn.evaluate(element => getComputedStyle(element).whiteSpace)).toBe("nowrap");
    if (process.env.HOLOSTACK_UI_CAPTURE === "true" && width === 375) {
      await page.screenshot({ path: ".local/ui-redesign-guest-dashboard-375.png", fullPage: true });
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const menuToggle = page.getByRole("button", { name: "Menu", exact: true });
  await menuToggle.click();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Guest workspace navigation" }).getByRole("link", { name: "Architecture studio" })).toBeVisible();
  await page.getByRole("navigation", { name: "Guest workspace navigation" }).getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/guest");

  const topProfileMenu = page.locator(".site-author-bar .developer-links");
  await topProfileMenu.locator("summary").click();
  await expect(topProfileMenu.getByRole("link", { name: "Visit GitHub" })).toHaveAttribute("href", "https://github.com/usman4byte");
  await expect(topProfileMenu.getByRole("link", { name: "Visit LinkedIn" })).toHaveAttribute("href", "https://linkedin.com/in/usman4byte");
  const footerProfileMenu = page.locator(".site-footer .developer-links");
  await footerProfileMenu.locator("summary").click();
  await expect(footerProfileMenu.getByRole("link", { name: "Visit GitHub" })).toHaveAttribute("href", "https://github.com/usman4byte");

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Responsive guest project");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/guest\/projects\//);
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const viewportCheck = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      overflowing: [...document.querySelectorAll<HTMLElement>("body *")].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 8).map(element => `${element.tagName.toLowerCase()}.${element.className.toString().split(" ")[0]}:${Math.round(element.getBoundingClientRect().right)}`),
    }));
    expect(viewportCheck.documentWidth, `horizontal overflow at ${width}px: ${JSON.stringify(viewportCheck.overflowing)}`).toBeLessThanOrEqual(viewportCheck.viewportWidth);
    await expect(page.locator(".studio-toolbar")).toBeVisible();
  }
});
