import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });
const runLiveAISmoke = process.env.HOLOSTACK_LIVE_AI_SMOKE === "true";
process.env.HOLOSTACK_TEST_RUN ??= randomUUID().replaceAll("-", "");
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1,
  timeout: 90_000, expect: { timeout: 15_000 },
  globalTeardown: "./tests/e2e/cleanup.ts",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : "chromium") } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : "chromium") } },
  ],
  webServer: {
    command: "npm run start -- --port 3100 --hostname 127.0.0.1",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      APP_URL: "http://localhost:3100",
      GEMINI_ENABLED: runLiveAISmoke ? process.env.GEMINI_ENABLED ?? "false" : "false",
    },
  },
});
