import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "domain",
          environment: "node",
          include: ["domain/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "node",
          environment: "node",
          include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
        },
      },
      {
        plugins: [
          cloudflareTest({
            main: "./worker/index.ts",
            wrangler: { configPath: "./wrangler.jsonc" },
          }),
        ],
        test: {
          name: "worker",
          include: ["worker/**/*.test.ts"],
        },
      },
    ],
  },
});
