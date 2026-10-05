import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { hashCode } from "./worker/creator-codes.ts";
import { ALICE_CODE, ALICE_LABEL } from "./worker/testing/fixtures.ts";

const creatorCodes = JSON.stringify([{ label: ALICE_LABEL, hash: await hashCode(ALICE_CODE) }]);

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
            miniflare: { bindings: { CREATOR_CODES: creatorCodes, JURISDICTION: "none" } },
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
