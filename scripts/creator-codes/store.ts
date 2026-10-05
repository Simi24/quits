import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { creatorCodesSchema } from "../../worker/creator-codes.ts";
import type { CreatorCodeEntry } from "../../worker/creator-codes.ts";

/** Outside the repository: the labels are friends' names (SPEC.md §4). */
export const defaultConfigDir = () => process.env.QUITS_CONFIG_DIR ?? join(homedir(), ".config", "quits");

const fileOf = (dir: string) => join(dir, "creator-codes.json");

/** The source of truth: labels and hashes, never a code. */
export function loadEntries(dir: string): CreatorCodeEntry[] {
  try {
    return creatorCodesSchema.parse(JSON.parse(readFileSync(fileOf(dir), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function saveEntries(dir: string, entries: CreatorCodeEntry[]) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(fileOf(dir), `${JSON.stringify(entries, null, 2)}\n`, { mode: 0o600 });
  chmodSync(fileOf(dir), 0o600);
}
