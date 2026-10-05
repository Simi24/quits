# Offline-first sync for Quits: viable architectures

Research for issue [#3](https://github.com/Simi24/quits/issues/3), input to the "Stack e infrastruttura" ticket ([#7](https://github.com/Simi24/quits/issues/7)). Sources checked on 2026-10-03; prices and versions change, re-check before committing money or code.

## The problem in one paragraph

A trip has 2 to 15 members, a few hundred writes over its whole life, and phones that are offline for hours (roaming off, mountain huts, flights). Anyone can add, edit or delete an expense or record a settlement while offline; edits sync later. There are no accounts: a secret trip link plus "who are you?" from the member list. The app must show a **change history** anyway (map #1, decision 6). Low volume and small groups mean throughput is irrelevant; what matters is: never lose a write, make concurrent edits understandable, keep the code small, stay on free tiers.

## Key observation: the domain is an append-only operation log

Every user action is naturally an immutable operation: `ExpenseCreated`, `ExpenseEdited`, `ExpenseDeleted`, `ExpenseRestored`, `SettlementRecorded`, `SettlementDeleted`, `MemberAdded`... The current state (expenses, balances, simplified debts) is a pure fold over that log, and the required change history *is* the log. This shapes every option below:

- **Sync becomes trivial**: a client pushes the operations it has not sent yet and pulls the ones it has not seen. Operations are immutable and carry a client-generated id (`crypto.randomUUID()`), so pushes are idempotent and retries are safe.
- **Ordering**: the server assigns a per-trip, gap-free sequence number on receipt. Everyone folds the same log in the same order, so every phone converges to the same state. Local unsynced operations are folded on top of the confirmed log and re-applied after each pull (the "server reconciliation" / rebase pattern that Replicache and Zero productise, here done by hand in a few dozen lines).
- **Nothing is ever rejected or lost**: the server accepts every well-formed operation; conflicts are resolved by the fold, and the losing side is still visible in the history.

### What happens on concurrent edits (the cases the issue asks about)

Each `ExpenseEdited` carries the **full new expense** (amount, payers, split) plus `baseOpId`, the id of the version the editor started from.

| Case | Outcome with the log | Why |
|---|---|---|
| A and B both add expenses offline | Both appear | Different entity ids, no conflict. |
| A and B edit the same expense offline | The edit the server sequences last becomes current (whole-expense last-writer-wins); the other stays in history. Two edits sharing a `baseOpId` are a *detected* conflict, so the UI can flag "Anna and Bruno both edited this; showing Bruno's" with a one-tap "use Anna's" (which is just a new edit). | Replacing the whole expense keeps its invariants (payers sum to the amount, shares sum to the amount). |
| A deletes, B edits offline | Policy choice for the domain-modeling ticket. Recommended: **delete wins**, B's edit is kept in history and the expense can be restored (restore = new op). Alternative: edit-after-delete resurrects. Both are one `if` in the fold. | Tombstones, not physical deletes. |
| A and B record the same settlement twice | Both stand (they are different ops); the UI can warn on near-duplicates. | Idempotency only covers retries of the *same* op. |

**Why not field-level merge (CRDTs) for expenses**: CRDTs merge per field. If A changes the total from 90 to 120 and B, offline, changes the exact split of the old 90, a field-level merge yields total 120 with shares summing to 90: a valid CRDT state and an invalid expense. Splits are a cross-field invariant, so the unit of conflict should be the whole expense. CRDTs converge, they do not validate. ([Automerge docs on conflicts](https://automerge.org/docs/reference/documents/conflicts/) describe exactly this per-property resolution.)

## Browser side (common to every option)

| Concern | Finding | Consequence for Quits |
|---|---|---|
| Storage | IndexedDB everywhere. Since Safari 17 / iOS 17, an origin may use up to ~60% of disk in Safari and in Home Screen web apps ([WebKit, Aug 2023](https://webkit.org/blog/14403/updates-to-storage-policy/); [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). | Quota is a non-issue for a few hundred ops. |
| Safari 7-day cap | With tracking prevention on, Safari deletes **all script-writable storage** (IndexedDB, Cache API...) of a site after 7 days of browser use with no interaction. Home Screen web apps are exempt ([WebKit tracking prevention](https://webkit.org/tracking-prevention/)). | Treat the server as source of truth and local data as cache + outbox; push the outbox at every chance. Nudge iOS users to install to the Home Screen. |
| Persistent storage | `navigator.storage.persist()` exists in Chrome 55+, Firefox 57+, Safari 15.2+ ([MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json)); Safari and Chrome grant it silently by heuristics (e.g. installed web app), Firefox prompts ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). | Call it once after the user joins a trip; never rely on it. |
| Background Sync | `SyncManager` is Chromium-only; not in Safari or Firefox ([MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SyncManager.json), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)). | No sync while the app is closed on iPhones. Flush the outbox on app start, on `online`, on `visibilitychange` to visible, after each local write and on a timer while open. Do not trust `navigator.onLine`; just try the request. |
| Safari vs installed app | Storage of a Home Screen web app is separate from Safari's; at install time cookies are copied, local storage/IndexedDB are not ([Apple, WWDC23 "What's new in web apps"](https://developer.apple.com/videos/play/wwdc2023/10120/), stated for web apps generally and demonstrated on macOS). | A user who joined a trip in Safari starts with an empty installed app. Keep the trip secret recoverable (e.g. in a cookie, or re-open the link) and push the outbox before suggesting install. Verify on a real iPhone (PWA ticket). |
| Service worker | Needed only to serve the app shell offline (Cache API). A hand-written worker that precaches the Vite build is ~50 lines; `vite-plugin-pwa` (Workbox) is the dependency alternative. | Sync logic lives in the page, not in the service worker (no Background Sync on iOS anyway). |

## Option (a): PWA + IndexedDB outbox + AWS (Lambda + DynamoDB)

**Shape.** Client: IndexedDB stores `ops` (confirmed, with `seq`), `outbox` (pending), `meta` (`lastSeq`, member identity). Server: one Lambda (FastAPI via Mangum, or a plain handler) with two routes, `POST /trips/{id}/ops` (push a batch) and `GET /trips/{id}/ops?after=N` (pull). Polling for freshness (e.g. every 20 s while the app is visible); no WebSockets needed.

**DynamoDB model.** One table: `PK = TRIP#<id>`, `SK = OP#<seq zero-padded>` for ops, plus `SK = HEAD` holding the current `seq`, plus `SK = OPID#<uuid>` dedupe markers. Push = read `HEAD`, then one `TransactWriteItems` with `Update HEAD` conditioned on `seq = :old`, `Put OP#…` for each new op and `Put OPID#…` with `attribute_not_exists` ([condition expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html)). On `TransactionCanceledException`, re-read and retry (contention is negligible with 15 people). Transactions take up to 100 actions / 4 MB, are serializable against single-item writes and cost 2 writes per item ([transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)). Pull = `Query PK, SK > OP#N` with `ConsistentRead`. Why a counter and not timestamps: with timestamps, an op committed late with an earlier timestamp is skipped by a client that already pulled past it; a gap-free counter written under a condition cannot be skipped. Streams are not needed.

**Alternative conflict model on AWS: per-record LWW with versions.** Store the current expense item with a `version`; edits are conditional on `version = :expected`. Simple for online apps, poor offline: a write prepared hours ago fails, and the user who must resolve it is no longer looking at that expense. History would need a second table anyway. Not recommended.

**Cost.** Lambda: 1M requests + 400,000 GB-s per month in the free tier ([Lambda pricing](https://aws.amazon.com/lambda/pricing/)). DynamoDB: 25 GB storage and 25 WCU/25 RCU provisioned per month, per region; on-demand is $0.625 per million writes and $0.125 per million reads in us-east-1 ([DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/)). A Lambda **function URL** adds no cost over the invocation ([AWS docs](https://docs.aws.amazon.com/lambda/latest/dg/furls-http-invoke-decision.html)); API Gateway HTTP API is free only for 1M calls/month in the first 12 months ([API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/)). Function URLs have no custom domain: serving under `quits.simonepetta.com` needs CloudFront, API Gateway, or a Cloudflare proxy in front, i.e. one more moving part plus CORS if left cross-origin. Expected bill for Quits: ~0.

**Fit.** Matches the author's default stack, Terraform-native (`aws_lambda_function`, `aws_dynamodb_table`). Costs: the static frontend still needs hosting (S3 + CloudFront, or Cloudflare), and the API lives on a different provider from the DNS/frontend unless proxied. No push to other phones without API Gateway WebSockets (12-month free tier only); polling is fine at this scale.

## Option (b): Cloudflare Workers + Durable Objects (one object per trip)

**Shape.** A Worker serves the static app (Workers Static Assets) and routes `/api/trips/{id}/*` to the trip's Durable Object (`idFromName(tripId)`). The object owns a private SQLite database: `ops(seq INTEGER PRIMARY KEY AUTOINCREMENT, op_id TEXT UNIQUE, ...)`. Push = `INSERT OR IGNORE` in `transactionSync`; pull = `SELECT ... WHERE seq > ?`. The object is single-threaded with input/output gates, so ordering and idempotency need no counters, conditions or retries ([SQLite storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)). Optional live updates: members online at the same time hold a WebSocket accepted with the Hibernation API, so the object can broadcast new ops and is evicted from memory (no duration billed) while idle ([WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)). Polling alone also works.

**Cost.** Durable Objects are on the Workers Free plan since 2025-04-07, SQLite backend only ([changelog](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/)). Free per day: 100,000 requests, 13,000 GB-s, 5M rows read, 100,000 rows written, 5 GB stored in total; incoming WebSocket messages bill at 20:1; hibernating objects bill no duration ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). Workers Free: 100,000 requests/day, 10 ms CPU per invocation; static asset requests are free and unlimited ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Limits: 10 GB per object, unlimited objects, ~1,000 req/s per object ([DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)). Built-in 30-day point-in-time recovery per object ([SQLite storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)). Expected bill: 0.

**D1 instead of DOs.** D1 is one SQLite database per binding, free 5M rows read and 100,000 written per day, 10 databases of 500 MB each, single-threaded per database ([D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). It works with the same op-log schema (one shared `ops` table with `trip_id`), but gives no per-trip serialisation boundary or WebSocket fan-out; a DO per trip models "a trip" more directly.

**Fit.** Same origin for app and API under `quits.simonepetta.com` (no CORS, no proxy), the domain is already on Cloudflare, and the author already runs Workers + Static Assets and the Cloudflare Terraform provider for `simonepetta.com`. Costs: the backend is TypeScript, not FastAPI (Python Workers exist and list Durable Objects and FastAPI support, but the docs do not state a GA status: [Python Workers](https://developers.cloudflare.com/workers/languages/python/)); Durable Object classes and migrations are declared in `wrangler.jsonc` and deployed with Wrangler, so Terraform owns DNS/zone settings while Wrangler owns the Worker; departs from the default AWS stack.

## Option (c): local-first libraries and sync engines

Versions and dates from the npm registry (`registry.npmjs.org/<pkg>`) and GitHub on 2026-10-03.

| Library | License / server | Hosting it needs | Offline writes | Conflict model | Status (Oct 2026) | Fit for Quits |
|---|---|---|---|---|---|---|
| **Automerge** (+ automerge-repo) | MIT, all open source | Any relay/storage; ships WebSocket + IndexedDB adapters and a sample Node sync server ([repo](https://github.com/automerge/automerge-repo)). No official Durable Object or DynamoDB adapter found. | Yes | CRDT; concurrent writes to one property pick a deterministic winner, losers kept in `getConflicts()` ([docs](https://automerge.org/docs/reference/documents/conflicts/)) | `@automerge/automerge` 3.5.0 (2026-09-16); automerge-repo `latest` tag is 2.6.0-alpha.3 (2026-08-07); active | Works, but Rust/WASM bundle, per-field merge breaks split invariants, history grows forever; we would still write a relay. |
| **Yjs** | MIT | y-websocket server or other providers; y-indexeddb locally | Yes | CRDT (Y.Map per-key) | 13.6.33 (2026-09-23), v14 in pre-release; active | Built for text co-editing; relational expenses as Y.Maps is awkward; same invariant problem. |
| **Replicache** | Open-sourced and free ([replicache.dev](https://replicache.dev/)) | Your own push/pull endpoints (fits Lambda or Workers) | Yes (local mutation queue) | Server-authoritative; client mutators replayed/rebased | **Maintenance mode**, no new features, "migrate to Zero" ([replicache.dev](https://replicache.dev/)); last npm release 15.3.0 (2025-07-02) | The right *pattern*, but adopting a frozen library to save ~200 lines is a bad trade. |
| **Zero** (Rocicorp) | Apache-2.0 | Postgres + stateful `zero-cache` server ([deployment](https://zero.rocicorp.dev/docs/deployment)) | **No**: "Zero does not support offline writes", writes are rejected while disconnected ([docs](https://zero.rocicorp.dev/docs/offline)) | Server-authoritative mutators | 1.9.0 (2026-08-14), GA | Disqualified (offline writes, Postgres, always-on server). |
| **Electric** | Apache-2.0; now marketed at [electric.ax](https://electric.ax/) | Postgres with logical replication, or Electric Cloud (PAYG, usage under $5/month waived: [pricing](https://electric.ax/pricing)) | **No**: "Electric does read-path sync... does not do write-path sync" ([writes guide](https://electric.ax/docs/sync/guides/writes)) | None built in | `@electric-sql/client` 1.5.28 (2026-09-09) | Disqualified (no write path, Postgres). |
| **PowerSync** | Client SDKs Apache-2.0; service FSL-1.1 (source-available) | Postgres/MongoDB (MySQL, SQL Server beta) + your write endpoint; no DynamoDB ([overview](https://docs.powersync.com/intro/powersync-overview)) | Yes (upload queue) | You implement it in your backend | `@powersync/web` 2.4.2 (2026-10-01); GA | Free plan: 2 GB synced, 50 concurrent clients, but "free projects are deactivated after 1 week of inactivity" ([pricing](https://www.powersync.com/pricing)): bad for an app used a few weeks a year. Needs a SQL DB. |
| **Triplit** | AGPL-3.0 | Self-hosted server (Durable Objects storage supported per README) | Yes | Per-property, timestamp-based | Team joined Supabase on 2025-10-08; Triplit not integrated, to be "further open-sourced" ([Supabase](https://supabase.com/blog/triplit-joins-supabase)); last npm release 2025-07-31 | Effectively dormant: avoid. |
| **Jazz** | MIT | Jazz Cloud (free: 1 GB RAM instance, 1 GB/month storage) or self-host ([jazz.tools](https://jazz.tools/)) | Yes | Classic: CRDT CoValues; v2 unverified | v2 is **alpha** (v2.0.0-alpha.58, 2026-09-30); npm `latest` still classic 0.20.19 | Too immature, API in flux. |
| **LiveStore** | Apache-2.0 | Sync backend: Cloudflare Workers/Durable Objects, Electric, S2 or custom ([syncing](https://docs.livestore.dev/building-with-livestore/syncing/)) | Yes | **Event log**: backend imposes a global total order, clients rebase pending events (the model recommended here) | 0.4.0 (2026-06-02), pre-1.0, docs partly "TODO" | Closest conceptual match and runs on DOs, but pre-1.0 plus SQLite-WASM client. Worth watching, not betting on. |
| **Dexie.js** / **Dexie Cloud** | Dexie.js and addon Apache-2.0; Cloud service proprietary (self-host licence from €3,495) | Dexie Cloud SaaS ([pricing](https://dexie.org/cloud/pricing)) | Yes | Cloud: server-authoritative or CRDT options | Dexie 4.4.6 (2026-09-10); active | Cloud free tier: 3 production seats, other users get a 30-active-day evaluation then offline-only, all authenticated: incompatible with "no accounts". **Dexie.js alone** is a reasonable IndexedDB wrapper if raw IndexedDB proves painful. |
| TinyBase / RxDB | MIT / Apache-2.0 core (some RxDB plugins paid) | Custom sync endpoints or their synchronizers | Yes | CRDT-ish / custom handler | 10.0.1 (2026-09-24) / 17.5.0 (2026-08-20) | Not verified in depth; both add a large abstraction for a ~5-entity domain. |

**Takeaway.** The engines that need Postgres or an always-on server (Zero, Electric, PowerSync) fail the "near-zero, serverless, offline writes" constraints; Zero and Electric do not even do offline writes. The CRDT libraries (Automerge, Yjs) solve a harder problem (concurrent text editing) and solve the wrong one for expenses (per-field merge). The two that model what Quits needs, Replicache (server reconciliation) and LiveStore (event log + rebase), are respectively frozen and pre-1.0. The pattern they share is small enough to own.

## Comparison

| | (a) AWS: Lambda + DynamoDB, own op log | (b) Cloudflare: Worker + DO per trip, own op log | (c) Sync library |
|---|---|---|---|
| Conflict model | Append-only op log, server sequence, whole-expense LWW with detected conflicts | Same | Library-defined (CRDT per field, or server rebase) |
| Edit vs edit offline | Both kept; last sequenced is current; flagged | Same | CRDT: per-field winner, may break split invariants |
| Delete vs edit | Explicit policy in the fold (delete wins + restore) | Same | CRDT: depends on structure (map key delete vs nested edit) |
| Ordering / idempotency | `HEAD` counter + `TransactWriteItems` with conditions, retry on conflict | Free: single-threaded object, `AUTOINCREMENT` + `UNIQUE(op_id)` | Built in |
| Live updates | Polling (WebSockets via API Gateway are free only 12 months) | Polling, or hibernating WebSockets at ~0 cost | Built in |
| Same origin as app | No: function URL has no custom domain; needs CloudFront/API Gateway/proxy + CORS | Yes: Worker serves assets and `/api` | Depends on host |
| New runtime deps | None server-side beyond FastAPI/Mangum (or none with a plain handler) | None (Workers runtime) | One library, often WASM; some need Postgres |
| IaC | Terraform end to end | Terraform for DNS; Wrangler for Worker + DO migrations | Varies, often SaaS |
| Free-tier cost for Quits | ~0 (Lambda + DynamoDB always-free allowances) | 0 (Workers Free + DO Free) | 0 to blocked (Dexie Cloud seats, PowerSync inactivity) |
| Backend language | Python (author's default) | TypeScript (Python Workers exist, GA status not stated) | Mostly TS |
| Maturity risk | Low (boring AWS primitives) | Low (SQLite-backed DOs on the free plan since 2025-04-07) | Medium to high (see table above) |

The client side is **identical** for (a) and (b): IndexedDB with `ops`, `outbox` and `meta`; a pure `fold(ops) -> TripState`; a `sync()` that pushes the outbox then pulls `after=lastSeq`. Only two HTTP endpoints differ, so the backend choice stays cheap to reverse.

## Recommendation (input for #7, not a decision)

**Recommended: own append-only operation log, client in IndexedDB, one Cloudflare Durable Object per trip (option b).**

- The domain *is* an event log, the change history is a requirement anyway, and an op log makes offline sync a push/pull of immutable, idempotent records with no rejected writes.
- A Durable Object per trip gives ordering and idempotency for free (single-threaded SQLite), same-origin hosting with the static app on `quits.simonepetta.com`, optional live updates via hibernating WebSockets, 30-day point-in-time recovery, and a 0 bill on Workers Free. The author already runs Workers + Static Assets on this zone.
- No sync library: the pattern (outbox, server sequence, rebase pending ops on pull) is ~200 lines the author can read end to end. Raw IndexedDB with a thin helper; Dexie.js only if that proves painful.
- Costs to accept: backend in TypeScript instead of FastAPI; Wrangler (not Terraform) owns the Worker and DO migrations.

**Runner-up: the same op log on AWS (option a)**, Lambda (FastAPI + Mangum, or a plain handler) + DynamoDB with a per-trip `HEAD` counter and conditional `TransactWriteItems`. Pick it if staying on the default stack and Python outweighs: a second provider for the API, a front door for the custom domain (CloudFront/API Gateway or a Cloudflare proxy), and slightly more code for sequencing.

**Not recommended now**: Zero and Electric (no offline writes), PowerSync (Postgres, free projects deactivated after a week idle), Dexie Cloud (authenticated seats), Triplit (dormant), Jazz v2 (alpha), Automerge/Yjs (WASM or text-oriented CRDTs whose per-field merge fights the split invariants). LiveStore is the one to revisit if it reaches 1.0.

**Open questions this hands to other tickets**

- *Domain model*: operations as the source of truth (event names, payload = full expense snapshot + `baseOpId`), delete-vs-edit policy, how a detected concurrent edit is shown, integer minor units for amounts, client-generated ids.
- *Stack (#7)*: Cloudflare (TS) vs AWS (Python) for the two sync endpoints; who owns the `quits` DNS record; whether live updates (WebSockets) are wanted or polling suffices.
- *PWA*: separate storage between Safari and the installed app on iOS (how the trip link survives install), 7-day eviction outside the Home Screen, no Background Sync on iOS (sync only while open). Verify on a real iPhone.
- *Data retention / leaked link*: the op log is append-only; deleting a trip means deleting its object/partition, not individual ops.
