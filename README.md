# quits
Split trip expenses with friends: an open, offline-first Splitwise for holidays.

`SPEC.md` is the source of truth; `AGENTS.md` has the working rules.

## Develop

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Simi24/quits?quickstart=1)

**Dev container** (VS Code with the Dev Containers extension, or GitHub Codespaces): open the repo and accept "Reopen in Container". It builds `.devcontainer/` and `npm run check` works inside with no credentials.

- Ubuntu 24.04, Node 24 (must match `.nvmrc`; the setup fails if they drift), `gh`, Claude Code.
- `npm ci` and Playwright Chromium + WebKit with system dependencies, installed on first create.
- `node_modules` and the browsers live in named volumes (fast on macOS, Linux-built).
- Forwarded ports: 5173 (Vite dev, bound to 0.0.0.0 in the container), 8787 (`wrangler dev`, used by Playwright), 8976 (`wrangler login` callback).
- Deploys are manual only: run `npx wrangler login` (the browser callback uses port 8976), or set `CLOUDFLARE_API_TOKEN` as a Codespaces secret or in your local environment. No token is ever baked into the image; local dev and tests need none.

Without the container: Node 24 (`nvm use`), then:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run check` | everything CI runs: typecheck, tests, build, performance budget, Playwright |
| `npm test` / `npm run test:worker` | Vitest for `domain/`, scripts and tokens / the Worker in workerd |
| `npm run build` then `npm run budget` | production build, then the size budget on `dist` |
| `npm run test:e2e` | Playwright smoke and axe checks against `wrangler dev --local` (build first; `npx playwright install chromium` once) |
