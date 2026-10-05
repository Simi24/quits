import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { extname, join, normalize } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

export interface DistServer {
  url: string;
  /** From now on `sw.js` differs from the build the page installed: the browser sees a new build. */
  publishNewBuild: () => void;
  close: () => Promise<void>;
}

/** The built app, served on its own port, so a test can ship "a new build" without touching `dist/` or the shared dev server. */
export async function serveDist(distDir = join(process.cwd(), "dist")): Promise<DistServer> {
  let newBuild = false;
  const server: Server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(distDir, path);
    try {
      if (!statSync(file).isFile()) throw new Error("not a file");
    } catch {
      file = join(distDir, "index.html");
    }
    let body = readFileSync(file);
    if (path === "/sw.js" && newBuild) body = Buffer.concat([body, Buffer.from("\n// a newer build\n")]);
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return {
    url: `http://localhost:${port}`,
    publishNewBuild: () => {
      newBuild = true;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
