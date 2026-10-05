import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_CREATOR_CODE } from "./e2e/creator-code.ts";

const PORT = 8787;

// The Worker reads its creator codes from `.dev.vars` under `wrangler dev` (gitignored). The e2e code is
// a made-up one, hashed here every run as SPEC.md §4 says the server keeps it: SHA-256 of the trimmed,
// upper-cased code. A real code never goes through this file.
const hash = createHash("sha256").update(E2E_CREATOR_CODE.trim().toUpperCase()).digest("hex");
writeFileSync(new URL(".dev.vars", import.meta.url), `CREATOR_CODES='${JSON.stringify([{ label: "e2e", hash }])}'\n`);

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
