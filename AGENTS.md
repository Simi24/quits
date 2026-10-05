# AGENTS.md: Quits

## What this repo is

Quits (`quits.simonepetta.com`): splitting the shared costs of a trip among friends, offline-first, an open Splitwise for holidays. **`SPEC.md` is the source of truth and is authoritative for implementation.** Read the sections an issue names before writing code; do not re-derive decisions the spec already made. Where an issue and `SPEC.md` disagree, stop and say so in the PR; do not pick one. `SPEC.md` §17 group A (decisions that needed the author) was closed under the author's delegation on 2026-10-05: those decisions are tagged "(decided under delegation, 2026-10-05)" in the spec, bind like any other, and only the author may reverse them. If you meet a product question the spec does not answer, stop and ask the author; never fill it in. Group B items are fixed in the slice that needs them and written back into `SPEC.md` in the same PR. The domain glossary is `CONTEXT.md`: use its terms exactly in code, copy and docs, and avoid the synonyms it lists.

## Rules that are easy to break

- **The prototypes are the visual contract** (`docs/prototype/flussi.html`, `docs/prototype/grafici.html`, variant Scelta): build from them, with the changes in `SPEC.md` §7.6 and §8 (one receipt per day, conflict notice on open, readout row instead of floating tooltips). Their IT/EN dictionaries are the approved copy; reuse it verbatim.
- **Money is integers in minor units**, never floats. Splits, the leftover cent (largest remainder, ties by order of entry), balances and suggested settlements live only in `domain/` and must give the same result on every device.
- **The trip is a fold of its operations.** Never mutate or delete an operation; never reject a well-formed write; an edit carries the whole expense snapshot plus `baseOpId`. No per-field merge.
- **The token never appears in a URL path or query and never reaches a log.** It lives in the fragment (`/v/#<token>`), in IndexedDB, in the `Authorization` header and, on iOS only, in the bridge cookie. On the server it is stored only as a SHA-256 hash (the Directory Durable Object), never in an operation. The Worker logs only errors, without headers, IPs or operation contents.
- **The trip's identity is its `tripId`, not its token** (the token is only the key and can be regenerated). **Identity and outbox are per trip** (keyed by `tripId`): opening a second trip must never touch the first.
- **Server actions are not pushed**: create, regenerate link, delete and restore have their own online-only endpoints (`SPEC.md` §6.2); everything else goes through push. A rejected operation goes to the `rejected` store and is never retried.
- **Copy**: agents write functional IT/EN interface copy (warnings, hints, errors, empty states) in the prototypes' tone without approval; the privacy text needs the author's approval.
- **Dependencies**: only those listed in `SPEC.md` §9.2, versions pinned exactly. Any other one must be justified in `SPEC.md` first, in the same PR.
- **Not the author's default stack**: no Redux/RTK or any state library, no AWS, no FastAPI, no Terraform in this repo. Cloudflare Worker + one Durable Object per trip, TypeScript, React + Vite + Tailwind.
- **No AI slop** (`SPEC.md` §7.11): no Inter/Roboto/system fonts as a choice, no purple/blue gradients, no glassmorphism, no cards in cards, no generic soft shadows, no default shadcn look, no decorative emoji, no marketing copy. Before UI work, load the `frontend`, `design`, `frontend-design`, `design-taste-frontend` and `high-end-visual-design` skills.
- **Motion only with meaning**, always off under `prefers-reduced-motion`. Contrast AA in both themes; balances in words before colour; colour never the only cue in charts.
- Avoid in UI copy: em-dashes, uppercase eyebrow labels.

## Stack and conventions

- One `package.json`. `domain/` (pure TypeScript shared by app and Worker), `src/` (the React PWA), `worker/` (the Worker and the trip Durable Object).
- **Node 24 LTS** (`.nvmrc`, the single place the version lives). TypeScript strict; named exports (tool configs keep their required default export).
- Micro-files: many small, focused components and modules.
- English for code, comments, commits, docs and PRs; Italian for tickets. UI in Italian and English.
- `wrangler.jsonc` owns the Worker, the Durable Object migrations and the Custom Domain. Secrets are never committed.

## Testing

- **TDD**: red, then green, one behaviour at a time, at the seams below. No test against internals.
- **Seams**: `domain/` units with Vitest; the Worker and Durable Object with `@cloudflare/vitest-pool-workers`; the app in a real browser with Playwright, against the app served locally.
- No network and no credentials in tests.
- **Blocking gates** in CI (`SPEC.md` §12.1): axe (`@axe-core/playwright`) on the main screens in both themes, and the performance budget on `dist` (initial JS ≤ 200 KB gzip, fonts ≤ 120 KB).

## Git conventions (enforced by hooks)

- Branch: `<type>/<short-description>`; ralph-gh uses `ralph/issue-<N>-<slug>`, ASCII only.
- Commit message: `<type>: <gitmoji> <description>`, e.g. `feat: ✨ add the expense sheet`.
- **Never add a `Co-Authored-By` trailer**: the hook refuses it.
- Agents never push to `main`: open a PR.

## Critical paths (force the gate's deepest review tier)

| Path | Why |
|---|---|
| `domain/` splits, leftover cents, balances, fold | silently wrong money, or devices that disagree |
| `worker/` | production API, the trip log, the Directory (token hashes, retirement), token handling and logging rules |
| `wrangler.jsonc` | Custom Domain, Durable Object bindings and migrations (a bad migration can lose trips) |
| `.github/workflows/` | deploys to production and holds the Cloudflare token |
| the sync client and the service worker in `src/` | the outbox: a bug here loses offline writes |
| `scripts/creator-codes.ts` | writes the production Worker secret |
