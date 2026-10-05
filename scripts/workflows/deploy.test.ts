import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

describe("the deploy workflow", () => {
  const deploy = read("deploy.yml");

  it("runs on push to main, never on a pull request", () => {
    expect(deploy).toMatch(/push:\s*\n\s*branches: \[main\]/);
    expect(deploy).not.toContain("pull_request");
  });

  it("runs the CI gate and ships only after it", () => {
    expect(deploy).toContain("uses: ./.github/workflows/ci.yml");
    expect(read("ci.yml")).toContain("workflow_call:");
    expect(deploy).toMatch(/needs: \[test, secrets\]/);
  });

  it("is skipped, not failed, while the Cloudflare secrets are missing", () => {
    expect(deploy).toContain("if: needs.secrets.outputs.configured == 'true'");
    expect(deploy).toContain("secrets.CLOUDFLARE_API_TOKEN");
    expect(deploy).toContain("secrets.CLOUDFLARE_ACCOUNT_ID");
  });

  it("never cancels a deploy half way", () => {
    expect(deploy).toContain("cancel-in-progress: false");
  });
});
