// The author's terminal script for creator codes (SPEC.md §4, §11.5): node scripts/creator-codes.ts add <label>
import { run } from "./creator-codes/run.ts";
import { defaultConfigDir } from "./creator-codes/store.ts";
import { uploadSecret } from "./creator-codes/upload.ts";

try {
  await run(process.argv.slice(2), { dir: defaultConfigDir(), upload: uploadSecret, print: console.log });
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
