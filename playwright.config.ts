import { defineConfig, devices } from "@playwright/test";

const PORT = 8787;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The interface is Italian first; one test switches to English.
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The built app served by the same runtime as production, locally and with no
  // network (SPEC.md G-B11). `npm run build` must have run first.
  webServer: {
    command: `wrangler dev --local --port ${PORT} --var JURISDICTION:none --show-interactive-dev-session=false`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { WRANGLER_SEND_METRICS: "false", CLOUDFLARE_API_TOKEN: "", NO_COLOR: "1" },
  },
});
