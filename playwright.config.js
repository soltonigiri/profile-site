import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8790",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node node_modules/wrangler/bin/wrangler.js pages dev public --port 8790",
    wait: { stdout: /Ready on/ },
    timeout: 120_000,
    env: { WRANGLER_SEND_METRICS: "false" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
