import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const SCRIPT_SRC = /<script\b[^>]*\bsrc="([^"]+)"/g;
const MODULEPRELOAD_HREF = /<link\b(?=[^>]*\brel="modulepreload")[^>]*\bhref="([^"]+)"/g;

const matches = (html: string, pattern: RegExp) =>
  [...html.matchAll(pattern)].map((m) => m[1] as string);

/** Gzip size of every JS file the page loads up front: its scripts and modulepreloads. */
export const initialJsGzipBytes = (distDir: string): number => {
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const files = new Set([...matches(html, SCRIPT_SRC), ...matches(html, MODULEPRELOAD_HREF)]);
  let total = 0;
  for (const file of files) {
    total += gzipSync(readFileSync(join(distDir, file))).length;
  }
  return total;
};
