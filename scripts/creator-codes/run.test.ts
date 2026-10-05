import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { labelOfCode } from "../../worker/creator-codes.ts";
import { run } from "./run.ts";

let dir: string;
let printed: string[];
let uploads: string[];
let uploadFails = false;

const deps = () => ({
  dir,
  print: (line: string) => printed.push(line),
  upload: async (json: string) => {
    if (uploadFails) throw new Error("no network");
    uploads.push(json);
  },
});
const file = () => readFileSync(join(dir, "creator-codes.json"), "utf8");
const codeFrom = (lines: string[]) => /q-[0-9A-Z]{20}/.exec(lines.join("\n"))?.[0] ?? "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "quits-codes-"));
  printed = [];
  uploads = [];
  uploadFails = false;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("creator-codes add", () => {
  it("makes a q- code of 20 Crockford base32 characters, shows it once and uploads only its hash", async () => {
    await run(["add", "marta"], deps());

    const code = codeFrom(printed);
    expect(code).toMatch(/^q-[0-9A-HJKMNP-TV-Z]{20}$/);
    expect(uploads).toHaveLength(1);
    for (const text of [file(), uploads[0]!]) {
      expect(text).not.toContain(code);
      expect(text).toContain("marta");
    }
    expect(await labelOfCode(code, uploads[0]!)).toBe("marta");
    expect(statSync(join(dir, "creator-codes.json")).mode & 0o777).toBe(0o600);
  });

  it("gives every person a different code and keeps the others when adding", async () => {
    await run(["add", "marta"], deps());
    const first = codeFrom(printed);
    printed.length = 0;
    await run(["add", "luca"], deps());
    const second = codeFrom(printed);

    expect(second).not.toBe(first);
    expect(await labelOfCode(first, uploads[1]!)).toBe("marta");
    expect(await labelOfCode(second, uploads[1]!)).toBe("luca");
  });

  it("refuses a label that is already taken", async () => {
    await run(["add", "marta"], deps());
    await expect(run(["add", "marta"], deps())).rejects.toThrow(/already a code labelled "marta"/);
    expect(uploads).toHaveLength(1);
  });

  it("keeps the code and the file when the upload fails, and sync retries it", async () => {
    uploadFails = true;
    await expect(run(["add", "marta"], deps())).rejects.toThrow(/saved locally.*sync/);
    const code = codeFrom(printed);
    expect(code).not.toBe("");

    uploadFails = false;
    await run(["sync"], deps());
    expect(await labelOfCode(code, uploads[0]!)).toBe("marta");
  });
});

describe("creator-codes revoke", () => {
  it("removes one person's code and uploads the rest", async () => {
    await run(["add", "marta"], deps());
    const marta = codeFrom(printed);
    printed.length = 0;
    await run(["add", "luca"], deps());
    const luca = codeFrom(printed);

    await run(["revoke", "marta"], deps());

    const latest = uploads.at(-1)!;
    expect(await labelOfCode(marta, latest)).toBeNull();
    expect(await labelOfCode(luca, latest)).toBe("luca");
    expect(file()).not.toContain("marta");
  });

  it("refuses an unknown label", async () => {
    await expect(run(["revoke", "nobody"], deps())).rejects.toThrow(/no code is labelled "nobody"/);
  });
});

describe("creator-codes list", () => {
  it("shows the labels only, and uploads nothing", async () => {
    await run(["add", "marta"], deps());
    const code = codeFrom(printed);
    printed.length = 0;
    uploads.length = 0;

    await run(["list"], deps());

    expect(printed).toEqual(["marta"]);
    expect(printed.join()).not.toContain(code);
    expect(uploads).toEqual([]);
  });

  it("says so when there are none", async () => {
    await run(["list"], deps());
    expect(printed).toEqual(["(no creator codes)"]);
  });
});

describe("creator-codes usage", () => {
  it("refuses an unknown command or a missing label", async () => {
    await expect(run(["frobnicate"], deps())).rejects.toThrow(/usage/);
    await expect(run(["add"], deps())).rejects.toThrow(/usage/);
  });
});
