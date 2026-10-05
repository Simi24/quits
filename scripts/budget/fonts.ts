import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const FONT_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf"]);

/** Raw bytes of every font file in dist (woff2 is already compressed). */
export const fontsBytes = (distDir: string): number => {
  let total = 0;
  for (const entry of readdirSync(distDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !FONT_EXTENSIONS.has(extname(entry.name))) continue;
    total += statSync(join(entry.parentPath, entry.name)).size;
  }
  return total;
};
