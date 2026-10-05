import { resolve } from "node:path";
import { checkDist } from "./budget/check-dist.ts";

const distDir = resolve(process.argv[2] ?? "dist");
const result = checkDist(distDir);
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`initial JS: ${kb(result.initialJsGzipBytes)} gzip`);
console.log(`fonts: ${kb(result.fontsBytes)}`);

if (result.violations.length > 0) {
  for (const violation of result.violations) console.error(`budget exceeded: ${violation}`);
  process.exit(1);
}
console.log("budget ok");
