import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDist } from "./check-dist.ts";

const KB = 1024;
let dist: string;

const write = (path: string, content: string | Buffer) => {
  const full = join(dist, path);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
};

const indexWith = (...scripts: string[]) =>
  `<!doctype html><html><body>${scripts.map((s) => `<script type="module" src="${s}"></script>`).join("")}</body></html>`;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "quits-dist-"));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe("checkDist", () => {
  it("passes a small build", () => {
    write("index.html", indexWith("/assets/app.js"));
    write("assets/app.js", "console.log(1)");
    write("assets/font.woff2", randomBytes(50 * KB));

    expect(checkDist(dist).violations).toEqual([]);
  });

  it("fails when the initial JS is over 200 KB gzip", () => {
    write("index.html", indexWith("/assets/app.js"));
    write("assets/app.js", randomBytes(210 * KB).toString("hex"));

    const { violations } = checkDist(dist);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/initial JS/);
  });

  it("counts the gzip size, not the raw size", () => {
    write("index.html", indexWith("/assets/app.js"));
    write("assets/app.js", "a".repeat(900 * KB));

    expect(checkDist(dist).violations).toEqual([]);
  });

  it("does not count JS that the page does not load up front", () => {
    write("index.html", indexWith("/assets/app.js"));
    write("assets/app.js", "console.log(1)");
    write("assets/lazy.js", randomBytes(300 * KB).toString("hex"));

    expect(checkDist(dist).violations).toEqual([]);
  });

  it("counts modulepreloaded chunks as initial", () => {
    write(
      "index.html",
      `<html><head><link rel="modulepreload" crossorigin href="/assets/vendor.js"></head><body>${indexWith("/assets/app.js")}</body></html>`,
    );
    write("assets/app.js", "console.log(1)");
    write("assets/vendor.js", randomBytes(210 * KB).toString("hex"));

    expect(checkDist(dist).violations).toHaveLength(1);
  });

  it("fails when the fonts are over 120 KB", () => {
    write("index.html", indexWith("/assets/app.js"));
    write("assets/app.js", "console.log(1)");
    write("assets/a.woff2", randomBytes(70 * KB));
    write("assets/b.woff2", randomBytes(70 * KB));

    const { violations } = checkDist(dist);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/fonts/);
  });

  it("fails when index.html is missing", () => {
    expect(() => checkDist(dist)).toThrow(/index\.html/);
  });
});
