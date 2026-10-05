# quits
Split trip expenses with friends: an open, offline-first Splitwise for holidays.

`SPEC.md` is the source of truth; `AGENTS.md` has the working rules.

## Develop

Node 24 (`nvm use`), then:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run check` | everything CI runs: typecheck, tests, build, performance budget, Playwright |
| `npm test` / `npm run test:worker` | Vitest for `domain/`, scripts and tokens / the Worker in workerd |
| `npm run build` then `npm run budget` | production build, then the size budget on `dist` |
| `npm run test:e2e` | Playwright smoke and axe checks against `wrangler dev --local` (build first; `npx playwright install chromium` once) |
