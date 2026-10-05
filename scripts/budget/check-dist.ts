import { existsSync } from "node:fs";
import { join } from "node:path";
import { fontsBytes } from "./fonts.ts";
import { initialJsGzipBytes } from "./initial-js.ts";
import { LIMITS } from "./limits.ts";

export interface BudgetResult {
  initialJsGzipBytes: number;
  fontsBytes: number;
  violations: string[];
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export const checkDist = (distDir: string): BudgetResult => {
  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error(`No index.html in ${distDir}: run the build first`);
  }
  const js = initialJsGzipBytes(distDir);
  const fonts = fontsBytes(distDir);
  const violations: string[] = [];
  if (js > LIMITS.initialJsGzipBytes) {
    violations.push(`initial JS is ${kb(js)} gzip, budget ${kb(LIMITS.initialJsGzipBytes)}`);
  }
  if (fonts > LIMITS.fontsBytes) {
    violations.push(`fonts are ${kb(fonts)}, budget ${kb(LIMITS.fontsBytes)}`);
  }
  return { initialJsGzipBytes: js, fontsBytes: fonts, violations };
};
