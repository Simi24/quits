import { spawn } from "node:child_process";

/** Writes the `CREATOR_CODES` Worker secret. The value goes through stdin, never through an argument. */
export function uploadSecret(json: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["wrangler", "secret", "put", "CREATOR_CODES"], { stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`wrangler secret put exited with ${code}`))));
    child.stdin.end(json);
  });
}
