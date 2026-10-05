# Quits: Specification

This document describes, end to end, how Quits (`quits.simonepetta.com`) is built: purpose, scope, domain model, access, offline sync, API, interface, charts, stack, privacy, infrastructure, quality and the build plan.

**No decision in this document is new.** Every section summarizes and links the ticket that made the decision. Tickets are GitHub issues in this repository, written in Italian; the wayfinding map that indexes them is [issue #1](https://github.com/Simi24/quits/issues/1). A ticket's decision is its resolution comment ("Risoluzione"); later comments may amend it. **For implementation, this document is authoritative**: an implementer never needs to open a ticket. Where tickets disagreed, the later resolution won; every such case is listed in [§16.2 Reconciliations](#162-reconciliations). What no ticket decided is listed in [§17 Open gaps](#17-open-gaps), never filled in silently. If a conflict with a ticket is found, open an issue and fix this document; do not guess.

The glossary is [`CONTEXT.md`](CONTEXT.md); this document uses its terms exactly (Trip, Trip link, Creator code, Creator, Participant, Trip currency, Default split, Expense, Payer, Split, Category, Share, Refund, Settlement, Balance, Suggested settlements, Leftover cent, Operation, History, Conflict, Merge).

**The prototypes are the visual contract.** Build the interface from them, not from the prose summaries here; where this document explicitly changes a prototype (the author's reactions in [#9](https://github.com/Simi24/quits/issues/9) and [#10](https://github.com/Simi24/quits/issues/10)), this document wins. Assets in this repository:

| Path | What | Ticket |
|---|---|---|
| [`docs/prototype/flussi.html`](docs/prototype/flussi.html) | Main flows, three variants, IT/EN, light/dark. Single file, open in a browser. | [#9](https://github.com/Simi24/quits/issues/9) |
| [`docs/prototype/grafici.html`](docs/prototype/grafici.html) | The Grafici tab, variant **Scelta** (the chosen look). | [#10](https://github.com/Simi24/quits/issues/10) |
| [`prototypes/pwa/`](prototypes/pwa/) | Throw-away PWA diagnostic stub (Vite + `vite-plugin-pwa` + `idb`), with [`CHECKLIST.md`](prototypes/pwa/CHECKLIST.md) and [`RESULTS-android.md`](prototypes/pwa/RESULTS-android.md). | [#11](https://github.com/Simi24/quits/issues/11) |
| [`docs/research/splitwise-inventory.md`](docs/research/splitwise-inventory.md) | How Splitwise behaves, free vs Pro. | [#2](https://github.com/Simi24/quits/issues/2) |
| [`docs/research/offline-sync.md`](docs/research/offline-sync.md) | Offline-first architectures compared; the op-log design. | [#3](https://github.com/Simi24/quits/issues/3) |

In the prototypes, ignore the prototype control panel (variant, "Vai a", "Simula offline", "Oggi", textures switch, screen width, library notes): it is scaffolding, not product.

---

## 1. Purpose and principles

### 1.1 Why Quits exists
([map](https://github.com/Simi24/quits/issues/1)) To use with friends on holiday instead of Splitwise, **without the limits of Splitwise's free version** (today 4 expenses per day plus ads, [#2](https://github.com/Simi24/quits/issues/2)). It is needed **soon**: it is built in parallel with simonepetta.com v1/v2, not after. There is no separate MVP: this document covers the complete app, and urgency only decides the **order** of the vertical slices ([§15](#15-build-plan)).

### 1.2 Standing constraints
From the opening grilling ([map](https://github.com/Simi24/quits/issues/1)):
1. **Separate repository** from `simonepetta.com`, on the subdomain `quits.simonepetta.com`. Quits does not inherit that site's constraints (static, no React, one dynamic endpoint).
2. **Public**: a public landing, linked from simonepetta.com. Creating a trip requires a creator code; friends join from the trip link.
3. **The Trip is the only unit**: no permanent groups, no 1:1 expenses outside a trip.
4. **Identity without accounts**: secret trip link plus "chi sei?" from a list of names (the Tricount model).
5. **Fully offline**: expenses are added without network and synced later. This shapes the architecture.
6. **One currency per trip**, chosen at creation, no conversion.
7. **Languages: Italian and English**, from the browser language with a selector. Trip contents are never translated. Code, comments and documentation in English; map and tickets in Italian.
8. **No AI slop** (the author's firm preference, [#4](https://github.com/Simi24/quits/issues/4)): see [§7.11](#711-banned).

### 1.3 Who does what
Implementation is done by agents (ralph-gh, [#7](https://github.com/Simi24/quits/issues/7)). Always the author's: approving copy that is not already in the prototypes (the privacy text explicitly, [#12](https://github.com/Simi24/quits/issues/12)), the one-time manual steps ([§11.8](#118-one-time-manual-steps-human)), the Terraform `apply` in the simonepetta.com repo ([§11.6](#116-contact-and-email-routing)), and the real-phone acceptance tests ([§15](#15-build-plan), S11).

---

## 2. Scope

### 2.1 In
Everything in [§3](#3-domain-model) to [§8](#8-charts). In short ([map](https://github.com/Simi24/quits/issues/1), [#5](https://github.com/Simi24/quits/issues/5)): add, edit, delete and restore expenses; several payers per expense; split equally (also among a subset), by exact amounts, by percentages, by shares; refunds; balances and suggested settlements; settlements (also partial) and "Registra tutti i pagamenti suggeriti"; the history of every change; offline conflicts; categories (standard and per trip); the Pro features Splitwise charges for: unlimited expenses, no ads, default split, totals screen, local search (offline too), CSV export and JSON backup of the operations, and eight charts.

### 2.2 Later (fog: not built, not specified)
From the map's "Not yet specified" and the fog of [#5](https://github.com/Simi24/quits/issues/5) and [#6](https://github.com/Simi24/quits/issues/6):
- Real-time updates (WebSocket with hibernation on the Durable Object), only if ~30 s polling is not enough.
- Trip creation open to anyone (Turnstile + per-device limit), only if needed.
- Comments and notes on expenses; itemized split; receipt photos and later scanning (storage, offline, privacy); comparing trips (no accounts, only those opened on the phone); "chi paga la prossima"; payment links (Satispay/Revolut/PayPal) at settle-up.

### 2.3 Out of scope
([map](https://github.com/Simi24/quits/issues/1), [#5](https://github.com/Simi24/quits/issues/5)) Email or push notifications; 1:1 expenses outside a trip; permanent groups; currency conversion; import from Splitwise; payments inside the app; the **adjustment** split method.

---

## 3. Domain model

([#5](https://github.com/Simi24/quits/issues/5), inputs from [#2](https://github.com/Simi24/quits/issues/2) and [#3](https://github.com/Simi24/quits/issues/3); glossary [`CONTEXT.md`](CONTEXT.md)). All of it lives in `domain/` as pure TypeScript shared by the app and the Worker ([#7](https://github.com/Simi24/quits/issues/7)), and is the most tested part of the code. The arithmetic below matches the prototype's working code (`alloc`, `sharesOf`, `balances`, `suggest` in [`docs/prototype/flussi.html`](docs/prototype/flussi.html)), whose numbers the author approved.

### 3.1 The trip is a fold of its operations
The domain is an append-only operation log ([#3](https://github.com/Simi24/quits/issues/3)): every action is an immutable **Operation** with a client-generated id. The trip state, balances, suggested settlements, totals and charts are a **pure fold** of the log; the History *is* the log. Nothing is ever erased.

### 3.2 Trip and lifecycle
- **Fields at creation**: name; trip currency; first participants (the creator's own name first, shown as "(tu)"; at least two participants, from the approved prototype: "Servono almeno due partecipanti."); dates from/to (optional, informative); default split (optional: "Tutti uguali" or "Per quote", default equal).
- **States**: **Open** and **Closed**. Closed is read-only and can be reopened by anyone with the link. A trip can be closed with open balances, after a warning ("N persone non sono pari. Puoi chiuderlo lo stesso."). There is no "archived" state: closed trips sit at the bottom of the list.
- **Currency** can change only while the trip has no expenses.
- **Delete**: anyone, with confirmation ("Sì, elimina per tutti"); it disappears for everyone and is restorable for **30 days**, then deleted for good ([#6](https://github.com/Simi24/quits/issues/6)). Server side: soft delete, then purge ([#7](https://github.com/Simi24/quits/issues/7)).
- Closed trips are kept **forever** until someone deletes them; no automatic deletion ([#12](https://github.com/Simi24/quits/issues/12)).

### 3.3 Participants
- A participant is only a **name inside one trip**; there are no accounts. A participant may stand for one person or for a unit that pays together: a couple is **one participant** ("Giulia e Marco") with 2 shares in the default split; both people pick that name in "chi sei?". Who wants separate balances creates two participants ([#9](https://github.com/Simi24/quits/issues/9)).
- **Add** at any time (a new participant gets 1 share in a by-shares default split, as in the prototype). **Rename** always. **Remove** only if the participant appears in no expense and no settlement ([#5](https://github.com/Simi24/quits/issues/5)).
- **Merge** folds one participant into another, for duplicates created offline ([#5](https://github.com/Simi24/quits/issues/5)). Its detailed semantics are an open gap ([G-A5](#17-open-gaps)).
- **Order of entry** (used for tie-breaks) is the order in which participants entered the folded log: the creation's list first, then participant-added operations.

### 3.4 Money
- Amounts are **integers in the currency's minor unit** (ISO 4217: cents for EUR, 0 decimals for JPY) ([#5](https://github.com/Simi24/quits/issues/5)). The number of minor digits comes from `Intl.NumberFormat(..., { style: "currency", currency }).resolvedOptions().maximumFractionDigits`, as in the prototype.
- Formatting always through `Intl` with the trip currency and the UI locale (`it-IT` / `en-GB` in the prototypes); amounts use tabular figures.

### 3.5 Expense
- **Required**: description, amount (> 0 as entered), payers, split. **Expense date**: default today, editable, distinct from the time of entry. **Category**: optional, default **Other** ([#5](https://github.com/Simi24/quits/issues/5)).
- **Payers**: one or more, each with the exact amount paid; the payers sum to the amount. Default: one payer, the participant using the device.
- The **split method and its inputs are stored**, not only the resulting amounts (Splitwise loses them, [#2](https://github.com/Simi24/quits/issues/2)); shares are always derived.
- A new expense is **prefilled with the default split** ("Precompilata con la divisione predefinita del viaggio."); any expense can override it.

### 3.6 Split methods and validation
Four methods ([#5](https://github.com/Simi24/quits/issues/5)); the sheet shows each person's resulting share live ([`flussi.html`](docs/prototype/flussi.html), `evalDraft`). An expense that fails validation **is not saved**.

| Method | Inputs | Valid when | Message (IT) |
|---|---|---|---|
| Equal ("Uguale") | the subset of participants included (default everyone) | at least one person | "Scegli almeno una persona." |
| Exact amounts ("Importi") | an amount per person (minor units, > 0 entries) | the amounts sum to the expense amount | "Mancano X da assegnare." / "Hai assegnato X di troppo." |
| Percentages ("Percentuali") | a percentage per person, up to two decimals | they sum to exactly 100 (weights `round(p × 100)` sum to 10000) | "Le percentuali fanno P%: devono fare 100%." |
| Shares ("Quote") | a non-negative integer per person (stepper) | at least one share in total | "Dai almeno una quota a qualcuno." |

Common validation: "Scrivi cosa avete pagato." (no description), "Inserisci un importo maggiore di zero.", payers "Ai paganti mancano X." / "I paganti superano il totale di X.". The full IT/EN messages are in the prototype dictionary.

### 3.7 Leftover cent: largest remainder
([#5](https://github.com/Simi24/quits/issues/5); deterministic so every device agrees, unlike Splitwise's random cent, [#2](https://github.com/Simi24/quits/issues/2).) For equal, percentage and share splits, with weights `w_i` (equal: 1 if included, else 0; shares: the shares; percentages: `round(p_i × 100)`), total `A = |amount|`, `W = Σ w_i`:
1. `floor_i = floor(A × w_i / W)`, `r_i = (A × w_i) mod W`.
2. `rem = A − Σ floor_i` minor units are left over.
3. Among participants with `w_i > 0`, sort by `r_i` descending, **ties by order of entry in the trip**; the first `rem` each get +1.
4. Shares carry the sign of the amount (refunds are negative).

Exact-amount splits have no remainder. The expense detail shows who got the extra unit ("+0,01" badge) and the note: "Avanza 1 centesimo: va a X." or "La divisione è esatta: non avanza nessun centesimo.", followed by the rule: "Regola fissa, uguale su ogni dispositivo: resto maggiore, a parità chi è entrato prima nel viaggio."

### 3.8 Refund
Money the trip receives back (e.g. a returned deposit): an **expense with its sign reversed**. Whoever received the money "pays" −X; it is split like an expense ([#5](https://github.com/Simi24/quits/issues/5)). In the sheet it is the "Rimborso" kind, entered as a positive amount and stored negative; payers become "Chi ha ricevuto i soldi"; the list shows a "Rimborso" tag and "ricevuto da X".

### 3.9 Settlement ("Pagamento")
Money one participant gives another: **from, to, amount, date**; partial amounts allowed; undone by deleting it; restorable from the history ([#5](https://github.com/Simi24/quits/issues/5)). From and to must differ ("Scegli due persone diverse."). If a live settlement with the same from, to, amount and date already exists, the sheet warns of a possible duplicate and still allows recording ("C'è già un pagamento uguale in questa data...").

### 3.10 Balances and suggested settlements
- **Balance** of a participant = Σ paid − Σ shares over live expenses, plus Σ settlements given − Σ settlements received. Positive means the trip owes them. Balances sum to zero.
- Quits **never shows who owes whom pair by pair**: only net balances and suggested settlements ([#5](https://github.com/Simi24/quits/issues/5)). Simplification is **always on**, no toggle.
- **Suggested settlements**, greedy and deterministic, at most N−1 payments ([#5](https://github.com/Simi24/quits/issues/5), algorithm from [#2](https://github.com/Simi24/quits/issues/2)): repeat while there is a creditor and a debtor: take the largest creditor and the largest debtor (ties by order of entry), suggest that the debtor pays the creditor `min(credit, |debt|)`, apply it, continue.
- **"Registra tutti i pagamenti suggeriti"** records every current suggestion as a settlement dated today.

### 3.11 Totals
([#5](https://github.com/Simi24/quits/issues/5), view approved in [#9](https://github.com/Simi24/quits/issues/9)) Trip total (Σ live expenses, refunds included as negatives); per day (total ÷ trip days, dates inclusive); per person per day (÷ heads, where **heads = Σ shares of the default split**, or the number of participants when the default split is equal: the couple counts 2, [#10](https://github.com/Simi24/quits/issues/10)); paid vs due per participant (expenses only); spend by category.

### 3.12 Categories
- **Standard**, translated IT/EN, each with a fixed emoji and colour: Alloggio / Accommodation 🏠 `pool`; Trasporti / Transport 🚗 `sun`; Ristoranti / Restaurants 🍝 `coral`; Spesa / Groceries 🛒 `leaf`; Attività / Activities 🤿 `sea`; Altro / Other 📦 `stone` ([#5](https://github.com/Simi24/quits/issues/5), [#4](https://github.com/Simi24/quits/issues/4), mapping from the prototypes).
- **Custom per trip**: name + emoji, never translated (prototype default emoji 🏷️ when left empty); anyone can create, rename, delete them. Deleting one moves its expenses to Other. Their colour is assigned stably from a hash of the category id over `pool, sun, coral, leaf, sea` (prototype: `h = 7; for each char: h = (h × 31 + code) >>> 0`), and they **always** carry a texture in charts ([#10](https://github.com/Simi24/quits/issues/10)).

### 3.13 Operations
Each operation is immutable and carries: a **client-generated id**, the **participant** who made it, an **anonymous device id** (never shown; for conflicts and odd cases, [#6](https://github.com/Simi24/quits/issues/6)), and the client **time**; the server adds the **sequence number** ([§5](#5-offline-and-sync)). The operation kinds follow from the glossary, [#5](https://github.com/Simi24/quits/issues/5), [#6](https://github.com/Simi24/quits/issues/6) and the history lines of the approved prototype:

| Area | Operations | Payload |
|---|---|---|
| Trip | created; closed; reopened; link regenerated; default split changed; currency changed (only while no expenses) | creation fields of §3.2; the new default split; the new currency |
| Participants | added; renamed; removed (only if unused); merged | name; old and new name; the merged pair |
| Expenses | created; edited; deleted; restored | **edited carries the full new expense snapshot** (description, amount, date, category, payers, split method and inputs) **plus `baseOpId`**, the operation it was based on ([#3](https://github.com/Simi24/quits/issues/3)) |
| Settlements | recorded; deleted; restored | from, to, amount, date |
| Categories | added; renamed; deleted | name, emoji |

The operation schemas are **zod** schemas in `domain/`, shared by the app and the Worker ([#7](https://github.com/Simi24/quits/issues/7)); the expense invariants of §3.5 and §3.6 are part of them. Exact field names are fixed by those schemas in S1 ([G-B1](#17-open-gaps)).

### 3.14 Conflicts and restore
([#5](https://github.com/Simi24/quits/issues/5), [#3](https://github.com/Simi24/quits/issues/3))
- **Edit vs edit**: two edits of the same expense with the same `baseOpId` are a **detected conflict**. The edit the server sequenced **last** wins **on the whole expense** (never a per-field merge: it would break "shares sum to the total"); the other version stays in the history and is restorable. The UI shows the conflict ([§7.6](#76-screens-and-flows)).
- **Delete vs edit**: **delete wins**, whatever the order; the expense can be restored.
- **Restore**: a deleted expense or settlement is restored by a new operation, from the history. Restoring an older version of an expense ("Ripristina questa versione", "Ripristina la mia versione") is a new edit carrying that version's snapshot.
- **Settlement recorded twice**: both stand (two valid operations); only the duplicate warning of §3.9 applies.

### 3.15 History
The trip's operations in order, **never erasable**; deleted expenses and settlements are restored from it ([#5](https://github.com/Simi24/quits/issues/5)). Each line: author avatar and name, what happened (prototype dictionary keys `h_*`), time; a "Ripristina" button on deletions that are still deleted. Each expense detail also lists its versions ("Modifiche") with what changed (description, amount, date, category, payers, split).

---

## 4. Access without accounts

([#6](https://github.com/Simi24/quits/issues/6) amended by [#12](https://github.com/Simi24/quits/issues/12))

- **Trip link**: `https://quits.simonepetta.com/v/#<token>`. The token is **128 random bits as base64url, 22 characters** (as in [`prototypes/pwa/src/ids.ts`](prototypes/pwa/src/ids.ts)); it is the trip's identifier and key at once. It lives in the **URL fragment**, which never reaches the server. The app sends it to the API **only in the `Authorization` header**. Pages are served with `Referrer-Policy: no-referrer`.
- **"Chi sei?"**: on first open, pick your name from the list or add yours ("Non sono nella lista" → "Aggiungimi"). The device remembers it **per trip** ([#11](https://github.com/Simi24/quits/issues/11)), and it must survive PWA installation on iOS ([§5.5](#55-boot-order-and-the-ios-cookie-bridge)). "Non sono io" changes it. There is **no protection against impersonation**: a pact of trust.
- **Creator codes**: creating a trip requires one. One code **per person**, with a label, revocable on its own; every trip remembers which code created it. Managed by the author with a **terminal script** (no admin page, no admin endpoint); stored on the server **only as hashes**, in a **Worker secret** holding a JSON of hashes and labels, written with `wrangler secret put` ([#7](https://github.com/Simi24/quits/issues/7)). A device enters the code once and remembers it. A creator has **no extra powers** inside a trip.
- **Regenerate link**: anyone in the trip. The old link dies immediately; whoever opens it sees "Il link è cambiato" / "Chiedi a qualcuno del viaggio il link nuovo..."; offline operations queued on that device are **not lost** and are sent when the new link is opened. (How the server tracks this is [G-A1](#17-open-gaps).)
- **Close / reopen**: anyone. **Delete**: anyone, with confirmation, restorable for 30 days ([§3.2](#32-trip-and-lifecycle)).
- **Landing** (`quits.simonepetta.com/`): public, playful, IT/EN; the list of trips **already opened on this device** (local only: the server keeps no lists), open trips first and closed at the bottom, plus deleted trips with "Ripristina" until their deadline; the field "Hai un codice da creatore?". A closed trip opens from its link read-only.

---

## 5. Offline and sync

([#3](https://github.com/Simi24/quits/issues/3) research, decided in [#7](https://github.com/Simi24/quits/issues/7) and [#11](https://github.com/Simi24/quits/issues/11))

### 5.1 Model
- The **server is the source of truth**; the phone is a cache plus an outbox ([#3](https://github.com/Simi24/quits/issues/3), [#11](https://github.com/Simi24/quits/issues/11)).
- Operations have a **client-generated id** (`crypto.randomUUID()`), so pushes are idempotent and retries safe. The server assigns a **per-trip, gap-free sequence number** on receipt; every device folds the same log in the same order and converges.
- Local unsynced operations are folded **on top of** the confirmed log and re-applied after each pull (rebase).
- The server **accepts every well-formed operation** (one that passes the shared zod schema): conflicts are resolved by the fold, never by rejecting writes.
- **No sync library**: the pattern is written in-house ([#3](https://github.com/Simi24/quits/issues/3), [#7](https://github.com/Simi24/quits/issues/7)).

### 5.2 Client storage (IndexedDB via `idb`)
- Per trip, keyed by token ([#11](https://github.com/Simi24/quits/issues/11): one shared slot lost data in the prototype): **confirmed operations** (with their sequence number), the **outbox** (pending operations), and **meta** (last sequence pulled, the chosen participant for "chi sei?").
- Per device: the anonymous device id, the remembered creator code, the list of trips opened on the device.
- **The token lives in IndexedDB**, never only in the cookie: the service worker cannot read cookies ([#11](https://github.com/Simi24/quits/issues/11)).
- `navigator.storage.persist()` is requested (after joining a trip) but never relied on: it was denied on the emulator; data safety is the Durable Object's job ([#11](https://github.com/Simi24/quits/issues/11)).

### 5.3 Sync triggers
Push the outbox, then pull operations after the last sequence: **on app open, on `online`, on `visibilitychange` to visible, after every local change, and every ~30 s while the app is open** ([#7](https://github.com/Simi24/quits/issues/7), [#11](https://github.com/Simi24/quits/issues/11)). Never trust `navigator.onLine`: just try the request ([#3](https://github.com/Simi24/quits/issues/3)). The trip bar shows the state: "Tutto salvato e sincronizzato", "Offline: N modifiche in attesa", "Offline: le modifiche restano su questo dispositivo".

### 5.4 Service worker and Background Sync
- The service worker precaches the app shell so the app loads offline after the first visit (`vite-plugin-pwa`, [#7](https://github.com/Simi24/quits/issues/7), [#11](https://github.com/Simi24/quits/issues/11)).
- **Sync also runs inside the service worker**, not only in the page: the push/pull code is shared so the service worker can run it. Where **Background Sync** exists (Chromium; verified on Android: it fires with the app and Chrome closed, 1-2 s after the network returns), register a sync tag after each local change; elsewhere (Safari, Firefox) sync only runs while the app is open, on the triggers of §5.3 ([#11](https://github.com/Simi24/quits/issues/11)). The service worker reads the token from IndexedDB and sends it in `Authorization`.

### 5.5 Boot order and the iOS cookie bridge
([#11](https://github.com/Simi24/quits/issues/11), logic proven in [`prototypes/pwa/src/boot.ts`](prototypes/pwa/src/boot.ts))
- On start, the app finds its trip in this order: **link fragment → IndexedDB → cookie bridge**. The manifest `start_url` is **`/v/?source=pwa`** (no fragment): the installed app starts without a token and looks it up.
- **Cookie bridge, for iOS only** (an installed iOS app receives Safari's cookies but not its IndexedDB): a first-party cookie with `Path=/v/`, `SameSite=Lax`, `Secure`, holding the token, the chosen name and the device id; on boot, if IndexedDB is empty and the cookie exists, restore from it and write IndexedDB. Accepted: the token travels in the `Cookie` header on the rare navigations to `/v/` not served by the service worker; the Worker never records headers. Known limit: Safari keeps script-written cookies for 7 days. On Android the bridge is not needed (browser and installed app share storage, verified) and does no harm.
- **On iOS the first open of the installed app needs network.**

### 5.6 Install UX
([#11](https://github.com/Simi24/quits/issues/11)) Android/Chromium: offer installation through `beforeinstallprompt`. iOS: show the instruction "Condividi → Aggiungi alla schermata Home", **only when the outbox is empty** (the installed iOS app cannot see Safari's queue). The empty-queue rule is not needed on Android (the queue survives installation, verified).

### 5.7 In-app browsers
When opened inside an in-app browser (Telegram, Instagram, sometimes WhatsApp; the prototype detects `FBAN|FBAV|Instagram|Line/|Telegram|WhatsApp` in the user agent), show a notice to open the link in Safari/Chrome ([#11](https://github.com/Simi24/quits/issues/11)).

### 5.8 Open or paste a trip link
A field **"Apri o incolla un link di viaggio"** inside the app, because a link opened after installation can end up in the browser on both Android and iOS ([#11](https://github.com/Simi24/quits/issues/11)). It accepts a full link or a bare token.

---

## 6. API and Durable Object

([#7](https://github.com/Simi24/quits/issues/7), shape from [#3](https://github.com/Simi24/quits/issues/3), token rules from [#6](https://github.com/Simi24/quits/issues/6) and [#12](https://github.com/Simi24/quits/issues/12))

### 6.1 Routing
**One Worker** serves the PWA's static files and the API on the same origin (no CORS). The API lives under `/api/`; every request names its trip **only** through `Authorization` (the token), never in the path or query, so paths carry no trip id ([§16.2](#162-reconciliations) R19). Each trip has **one Durable Object** (SQLite storage backend) holding its operation log, in the **EU jurisdiction** ([§11.3](#113-jurisdiction)).

### 6.2 Endpoints
The client depends only on two endpoints, so the backend choice stays reversible ([#3](https://github.com/Simi24/quits/issues/3), [#7](https://github.com/Simi24/quits/issues/7)):

| Endpoint | Request | Behaviour |
|---|---|---|
| **push** (`POST`) | a batch of operations from the outbox | each new operation id is appended with the next sequence number; an id already stored is ignored (idempotent retry); the response confirms the batch so the client can clear its outbox |
| **pull** (`GET`, with the last sequence the client has) | `after=<seq>` | returns the operations with sequence > `after`, in sequence order |

Endpoints for creating a trip, checking a creator code, regenerating the link and deleting/restoring a trip are not specified by any ticket ([G-A2](#17-open-gaps), [G-A3](#17-open-gaps)).

### 6.3 Ordering and idempotency
The Durable Object is single-threaded with input/output gates: push is an `INSERT OR IGNORE` inside `transactionSync`, pull a `SELECT ... WHERE seq > ?` ([#3](https://github.com/Simi24/quits/issues/3)). No counters, conditions or retries are needed.

### 6.4 Errors the client must tell apart
From the decided UX: a token that was **regenerated** ("Il link è cambiato"), a trip that is **deleted** (restorable for 30 days), a **malformed** operation (schema failure, see [G-A21](#17-open-gaps)), and the network being unreachable (the outbox simply waits). Status codes and bodies are [G-B1](#17-open-gaps).

### 6.5 Durable Object storage
- `ops`: `seq INTEGER PRIMARY KEY AUTOINCREMENT`, `op_id TEXT UNIQUE`, and the operation itself as validated JSON ([#3](https://github.com/Simi24/quits/issues/3)).
- Trip metadata: the creator code (label) that created the trip ([#6](https://github.com/Simi24/quits/issues/6)) and the soft-delete time ([#7](https://github.com/Simi24/quits/issues/7)).
- Classes and migrations are declared in `wrangler.jsonc` (SQLite-backed classes, `new_sqlite_classes`) and deployed by Wrangler ([#7](https://github.com/Simi24/quits/issues/7)).
- Backups: Durable Objects' built-in **30-day point-in-time recovery**, plus the JSON export ([#7](https://github.com/Simi24/quits/issues/7)).

---

## 7. Interface

### 7.1 Direction and contract
**"Cartolina d'estate"** ([#4](https://github.com/Simi24/quits/issues/4)): an identity entirely its own, unrelated to simonepetta.com, **playful** in tone. Warm, full colours on a paper background, rounded shapes. **Signature object: the receipt**: expenses are receipts with a zig-zag edge, the expense list is a roll of receipts, settlements are stamped tickets, being even is a stamped ticket. The object carries real data, it is not decoration. **Brand**: the "=" sign (two equal bars, "pari"), plus the wordmark "quits". Final look ([#9](https://github.com/Simi24/quits/issues/9)): **Ombrellone's palette** (coral leads; sun yellow and pool blue around it; peach paper by day, cocoa by night) **with Piscina's fonts**. This is variant **Scelta** in [`grafici.html`](docs/prototype/grafici.html). The variants "Piscina" and "Saluti da" are discarded.

### 7.2 Tokens
Copied from the prototypes (Ombrellone light/dark from [`flussi.html`](docs/prototype/flussi.html), font tuning from Piscina, chart tokens from [`grafici.html`](docs/prototype/grafici.html)). Both themes are designed, not inverted; text is WCAG AA ([#4](https://github.com/Simi24/quits/issues/4)).

```css
:root {
  color-scheme: light;
  --f-display: "Bagel Fat One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif;
  --f-text: "Onest", "Segoe UI", "Helvetica Neue", sans-serif;
  --d-wght: 400; --d-track: 0; --d-scale: .94; --d-opsz: normal;
  --desk: #F3DCCB; --paper: #FBEBDD; --paper-2: #F5DCC8; --receipt: #FFFAF4;
  --ink: #1E2638; --ink-2: #5E5A6A; --line: #E6CDB9;
  --lead: #F0644C; --lead-deep: #C2412C; --on-lead: #1E2638;
  --hi: #FFC53D; --on-hi: #1E2638;
  --coral: #F0644C; --sun: #FFC53D; --pool: #2EA3D6; --leaf: #6DB36B; --sea: #3CC0B0; --stone: #B7A79B;
  --pos: #0E7095; --neg: #B9402B; --stamp: #D9472F; --ticket: #FFE3A3;
  /* chart-only, derived */
  --tx: color-mix(in srgb, var(--ink) 52%, transparent);
  --future: color-mix(in srgb, var(--ink) 5%, transparent);
  --grid: var(--line);
}
/* dark: the same block under @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } } and under :root[data-theme="dark"] */
:root[data-theme="dark"] {
  color-scheme: dark;
  --desk: #1A1312; --paper: #241B1A; --paper-2: #2F2423; --receipt: #3A2D2B;
  --ink: #FCEBDD; --ink-2: #CDB7A9; --line: #4D3C39;
  --lead: #FF7A61; --lead-deep: #C4513C; --on-lead: #2A1512;
  --hi: #FFCC52; --on-hi: #2A1512;
  --coral: #FF7A61; --sun: #FFCC52; --pool: #5EC2EC; --leaf: #86C784; --sea: #5AD1C1; --stone: #9C8A80;
  --pos: #7FD3F5; --neg: #FF9A85; --stamp: #FF7A61; --ticket: #4A3826;
}
```

Roles: `--desk` page behind the app column; `--paper` app background; `--paper-2` segmented controls, chips, the "Sei X" chip; `--receipt` receipts and inputs; `--ink`/`--ink-2` text; `--line` rules and borders; `--lead` primary buttons and the FAB (with `--lead-deep` as the 3 px "press" shadow); `--hi` the current tab pill and the top bar of the "=" mark; `--pos`/`--neg` positive/negative balances; `--stamp` the PARI stamp; `--ticket` settlement tickets; `--coral…--stone` category and avatar colours (avatars cycle `coral, pool, sun, leaf, sea` by order of entry). Tokens are CSS custom properties consumed by Tailwind ([#7](https://github.com/Simi24/quits/issues/7)).

### 7.3 Typography and icons
- Display **Bagel Fat One** (weight 400, tracking 0, size scale .94); text **Onest** (400, 500, 600, 700) with **tabular figures (`tnum`) for amounts**. Bagel Fat One has no `tnum` and is never used for numbers that must align ([#9](https://github.com/Simi24/quits/issues/9)). Body 16 px, line-height 1.45 (prototype).
- Icons: **Phosphor** (fill/duotone) via `@phosphor-icons/react` ([#4](https://github.com/Simi24/quits/issues/4), [#7](https://github.com/Simi24/quits/issues/7)); the prototype's icon set is the reference.

### 7.4 Shapes and signature objects
From the prototype's shape rule: interactive controls are **pills**; inputs have a 14 px radius; sheets have 28 px top corners; **receipts have zig-zag edges and no radius** (the `.zz` CSS masks); tickets have side notches; chart postcards have a 16 px radius. The "=" mark: top bar `--hi`, bottom bar `--lead`; "open" (bars tilted) while a balance is not zero, it **closes** when the balance reaches zero.

### 7.5 Layout and navigation
([#4](https://github.com/Simi24/quits/issues/4)) Mobile first: one column; a **bottom tab bar** with **Spese, Saldi, Grafici, Viaggio** (icons receipt, scales, chart-bar, suitcase-rolling); a fixed **"+"** button (FAB) on Spese while the trip is open. Trip bar: back to the landing, trip name and dates, the "Sei X" chip (goes to Viaggio → identity), the sync line. On desktop: a centred column, charts wider ([§8.1](#81-layout)).

### 7.6 Screens and flows
All approved as prototyped ([#9](https://github.com/Simi24/quits/issues/9)) except where marked **changed**. Use the prototype's "Vai a" jumps to see each one.

1. **Landing**: wordmark with the large "=" and the tagline "Chi ha pagato cosa in vacanza, e come tornare pari."; IT/EN switch; "I tuoi viaggi su questo dispositivo" as tickets (name, open/closed badge, dates, participant count), help "Per entrare in un viaggio apri il link che ti hanno mandato."; deleted trips ("Eliminati", "Eliminato il D. Si può ripristinare fino al D.", "Ripristina"); "Hai un codice da creatore?" with code field, error "Questo codice non funziona...", then "Codice attivo su questo dispositivo." and "Crea un viaggio"; footer ([§13](#13-the-link-from-simonepettacom), [§10.2](#102-privacy-page)).
2. **Create trip**: name, currency, optional dates, participants (yours first, duplicates refused "Questo nome c'è già."), default split ("Tutti uguali" / "Per quote" with steppers); then **"Il viaggio è pronto"** with the link box, "Copia il link", "Apri il viaggio".
3. **"Chi sei?"**: wordmark, trip name, the list of names as pill buttons with avatars, "Non sono nella lista" → name field → "Aggiungimi".
4. **Spese**: summary receipt ("Spesi finora" / "La tua parte"); search field (local, matches description and category name; settlements hidden while searching) and the history button; the roll grouped by day, newest first, each day headed by its date and day total. **Changed: one receipt per day**, the day's expenses as rows of the same receipt, not one receipt per expense ([#9](https://github.com/Simi24/quits/issues/9)). Each row: category dot with emoji, description, conflict icon if any, "Rimborso" tag, "pagato da X" / "pagato da X e altri N" / "ricevuto da X", amount, "tua parte X" or "non ti riguarda". **Settlements stay stamped tickets** ("X ha dato a Y", "Pagamento"). Empty state "Ancora nessuna spesa." / "Tocca + per aggiungere la prima: il primo scontrino del viaggio."
5. **Expense sheet** (rises from the bottom): kind "Spesa"/"Rimborso"; description; big amount input with currency; date; category chips (scrolling row, standard then custom); payers as chips, or per-person amounts with "Hanno pagato in più persone" / "Ha pagato una persona sola"; split method segmented control with the per-person control (check, amount, percent, stepper), live result per person, the "+0,01" leftover marker, the leftover note; errors in the sheet footer; "Salva la spesa" / "Salva le modifiche".
6. **Expense detail**: the receipt (category, description, date, amount, payers with dotted leaders, split method with each share and its input, leftover note and rule), "Modifica" and "Elimina" (confirm: "Eliminare la spesa? Resta nella cronologia e si può ripristinare."; toast with "Annulla"), the versions list "Modifiche" with "Ripristina".
7. **Conflict**: an icon on the expense row and a notice in the detail ("Luca l'ha modificata mentre la modificavi tu. Vale la versione arrivata per ultima..."), both versions summarized, "Ripristina la mia versione" (or "Ripristina l'altra versione") and "Va bene così". **Changed: plus a notice when opening the trip if there are unseen conflicts** ([#9](https://github.com/Simi24/quits/issues/9)).
8. **Saldi**, two views in the same tab, **Saldi** and **Totali** ([#9](https://github.com/Simi24/quits/issues/9)):
   - *Saldi*: hero receipt in words first ("Ti devono 45 €" / "Devi 20 €" / "Sei pari"; colour only as reinforcement, [#4](https://github.com/Simi24/quits/issues/4)), small PARI stamp when everyone is even; a row per participant (avatar, name, "deve ricevere X" / "deve dare X" / "è pari", signed amount, the "=" mark); "Pagamenti suggeriti" with the help "Quits non mostra chi deve a chi: solo i saldi e i pochi pagamenti che li portano a zero.", one ticket per suggestion with "Registra" (opens the settlement sheet prefilled), "Registra tutti i pagamenti suggeriti", or the notice "Siete tutti pari"; "Registra un altro pagamento".
   - *Totali*: trip total, per day, per person per day; "Pagato e spettante" rows; "Per categoria" bars.
9. **Settlement sheet**: "Chi ha dato i soldi" / "A chi", amount (help "Anche una parte: il resto rimane nei pagamenti suggeriti."), date, duplicate warning, "Registra". **Settlement detail**: the ticket and "Elimina il pagamento" (toast with "Annulla").
10. **"Tutti pari"**: when a settlement brings every balance to zero, once: the PARI/EVEN stamp lands on a receipt with confetti, "Tutti pari!", "Nessuno deve più niente a nessuno.", "Bello".
11. **Grafici**: [§8](#8-charts).
12. **Viaggio** (settings): identity ("Su questo dispositivo", "Non sono io"); trip link with copy and "Rigenera il link" (confirm notice); participants (rename, remove only when unused, add; rule text "Si può togliere solo chi non compare..."); default split; categories (standard chips, custom list with rename/delete, add with emoji + name); currency (locked text when expenses exist); export ("CSV delle spese", "Backup JSON delle operazioni"); "Vedi la cronologia"; close/reopen (with the open-balances warning); delete (with "Sì, elimina per tutti").
13. **History** (overlay): help "Ogni modifica resta qui, non si cancella...", the list of §3.15.
14. **Closed trip**: the bar "Viaggio chiuso, sola lettura." with "Riapri"; no FAB, no edit, delete or record actions.
15. **Old link**: "Il link è cambiato" receipt and "Torna all'inizio".

### 7.7 Copy and languages
- The **IT/EN dictionaries in the two prototypes** (the `T` objects, minus the prototype-panel keys) are the approved interface copy ([#9](https://github.com/Simi24/quits/issues/9), [#10](https://github.com/Simi24/quits/issues/10)); reuse them verbatim. Settlement is "Pagamento" in Italian, Refund is "Rimborso" ([#5](https://github.com/Simi24/quits/issues/5)).
- **i18n without libraries**: a typed dictionary plus `Intl` (numbers, currency, dates, date ranges, lists) ([#7](https://github.com/Simi24/quits/issues/7)). Language from the browser, with a selector ([map](https://github.com/Simi24/quits/issues/1)). Trip contents (names, descriptions, custom categories) are never translated; standard categories are ([#5](https://github.com/Simi24/quits/issues/5)).
- As in the prototypes: no em-dashes in UI copy (date ranges use a hyphen), no uppercase eyebrow labels, no marketing copy ([#4](https://github.com/Simi24/quits/issues/4)).

### 7.8 Themes
Light and dark, **both designed** (the playful dark is drawn, not inverted), with a **system / light / dark** selector ([#4](https://github.com/Simi24/quits/issues/4)); `data-theme` on the root overrides `prefers-color-scheme`, exactly as in the prototypes. Placement of the selector is [G-A8](#17-open-gaps).

### 7.9 Motion
**Only with meaning**, and always off under `prefers-reduced-motion` ([#4](https://github.com/Simi24/quits/issues/4)); timings and curves are in the prototype CSS:
- the "add expense" sheet rises with a light bounce (`rise`, .55 s);
- the receipt "prints" on save (`print`, .9 s in 9 steps);
- the "=" closes when a balance reaches zero;
- when everyone is even, one short celebration: the PARI/EVEN stamp (`thunk`) and confetti once (~1.6 s, in the category colours);
- overlays push in (.32 s); toasts rise; charts: marks grow from the baseline and the line draws **only when the data changes**, never on scroll ([#10](https://github.com/Simi24/quits/issues/10)).

### 7.10 Accessibility
Contrast **WCAG AA** in both themes ([#4](https://github.com/Simi24/quits/issues/4)); balances in words before colour; visible focus (`:focus-visible` outline in `--ink`); dialogs with `aria-modal` and Escape to close; charts reachable by keyboard and with a table twin ([§8.4](#84-reading-values)); colour never the only cue ([§8.5](#85-colour-stack-order-textures)); `prefers-reduced-motion` respected; touch targets at least 44 px (prototype).

### 7.11 Banned
([#4](https://github.com/Simi24/quits/issues/4)) Inter, Roboto or system fonts as a design choice; Host Grotesk; purple/blue gradients; glassmorphism; cards inside cards; generic soft shadows; the "default shadcn" look; emoji as decoration (emoji appear only as category identity); marketing copy; template layouts. Before writing UI code, agents load the skills `frontend`, `design`, `frontend-design`, `design-taste-frontend`, `high-end-visual-design` ([map](https://github.com/Simi24/quits/issues/1)).

---

## 8. Charts

([#10](https://github.com/Simi24/quits/issues/10), contract [`docs/prototype/grafici.html`](docs/prototype/grafici.html), variant Scelta.) All charts are computed from the operations, offline too ([#5](https://github.com/Simi24/quits/issues/5)).

### 8.1 Layout
- On top, the filter **"Di chi"**: "Tutto il gruppo" (the **default**) or one participant. One rule: group charts become **"la parte di X"** (X's shares); charts that compare people **highlight X and dim the others**. A line under the chips states the scope.
- **In view**, each chart a receipt, in this order: (1) **Andamento** (hero, chart 4); (2) **Per categoria** (chart 1); (3) **Per giorno** with the **Totale / A testa** switch (charts 2 and 6); (4) **Le spese più grandi** (chart 7); (5) **Pagato e spettante** (chart 3).
- **One tap away**, as **postcards** with a stamp previewing the chart and a true sentence: **Persona per categoria** (chart 5) under Per categoria; **Chi ha fatto da banca** (chart 8) under Pagato e spettante. They open as overlays with the same filter.
- Every chart has **"Numeri"** (its table twin); axes start at zero; amounts with `Intl`. **Desktop**: the column widens to **760 px** and receipts go **two per row** (container ≥ 620 px), the hero spanning both.

### 8.2 The eight charts
1. **Per categoria**: horizontal bars sorted by amount, emoji + name + amount + share of total; the readout adds the number of expenses, per person per day, the biggest expense and refunds netted.
2. **Per giorno**: columns stacked by category in the fixed stack order, refunds below zero (the deposit returned on the last day), the average line ("media X"), the most expensive day labelled.
3. **Pagato e spettante**: per person, a bar of what they paid, a notch at what they were due, the difference coloured and **written in words** ("ha anticipato X per gli altri" / "ha pagato X meno della sua parte" / "ha pagato esattamente la sua parte"). **Expenses only**: settlements stay in Saldi.
4. **Andamento**: total so far, cumulative line, a **dashed projection** over the remaining days with the estimated total ("≈ X", rounded), "al giorno" and "a testa al giorno" underneath. **Pace: the last 3 days** (mean of the last min(3, N) day totals); projected total = total so far + pace × days remaining. Once the trip is over the projection disappears and the line "N giorni. Il più caro: D, X." remains.
5. **Persona per categoria**: a heat table, categories × participants, cells shaded from `--lead` (light to strong), with a totals row equal to each person's due.
6. **Costo a testa al giorno**: the "A testa" mode of chart 2, dividing by **heads = shares of the default split** (the couple counts 2); the legend shows each category's per-person-per-day average.
7. **Le spese più grandi**: a long receipt, top 5 with "Mostra tutte e N" (up to 10), refunds excluded; with a person filter, ranked by that person's share.
8. **Chi ha fatto da banca**: small multiples of each person's running balance over time on **one shared scale**, settlements included and marked as dots; the lede names who was the group's bank for most days and the peak.

### 8.3 Data rules
Stack order and legend order are fixed: **Spesa, Alloggio, Ristoranti, Attività, Trasporti, Altro**, then custom categories ([#10](https://github.com/Simi24/quits/issues/10)). "Today" is the trip day of the current date; days after it are shaded as future.

### 8.4 Reading values
**One responsive interface, not two UIs**: the input device changes how values are read, not the layout ([#10](https://github.com/Simi24/quits/issues/10)).
- **Touch** (`pointer: coarse`): no hover. **Tap** a mark to select it; its value appears in a **fixed readout row under the chart** (not a floating tooltip covered by the finger); on time charts **drag** to scrub; tap outside to deselect.
- **Mouse/trackpad** (`hover: hover`): the same readout row updates **on hover**; a click pins the selection.
- **Keyboard**: arrow keys move between marks, same readout row.
- The prototype's floating `.tip` is replaced by the readout row; its contents (title, value, rows, note) are the reference for what the row says.

### 8.5 Colour, stack order, textures
Colour is **never the only cue**: legend with emoji, 2 px gaps between stacked segments, the readout row, "Numeri". The fixed stack order raises the worst adjacent colour-blind ΔE from 1.5 to 10.4. **Custom categories always carry a texture** (their hash colour can repeat a standard one: in the prototype Aperitivi has Ristoranti's coral). Textures are the SVG patterns of the prototype (`tx-*`).

### 8.6 Library
**visx**, only `@visx/scale`, `@visx/shape`, `@visx/group`, `@visx/axis` (MIT, SVG primitives for React, colours stay CSS variables), **version pinned exactly** (latest release 4.0.0, 2026-06-11). **No `@visx/tooltip`**: value reading is ours (§8.4). Verify compatibility with the chosen React version at implementation; **if it fails, fall back to `d3-scale` + `d3-shape`, pinned, with hand-written SVG** as in the prototype ([#10](https://github.com/Simi24/quits/issues/10)). Scale and tick functions are tested with Vitest.

---

## 9. Stack and dependencies

### 9.1 Stack ([#7](https://github.com/Simi24/quits/issues/7))
- **Cloudflare**: one **Worker** (static assets of the PWA + API, same origin) and **one Durable Object per trip** (SQLite). Backend in **TypeScript**. This overrides the author's default AWS stack.
- **Frontend**: **React + Vite + TypeScript + Tailwind**. **No state library** (no Redux/RTK): state is the log in IndexedDB plus a pure function that folds it, exposed through a hook; UI state stays in components.
- **Sync**: HTTP push/pull ([§6](#6-api-and-durable-object)). WebSocket is in the fog.
- **Node 24 LTS** (the version lives only in `.nvmrc`), npm, lockfile committed. TypeScript strict.

### 9.2 Dependencies
Exactly these; **versions pinned exactly** at implementation time (no ranges). Any other dependency must be justified in this document first, in the same PR.

| Kind | Packages | Source |
|---|---|---|
| Runtime | `react`, `react-dom`, `idb`, `zod`, `@phosphor-icons/react`, `@visx/scale`, `@visx/shape`, `@visx/group`, `@visx/axis` (fallback: `d3-scale`, `d3-shape`) | [#7](https://github.com/Simi24/quits/issues/7), [#10](https://github.com/Simi24/quits/issues/10) |
| Build | `vite`, `vite-plugin-pwa`, `typescript`, `tailwindcss` and its Vite integration, the Vite React plugin | [#7](https://github.com/Simi24/quits/issues/7) (React/Vite/Tailwind companions implied, R20) |
| Dev / test | `wrangler`, `vitest`, `@cloudflare/vitest-pool-workers`, `@playwright/test` | [#7](https://github.com/Simi24/quits/issues/7) |

No i18n library, no chart library beyond the four visx packages, no sync or local-first library, no IndexedDB wrapper other than `idb`.

### 9.3 Repository layout
([#7](https://github.com/Simi24/quits/issues/7)) One `package.json`.
```
SPEC.md, AGENTS.md, CONTEXT.md, README.md, .nvmrc, package.json, wrangler.jsonc
domain/        pure TypeScript shared by app and Worker: operation schemas (zod), fold,
               splits, leftover cents, balances, suggested settlements, totals, chart models,
               conflicts. The most tested part.
src/           the React PWA (screens, components, sync client, IndexedDB, service worker, i18n, tokens)
worker/        the Worker (static assets + API) and the trip Durable Object
.github/workflows/  CI and deploy
docs/prototype/, docs/research/, prototypes/pwa/   the contract and the research (not built)
```

---

## 10. Privacy and data

([#12](https://github.com/Simi24/quits/issues/12))

### 10.1 Data rules
- **Retention**: trips, closed ones included, are kept until someone in the trip deletes them; deleted trips are restorable for 30 days, then deleted for good. No automatic deletion.
- **Token out of URLs**: the fragment never reaches the server; the API gets the token only in `Authorization` (the iOS cookie bridge exception is in [§5.5](#55-boot-order-and-the-ios-cookie-bridge)).
- **Logs**: our code records **no IP and no token**; Worker logs only for errors, **without headers and without operation contents**. The anonymous device id stays inside operations.
- **EU jurisdiction** for all trips' Durable Objects ([§11.3](#113-jurisdiction)).
- **Analytics**: Cloudflare Web Analytics (cookieless) **on the landing only**; nothing inside the app. **No cookie banner**: the device only holds strictly technical storage (trips, "chi sei?", offline queue).

### 10.2 Privacy page
**Privacy page**, IT/EN, linked from the landing and the app footer. Content: what is stored (names, amounts, descriptions, the anonymous device id); where (Cloudflare, EU); for how long (until the trip is deleted); how to delete (delete the trip, rename yourself); how to export (JSON, CSV); contact `quits@simonepetta.com`. Functional text written by agents and **approved by the author** before publication.

---

## 11. Infrastructure

### 11.1 Cloudflare ([#7](https://github.com/Simi24/quits/issues/7))
- **The same Cloudflare account** as simonepetta.com. **Workers Free** plan; Durable Objects (SQLite backend) are on the Free plan. Free limits per day: 100,000 Worker requests, Durable Object requests/rows within the free allowance, 10 ms CPU per invocation; static asset requests are free ([#3](https://github.com/Simi24/quits/issues/3)).
- **No Terraform for Quits**: `wrangler.jsonc` describes the Worker, the static assets, the Durable Object class and its migrations, and the **Custom Domain** `quits.simonepetta.com`, which creates its DNS record by itself (as the simonepetta.com apex does). The simonepetta.com Terraform is **not** touched for Quits' DNS.

### 11.2 `wrangler.jsonc`
Worker with `main` (the Worker entry), `assets` (the Vite build, single-page-application fallback, the API path running the Worker first), the Durable Object binding and migrations, the Custom Domain route `quits.simonepetta.com`, a pinned `compatibility_date`. Security headers on pages: `Referrer-Policy: no-referrer` ([#6](https://github.com/Simi24/quits/issues/6)).

### 11.3 Jurisdiction
All trip Durable Objects are created in the **EU jurisdiction** ([#12](https://github.com/Simi24/quits/issues/12)). **Verify at implementation that it is available on the Free plan; if it is not, stop and return to the author.**

### 11.4 Deploy
**GitHub Actions** deploys on **merge to `main`** with a **new, minimally scoped Cloudflare API token** (a one-time manual step by the author) ([#7](https://github.com/Simi24/quits/issues/7)). The workflow runs the tests before deploying; if they fail, nothing ships.

### 11.5 Secrets
- Worker secret: the **creator codes** JSON (hashes + labels), written only by the author's terminal script through `wrangler secret put` ([#7](https://github.com/Simi24/quits/issues/7)).
- GitHub secrets: the scoped Cloudflare API token and the account ID.

### 11.6 Contact and Email Routing
`quits@simonepetta.com` is an alias on **Cloudflare Email Routing** forwarding to the author's personal inbox ([#12](https://github.com/Simi24/quits/issues/12)). Email Routing adds MX/TXT records at the apex of the `simonepetta.com` zone, which is managed in Terraform in the **simonepetta.com repository** (`infra/main`): the routing rule and the records go there, in a PR on that repo following its `SPEC.md`, with **`terraform apply` run by hand by the author**. Verifying the destination inbox is a one-time manual step.

### 11.7 Costs and backups
**Cap: 0 €, by construction**: on Workers Free, requests beyond the limits fail, no bill is ever issued ([#7](https://github.com/Simi24/quits/issues/7)). Backups: Durable Object point-in-time recovery (30 days) plus the JSON export.

### 11.8 One-time manual steps (human)
The only configuration outside code; the author provides them when the slice asks:
1. Create the scoped Cloudflare API token for CI and store it with the account ID as GitHub secrets ([#7](https://github.com/Simi24/quits/issues/7)).
2. Create creator codes with the terminal script (which writes the Worker secret).
3. Approve the privacy text ([#12](https://github.com/Simi24/quits/issues/12)).
4. Create the Web Analytics site for `quits.simonepetta.com` and provide its token (it cannot be described in `wrangler.jsonc`).
5. Run `terraform apply` for Email Routing in the simonepetta.com repo and verify the destination inbox ([#12](https://github.com/Simi24/quits/issues/12)).
6. Merge the simonepetta.com PR that links Quits ([#13](https://github.com/Simi24/quits/issues/13)).
7. The real-phone tests ([#11](https://github.com/Simi24/quits/issues/11)).

---

## 12. Quality and conventions

### 12.1 Testing
- **TDD**: red, then green, one behaviour at a time, at the seams below; no tests against internals ([#7](https://github.com/Simi24/quits/issues/7)).
- **Seams**: `domain/` as units with **Vitest** (fold, splits, leftover cents, balances, suggestions, totals, conflicts, chart models, scales); the Worker and Durable Object with **`@cloudflare/vitest-pool-workers`** (push/pull, idempotency, ordering, token handling, logging rules); the app in a real browser with **Playwright**, against the app served locally (offline load, sync between two browser contexts, cookie-bridge restore with empty storage, as the PWA prototype did with Chromium and WebKit).
- **No network and no credentials in tests.**
- **Accessibility**: AA contrast in both themes ([#4](https://github.com/Simi24/quits/issues/4)); the automated gate is [G-A13](#17-open-gaps).

### 12.2 Conventions ([#7](https://github.com/Simi24/quits/issues/7), as on simonepetta.com)
- `AGENTS.md` + ralph-gh as on simonepetta.com.
- Branches `<type>/<short-description>` (ralph-gh: `ralph/issue-<N>-<slug>`), ASCII only. Commits `<type>: <gitmoji> <description>`, e.g. `feat: ✨ add the expense sheet`. **Never a `Co-Authored-By` trailer** (the author's hook refuses it).
- **Never push to `main`**: always a PR.
- Micro-files, named exports (tool configs keep their required default export), English in code, comments, commits and PRs; Italian for tickets.

---

## 13. The link from simonepetta.com

([#13](https://github.com/Simi24/quits/issues/13))
- **Where**: an entry in the **Open source** block of simonepetta.com's about pages (`/` and `/en/`), in `src/config/projects.ts` + `src/config/about-texts.ts` of that repo. Not in the nav, not in the colophon.
- **Link**: to the **app**, `https://quits.simonepetta.com/`, not to the repo. `projects.ts` builds every href as `github.com/Simi24/<name>`, so Quits needs an explicit href.
- **When**: in the change that takes Quits to production, as the **last slice**: a PR on simonepetta.com after the first deploy, so the site never links an empty page.
- **Text approved by the author (2026-10-05), verbatim**:
  - IT: "un'app per dividere le spese di un viaggio con gli amici, anche senza rete. Come Splitwise, ma senza limiti a pagamento."
  - EN: "an app for splitting trip expenses with friends, even offline. Like Splitwise, without the paywall."
- **Way back**: Quits' footer shows "di Simone Petta" linking to `https://simonepetta.com/` (IT) or `https://simonepetta.com/en/` (EN), plus a link to the repo `Simi24/quits` and to the privacy page.

---

## 14. Declared risks

| Risk | Mitigation | Source |
|---|---|---|
| Safari deletes script-writable storage after 7 days without interaction (not for Home Screen apps) | server is the source of truth; push at every chance; nudge iOS users to install | [#3](https://github.com/Simi24/quits/issues/3) |
| No Background Sync on Safari/Firefox | sync on open, `online`, visibility, after each change, polling | [#3](https://github.com/Simi24/quits/issues/3), [#11](https://github.com/Simi24/quits/issues/11) |
| iOS installed app does not see Safari's IndexedDB; script cookies last 7 days | cookie bridge; install only with an empty queue; "apri o incolla un link" | [#11](https://github.com/Simi24/quits/issues/11) |
| `persist()` denied | never relied on; Durable Object is the safety | [#11](https://github.com/Simi24/quits/issues/11) |
| Workers Free limits exceeded | requests fail, no bill; volume is tiny (2-15 people, hundreds of writes per trip) | [#3](https://github.com/Simi24/quits/issues/3), [#7](https://github.com/Simi24/quits/issues/7) |
| EU jurisdiction unavailable on Free | verify in S3; back to the author | [#12](https://github.com/Simi24/quits/issues/12) |
| visx incompatible with the chosen React | pinned d3 fallback | [#10](https://github.com/Simi24/quits/issues/10) |
| Impersonation in "chi sei?" | accepted: pact of trust; every operation records participant and device | [#6](https://github.com/Simi24/quits/issues/6) |

---

## 15. Build plan

Vertical slices, ordered so the app is **usable on a real trip as early as possible** (end of S5); each slice is meant to be split into issues for ralph-gh. Acceptance criteria (AC) are the definition of done. **[HUMAN]** marks steps only the author can do; **[BLOCKED: G-xx]** marks a slice that cannot start that part until the open gap is decided.

**S0 Scaffold and CI**
One `package.json` with the pinned dependencies of §9.2, `.nvmrc` (Node 24 LTS), TypeScript strict, Vite + React + Tailwind with `src/styles` tokens from §7.2 (both themes, `data-theme` override), fonts loaded as in the prototypes until [G-A14](#17-open-gaps) is decided, `domain/`, `worker/` skeletons, `wrangler.jsonc` (assets only for now), Vitest, `@cloudflare/vitest-pool-workers`, Playwright wired, a CI workflow running all tests on PRs. `AGENTS.md` in place.
*AC*: `npm test`, the Worker tests and the Playwright smoke test pass in CI on a PR; the empty app renders in light and dark.

**S1 Domain core** [BLOCKED: G-A6 for restoring an expense whose delete beat an edit]
`domain/`: zod operation schemas (§3.13), the fold, the four splits and their validation (§3.6), largest remainder with tie-break (§3.7), refunds, settlements and the duplicate check, balances, greedy suggested settlements, totals and heads, categories (standard, custom, hash colour, delete to Other), participant rules (remove only if unused), conflict detection (same `baseOpId`), delete-wins, restore, rebase of pending operations on a confirmed log.
*AC*: the prototype's "Sardegna 2026" data, rebuilt as operations, reproduces the prototype's numbers (balances sum to zero; 4 suggested settlements for 5 participants; charts totals 4565,18 €, 570,65 € per day, 95,11 € per person per day; the leftover cents land on the same participants as in the prototype's expense details (e.g. "Cena di pesce")); two devices folding the same operations in different arrival orders converge after sequencing.

**S2 Local app, one device**
IndexedDB per trip via `idb` (§5.2), the fold exposed by a hook, the app shell precached by `vite-plugin-pwa` (loads offline), and the core screens: Spese (roll with one receipt per day, summary, search), the expense sheet (all four splits, refunds, several payers), expense detail with leftover note, Saldi (balances, suggested settlements, "Registra", "Registra tutti", settlement sheet and detail), the Viaggio basics (participants add/rename, default split, categories). For development the trip is created locally (server creation comes in S4).
*AC*: on one phone, offline, a whole trip can be recorded and settled with the prototype's look; reload keeps everything; Playwright covers add, edit, split validation, settle-all reaching zero.

**S3 Sync with the Durable Object** [BLOCKED: G-A1 for routing, G-A21 for rejected or outdated operations]
Worker API (push/pull, §6), trip Durable Object with the SQLite schema and migration (§6.5), EU jurisdiction (verify on Free, §11.3; if unavailable, stop and ask the author **[HUMAN]**), outbox and rebase, sync triggers and the ~30 s polling (§5.3), the sync status line, error logging rules (§10).
*AC*: two browser contexts editing the same trip offline converge after reconnecting; a retried push creates no duplicates; edit vs edit shows the conflict icon and detail notice; delete vs edit leaves the expense deleted and restorable; Worker tests prove no IP, token, header or operation content is logged.

**S4 Access without accounts** [BLOCKED: G-A1, G-A2, G-A3, G-A4, G-A12, G-A19]
Trip link `/v/#<token>` and boot from the fragment, token only in `Authorization`, "chi sei?" per trip, creator codes (terminal script, hashes in the Worker secret), trip creation on the server and the "Il viaggio è pronto" screen, landing with local trip list and creator-code field, regenerate link with the "Il link è cambiato" screen and the queued operations moving to the new link, close/reopen (read-only closed trip), delete with 30-day restore and purge, `Referrer-Policy: no-referrer`.
*AC*: a creator creates a trip, a friend joins from the link on another device and picks a name; a revoked code can no longer create trips; after regeneration the old link shows the notice and offline operations from the old link arrive through the new one; a deleted trip is restorable within 30 days and purged after.

**S5 First production deploy** [HUMAN] [BLOCKED: G-A14 and G-A16 for the privacy text]
Privacy page IT/EN (§10) **[HUMAN: approve the text]**; the footer (§13 "way back", §11.6 contact); deploy workflow on merge to `main` (§11.4) **[HUMAN: scoped token + account ID as GitHub secrets]**; Custom Domain `quits.simonepetta.com`; creator codes in production **[HUMAN: run the script]**; Email Routing for `quits@simonepetta.com` in the simonepetta.com repo's Terraform (PR there) **[HUMAN: `terraform apply`, verify the inbox]**.
*AC*: `https://quits.simonepetta.com/` serves the landing; a trip created in production syncs between two phones; the privacy page is reachable from landing and footer; an email to `quits@simonepetta.com` reaches the author. **From here Quits can be used on a trip.**

**S6 Full interface**
Everything in §7.6 not yet built: history overlay and restore of expenses and settlements, versions and "Ripristina questa versione", conflict notice on trip open **[BLOCKED: G-A9 for its form]**, Totali view, export CSV and JSON backup, currency lock, remove participant when unused, merge **[BLOCKED: G-A5]**, closed-trip mode, all motion of §7.9 (print, "=" closing, PARI with confetti once), theme selector **[BLOCKED: G-A8]**, trip editing **[BLOCKED: G-A18]**, IT/EN complete (new strings per G-A11).
*AC*: every prototype screen (both prototypes' "Vai a" lists) exists in the app in both languages and themes, with reduced motion honoured; restoring from the history brings balances back; export files download.

**S7 Charts** [BLOCKED: G-A7 for undated trips, G-A17 for a texture switch]
The Grafici tab (§8): visx compatibility check (fallback to d3 if needed), the eight charts, the "Di chi" filter, postcards and overlays, "Numeri" twins, touch/hover/keyboard readout row, textures on custom categories, desktop two-per-row layout.
*AC*: with the Sardegna data the charts match the prototype's numbers (bank chart ends exactly on Saldi); keyboard alone can read every chart; on a touch emulation no hover is needed.

**S8 PWA and offline polish**
Sync inside the service worker and Background Sync (§5.4), boot order and the iOS cookie bridge (§5.5), `persist()`, install UX (§5.6) **[BLOCKED: G-A9 for placement]**, in-app browser warning (§5.7), "Apri o incolla un link di viaggio" (§5.8), several trips per device without interference **[BLOCKED: G-A10]**, manifest icons **[BLOCKED: G-A20]**.
*AC*: in Playwright, a context with empty storage but the bridge cookie restores trip, name and device id; Background Sync is registered after a change in Chromium; opening a second trip never touches the first one's identity or queue.

**S9 Landing analytics**
Cloudflare Web Analytics beacon on the landing only (§10) **[HUMAN: create the Web Analytics site]**.
*AC*: the beacon is present on `/` and absent from every `/v/` page.

**S10 Link from simonepetta.com**
A PR on the simonepetta.com repo (§13) after the first deploy, following that repo's `SPEC.md` and `AGENTS.md`: the Open source entry with the explicit href and the verbatim IT/EN text **[HUMAN: merge]**.
*AC*: both about pages link `https://quits.simonepetta.com/` with the approved text; that repo's tests pass.

**S11 Real-phone acceptance (closing criterion)** [HUMAN]
On real phones, following an adapted [`prototypes/pwa/CHECKLIST.md`](prototypes/pwa/CHECKLIST.md) against production: **iPhone Safari** (install, cookie bridge, first open online, queue rules, link opened after install, N days later) and **Android Chrome with a real WebAPK** on public HTTPS (link opening, `persist()`), plus Samsung Internet / Firefox if possible ([#11](https://github.com/Simi24/quits/issues/11)).
*AC*: the author records the results in an issue; Quits is done when trip, identity and offline queue survive installation on both platforms.

---

## 16. Decision log

### 16.1 Tickets
| Ticket | Decision |
|---|---|
| [#1 Mappa](https://github.com/Simi24/quits/issues/1) | Separate repo on `quits.simonepetta.com`; public; Trip as the unit; link + "chi sei?"; fully offline; one currency; IT/EN; full app, urgency orders slices. |
| [#2 Inventario delle funzioni di Splitwise](https://github.com/Simi24/quits/issues/2) | Split modes, several payers, random cent, optional simplification, member removal blocked, free = 4 expenses/day + ads. Research, input to #5. |
| [#3 Sincronizzazione offline](https://github.com/Simi24/quits/issues/3) | Append-only op log, client ids, server sequence, history is the log, no sync library; recommended a Durable Object per trip. |
| [#4 Direzione visiva](https://github.com/Simi24/quits/issues/4) | "Cartolina d'estate", playful, receipt as signature object, "=" mark, meaningful motion, both themes, mobile-first tab bar, Phosphor, no AI slop. |
| [#5 Modello di dominio](https://github.com/Simi24/quits/issues/5) | Open/Closed; participants as names with merge; four splits stored with inputs; largest remainder; balances and greedy suggestions only; last edit wins on the whole expense, delete wins; categories; totals, search, export, eight charts. |
| [#6 Accesso senza account](https://github.com/Simi24/quits/issues/6) | 128-bit link token; "chi sei?" on trust; personal revocable creator codes managed by script; anyone regenerates or deletes (30 days); local trip list on the landing. |
| [#7 Stack e infrastruttura](https://github.com/Simi24/quits/issues/7) | One Cloudflare Worker + a Durable Object per trip, TypeScript; React + Vite + Tailwind, no state library; push/pull; Custom Domain, no Terraform; creator codes in a secret; Free plan, cap 0 €; conventions as simonepetta.com. |
| [#9 Prototipo dei flussi principali](https://github.com/Simi24/quits/issues/9) | Ombrellone palette + Piscina fonts; one receipt per day; Saldi and Totali in one tab; conflict notice also on open; couple as one participant; the prototype is the visual contract. |
| [#10 Prototipo dei grafici](https://github.com/Simi24/quits/issues/10) | Approved layout (hero projection, two charts one tap away); last-3-days pace; group filter default; heads = default-split shares; fixed stack order, textures on custom; visx pinned with d3 fallback; readout row for touch, hover, keyboard. |
| [#11 PWA su iOS e Android](https://github.com/Simi24/quits/issues/11) | Fragment → IndexedDB → iOS cookie bridge; sync in the service worker with Background Sync; identity and queue per token; open/paste link field; install rules; in-app browser warning; real-phone tests at the end. |
| [#12 Conservazione dei dati e privacy](https://github.com/Simi24/quits/issues/12) | Kept until deleted; token in the fragment and `Authorization` only; no IP/token logs; EU jurisdiction; Web Analytics on the landing only; IT/EN privacy page; `quits@simonepetta.com` via Email Routing in simonepetta.com's Terraform. |
| [#13 Link da simonepetta.com](https://github.com/Simi24/quits/issues/13) | Open source entry on the about pages linking the app, last slice after first deploy, approved IT/EN text, footer link back. |

### 16.2 Reconciliations
Where sources disagree, the later resolution wins. All are applied in the sections above.
1. **R1 Link form**: `/v/<token>` ([#6](https://github.com/Simi24/quits/issues/6)) became `/v/#<token>` with the token only in `Authorization` ([#12](https://github.com/Simi24/quits/issues/12), recorded on #6) (§4).
2. **R2 Token in the `Cookie` header**: [#12](https://github.com/Simi24/quits/issues/12) says the token reaches the API only in `Authorization`; [#11](https://github.com/Simi24/quits/issues/11), later, accepts it in the `Cookie` header on rare `/v/` navigations for the iOS bridge, since the Worker never records headers (§5.5, §10).
3. **R3 Where sync runs**: the research put sync logic in the page only ([#3](https://github.com/Simi24/quits/issues/3)); [#11](https://github.com/Simi24/quits/issues/11) moves it into the service worker too, with Background Sync (§5.4).
4. **R4 Install only with an empty queue**: the PWA prototype applied it everywhere; [#11](https://github.com/Simi24/quits/issues/11) keeps it for iOS only (§5.6).
5. **R5 Trip states**: #5's question and the map ("poi si archivia") listed open, settled/closed, archived; [#5](https://github.com/Simi24/quits/issues/5) decided Open/Closed only, an archived trip being a closed one (§3.2).
6. **R6 Removing a participant**: Splitwise blocks non-zero balances ([#2](https://github.com/Simi24/quits/issues/2)); [#5](https://github.com/Simi24/quits/issues/5) allows removal only when the participant is in no expense or settlement (§3.3).
7. **R7 Debt simplification**: optional in Splitwise ([#2](https://github.com/Simi24/quits/issues/2)); always on, no toggle ([#5](https://github.com/Simi24/quits/issues/5)) (§3.10).
8. **R8 Which conflicting operation wins**: the glossary's "the later one wins on the whole expense" covers edit vs edit; for delete vs edit, delete wins whatever the order ([#5](https://github.com/Simi24/quits/issues/5)) (§3.14).
9. **R9 Polling period**: ~20 s in the research ([#3](https://github.com/Simi24/quits/issues/3)); ~30 s ([#7](https://github.com/Simi24/quits/issues/7)) (§5.3).
10. **R10 IndexedDB access**: raw IndexedDB, Dexie only if painful ([#3](https://github.com/Simi24/quits/issues/3)); `idb` ([#7](https://github.com/Simi24/quits/issues/7)) (§9.2).
11. **R11 simonepetta.com Terraform**: [#7](https://github.com/Simi24/quits/issues/7) says that repo and its Terraform are not touched (for Quits' DNS); [#12](https://github.com/Simi24/quits/issues/12), later, puts the Email Routing rule and MX/TXT records there with a human `apply`. Both hold: Quits' DNS record stays the Worker Custom Domain; only Email Routing goes to simonepetta.com's Terraform (§11.1, §11.6).
12. **R12 Chart library**: the prototype recommended none ([#10](https://github.com/Simi24/quits/issues/10), first comment); the resolution picks visx, pinned, with a d3 fallback (§8.6).
13. **R13 Reading chart values**: the prototype's floating tooltip is replaced by a fixed readout row under the chart ([#10](https://github.com/Simi24/quits/issues/10) resolution) (§8.4).
14. **R14 Expense list**: one receipt per expense in the prototype; one receipt per day ([#9](https://github.com/Simi24/quits/issues/9)) (§7.6).
15. **R15 Conflict notice**: icon + detail in the prototype; plus a notice on opening the trip ([#9](https://github.com/Simi24/quits/issues/9)) (§7.6).
16. **R16 Fonts**: Ombrellone came with Bricolage Grotesque + Figtree; the chosen look keeps its palette with Piscina's Bagel Fat One + Onest ([#9](https://github.com/Simi24/quits/issues/9)), variant Scelta in [`grafici.html`](docs/prototype/grafici.html) (§7.2, §7.3).
17. **R17 Couples**: the glossary's default-split example ("a couple counted as two shares") is realised as one participant with 2 shares, no new concept ([#9](https://github.com/Simi24/quits/issues/9), glossary updated in PR #8) (§3.3).
18. **R18 The author's global defaults** (RTK, FastAPI, Lambda + DynamoDB, Terraform) do not apply: [#7](https://github.com/Simi24/quits/issues/7) chose Cloudflare, TypeScript, no state library, no Terraform (§9.1).
19. **R19 API paths**: the research routed `/trips/{id}/ops` ([#3](https://github.com/Simi24/quits/issues/3)); the token is the trip id ([#6](https://github.com/Simi24/quits/issues/6)) and may not appear in URLs ([#12](https://github.com/Simi24/quits/issues/12)), so the trip is named only by `Authorization` and paths carry no id (§6.1).
20. **R20 Implied build packages**: "React + Vite + TypeScript + Tailwind" ([#7](https://github.com/Simi24/quits/issues/7)) implies `react`, `react-dom`, the Vite React plugin and Tailwind's Vite integration; they are listed as part of that decision, not new ones (§9.2).
21. **R21 Token encoding**: the flows prototype generated 22 characters from a 58-character alphabet (under 128 bits); [#6](https://github.com/Simi24/quits/issues/6) requires 128 bits in 22 characters, which is base64url of 16 random bytes as in the PWA prototype (§4).
22. **R22 Grafici tab**: a placeholder in the flows prototype; replaced by the charts prototype ([#10](https://github.com/Simi24/quits/issues/10)) (§8).
23. **R23 Analytics creation**: `wrangler.jsonc` cannot hold a Web Analytics site, so with "no Terraform for Quits" ([#7](https://github.com/Simi24/quits/issues/7)) the site is a one-time manual step (§11.8).

---

## 17. Open gaps

No ticket decided these. **Group A needs the author** before the marked slice; **group B** has no product impact: the implementing slice picks the conventional option, writes it into this document in the same PR and names it in the PR body, and the author may override.

### Group A: decisions for the author
- **G-A1 Token vs stable trip identity** (blocks S3 routing, S4). The token is the trip's id and key ([#6](https://github.com/Simi24/quits/issues/6)), yet regenerating must keep the same trip, make the old token answer "link changed", and let queued operations reach the trip through the new link. Undecided: how the Worker maps a token to the trip's Durable Object, where retired tokens are remembered, whether tokens are stored hashed, and how a device recognises a new link as the same trip.
- **G-A2 Trip creation** (blocks S4): who generates the token (client or server), whether a trip can be created offline, and how "Usa il codice" checks a creator code (the prototype shows an error for a wrong code, which needs a server check).
- **G-A3 Server actions beyond push/pull** (blocks S4): #7 names two endpoints. Creating, regenerating, deleting and restoring a trip appear in the history as operations (§3.13) but also change server state (routing, deletion, purge). Does the Worker act on them when they arrive through push, or are they separate endpoints?
- **G-A4 Operations after close or delete**: an offline device may push expense operations sequenced after someone closed (or deleted) the trip. The server accepts every well-formed operation; does the fold apply or ignore them?
- **G-A5 Merge** (blocks merge in S6): which participant survives and how it is chosen; expenses where both appear (summed amounts or shares?); default-split shares; devices whose "chi sei?" pointed to the merged name; tie-break position. Its UI was not prototyped.
- **G-A6 Restore after delete-wins**: when a delete beat a concurrent edit, which version does "Ripristina" bring back?
- **G-A7 Undated trips** (blocks S7): dates are optional ([#5](https://github.com/Simi24/quits/issues/5)) but the day axis, projection, "today" and per-day totals need them (the flows prototype divides by 1 day without dates). Also: charts before the trip starts.
- **G-A8 Theme and language selectors**: system/light/dark is decided ([#4](https://github.com/Simi24/quits/issues/4)) and the language selector too, but the prototypes show only the landing's IT/EN switch. Where do they live inside a trip?
- **G-A9 Undrawn UI**: the form of the conflict notice on trip open; the install prompt and the iOS instruction (placement, copy); the in-app browser warning copy; the multi-row day receipt (row dividers, where the "print" animation applies); the footer inside the trip shell.
- **G-A10 Several trips on one device** (blocks part of S8): the installed app starts at `/v/?source=pwa` without a fragment; which trip (or the landing) opens; whether the iOS cookie bridge holds one trip or several.
- **G-A11 New copy**: may agents write functional strings not in the prototypes (in-app warnings, install hints, errors) without approval, as on simonepetta.com? Only the privacy text's approval is decided.
- **G-A12 Creator codes**: hash algorithm, code format and length, and where the script keeps the current JSON (Worker secrets cannot be read back).
- **G-A13 Quality gates**: an automated accessibility check (axe would need `@axe-core/playwright`, not in §9.2) and a performance budget are not decided.
- **G-A14 Fonts**: the prototypes load Bagel Fat One and Onest from Google Fonts. Offline needs them precached; the privacy page says data goes to Cloudflare only. Self-host or CDN?
- **G-A15 Licence** of the public repository.
- **G-A16 Privacy text accuracy**: whether purged trips survive in Durable Object point-in-time recovery for up to 30 more days, and what Cloudflare's own platform logs record; check before writing the privacy text.
- **G-A17 Textures on standard categories**: the charts prototype offered a user switch; the resolution makes textures mandatory only on custom categories. Is there an in-app switch?
- **G-A18 Editing a trip after creation**: renaming the trip, changing its dates, or changing the currency while there are no expenses (the settings prototype shows the currency as text only) has no prototyped UI.
- **G-A19 Deleted trip seen by others**: what the link shows to other participants during the 30 days, and whether they can restore it (the prototype shows restore only in the deleting device's landing).
- **G-A20 App icon and manifest colours** (the PWA prototype's were placeholders).
- **G-A21 Operation schema evolution** (blocks part of S3): offline queues and installed apps can run an older version after a deploy. How are operation schemas versioned, and what happens to a queued operation the server rejects as malformed (the outbox would retry it forever)?

### Group B: implementation details, fixed in the slice
- **G-B1** Exact field names of operations and API bodies (S1, from the zod schemas); HTTP status codes and error bodies (S3); pull page size.
- **G-B2** `Authorization` scheme (S3).
- **G-B3** Names: Worker, Durable Object class, secrets, cookie, IndexedDB database; the manifest `id` and `scope` (the PWA prototype used `/v/` and `/`) (S0, S3, S8).
- **G-B4** Purge mechanism for deleted trips, e.g. a Durable Object alarm (S4).
- **G-B5** The currency list at creation (the prototype offers EUR, USD, GBP, CHF, JPY) (S4).
- **G-B6** CSV columns (S6).
- **G-B7** Privacy page route; mapping of browser languages other than Italian and English; desktop column width for the non-chart tabs (S5, S6).
- **G-B8** PR preview deploys (simonepetta.com has them; not decided here) (S5).
- **G-B9** Location of the creator-code script (S4).
- **G-B10** Indexing: `noindex` on `/v/` pages and whether the landing is indexable (S5).
- **G-B11** The local server Playwright runs against (e.g. `wrangler dev` in local mode, no network) (S0).
