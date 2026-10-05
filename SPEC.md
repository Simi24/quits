# Quits: Specification

This document describes, end to end, how Quits (`quits.simonepetta.com`) is built: purpose, scope, domain model, access, offline sync, API, interface, charts, stack, privacy, infrastructure, quality and the build plan.

**No decision in this document is new**, with one marked exception. Every section summarizes and links the ticket that made the decision. Tickets are GitHub issues in this repository, written in Italian; the wayfinding map that indexes them is [issue #1](https://github.com/Simi24/quits/issues/1). A ticket's decision is its resolution comment ("Risoluzione"); later comments may amend it. **For implementation, this document is authoritative**: an implementer never needs to open a ticket. Where tickets disagreed, the later resolution won; every such case is listed in [§16.2 Reconciliations](#162-reconciliations). The exception: the gaps no ticket decided that needed the author (former group A of [§17](#17-open-gaps)) were closed on 2026-10-05 by the orchestrating agent under the author's explicit delegation; each such decision is woven into its section and tagged **"(decided under delegation, 2026-10-05)"**, is as binding as a ticket's, and stays reversible by the author. What is still undecided is listed in [§17 Open gaps](#17-open-gaps), never filled in silently. If a conflict with a ticket is found, open an issue and fix this document; do not guess.

The glossary is [`CONTEXT.md`](CONTEXT.md); this document uses its terms exactly (Trip, Trip link, Creator code, Creator, Participant, Trip currency, Default split, Expense, Payer, Split, Category, Share, Refund, Settlement, Balance, Suggested settlements, Leftover cent, Operation, History, Conflict, Merge).

**The prototypes are the visual contract.** Build the interface from them, not from the prose summaries here; where this document explicitly changes a prototype (the author's reactions in [#9](https://github.com/Simi24/quits/issues/9) and [#10](https://github.com/Simi24/quits/issues/10)), this document wins. Assets in this repository:

| Path | What | Ticket |
|---|---|---|
| [`docs/prototype/flussi.html`](docs/prototype/flussi.html) | Main flows, three variants, IT/EN, light/dark. Single file, open in a browser. | [#9](https://github.com/Simi24/quits/issues/9) |
| [`docs/prototype/grafici.html`](docs/prototype/grafici.html) | The Grafici tab, variant **Scelta** (the chosen look). | [#10](https://github.com/Simi24/quits/issues/10) |
| [`prototypes/pwa/`](prototypes/pwa/) | Throw-away PWA diagnostic stub (Vite + `vite-plugin-pwa` + `idb`), with [`CHECKLIST.md`](prototypes/pwa/CHECKLIST.md) and [`RESULTS-android.md`](prototypes/pwa/RESULTS-android.md). | [#11](https://github.com/Simi24/quits/issues/11) |
| [`docs/research/splitwise-inventory.md`](docs/research/splitwise-inventory.md) | How Splitwise behaves, free vs Pro. | [#2](https://github.com/Simi24/quits/issues/2) |
| [`docs/research/offline-sync.md`](docs/research/offline-sync.md) | Offline-first architectures compared; the op-log design. | [#3](https://github.com/Simi24/quits/issues/3) |

In the prototypes, ignore the prototype control panel (variant, "Vai a", "Simula offline", "Oggi", textures switch, screen width, library notes): it is scaffolding, not product. (The app has its own per-device "Motivi" toggle in Grafici, [§8.5](#85-colour-stack-order-textures).)

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
Implementation is done by agents (ralph-gh, [#7](https://github.com/Simi24/quits/issues/7)). Agents write functional IT/EN interface copy that is not in the prototypes (warnings, hints, errors, empty states) without approval ([§7.7](#77-copy-and-languages), decided under delegation, 2026-10-05). Always the author's: approving the privacy text ([#12](https://github.com/Simi24/quits/issues/12), [§10.2](#102-privacy-page)), the one-time manual steps ([§11.8](#118-one-time-manual-steps-human)), the Terraform `apply` in the simonepetta.com repo ([§11.6](#116-contact-and-email-routing)), and the real-phone acceptance tests ([§15](#15-build-plan), S11).

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
- **Identity** (decided under delegation, 2026-10-05): a trip has a stable, server-generated **`tripId`** (a UUID), distinct from its token ([§4](#4-access-without-accounts)). The token can change (regeneration); the `tripId` never does.
- **Creation** happens on the server and needs a connection ([§6.2](#62-endpoints), decided under delegation, 2026-10-05).
- **States**: **Open** and **Closed**. Closed is read-only in the interface and can be reopened by anyone with the link. A trip can be closed with open balances, after a warning ("N persone non sono pari. Puoi chiuderlo lo stesso."). There is no "archived" state: closed trips sit at the bottom of the list.
- **Operations that arrive after close** (decided under delegation, 2026-10-05): an offline device may push operations that the server sequences after the close. They are **accepted and applied** by sequence like any other (no data loss); the history marks each one "aggiunta a viaggio chiuso" and the closed trip shows a notice that changes arrived after closing.
- **Editing** (decided under delegation, 2026-10-05): name and dates can be edited at any time; the **currency** can change only while the trip has no expenses (the control is shown disabled, with the reason, otherwise).
- **Delete**: anyone, with confirmation ("Sì, elimina per tutti"); it disappears for everyone and is restorable for **30 days**, then deleted for good ([#6](https://github.com/Simi24/quits/issues/6)). Server side: soft delete, then purge ([#7](https://github.com/Simi24/quits/issues/7)). While deleted, push answers `410 trip_deleted`: the device keeps its operations in the outbox and pushes them if the trip is restored within the 30 days (decided under delegation, 2026-10-05). Anyone with the link can restore it ([§7.6](#76-screens-and-flows), item 16).
- Closed trips are kept **forever** until someone deletes them; no automatic deletion ([#12](https://github.com/Simi24/quits/issues/12)).

### 3.3 Participants
- A participant is only a **name inside one trip**; there are no accounts. A participant may stand for one person or for a unit that pays together: a couple is **one participant** ("Giulia e Marco") with 2 shares in the default split; both people pick that name in "chi sei?". Who wants separate balances creates two participants ([#9](https://github.com/Simi24/quits/issues/9)).
- **Add** at any time (a new participant gets 1 share in a by-shares default split, as in the prototype). **Rename** always. **Remove** only if the participant appears in no expense and no settlement ([#5](https://github.com/Simi24/quits/issues/5)).
- **Merge** folds one participant into another, for duplicates created offline ([#5](https://github.com/Simi24/quits/issues/5)). Semantics (decided under delegation, 2026-10-05):
  - "Unisci X in Y" is offered from the participant settings, with a confirmation summary of what will change. The user picks the survivor **Y**; Y keeps **Y's position in the order of entry** for tie-breaks.
  - In the fold, every reference to X becomes Y. In an expense where both appear: payer amounts are summed; exact amounts are summed; percentages are summed; shares are summed; an equal split counts Y once. In the default split, X's shares are added to Y's.
  - Devices whose "chi sei?" was X switch to Y, with a notice.
  - **Reversible**: a `MergeUndone` operation, offered from the history, makes the fold skip that merge.
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
([#5](https://github.com/Simi24/quits/issues/5), view approved in [#9](https://github.com/Simi24/quits/issues/9)) Trip total (Σ live expenses, refunds included as negatives); per day (total ÷ trip days, dates inclusive; for undated trips and expenses dated before the start, see [§8.3](#83-data-rules)); per person per day (÷ heads, where **heads = Σ shares of the default split**, or the number of participants when the default split is equal: the couple counts 2, [#10](https://github.com/Simi24/quits/issues/10)); paid vs due per participant (expenses only); spend by category.

### 3.12 Categories
- **Standard**, translated IT/EN, each with a fixed emoji and colour: Alloggio / Accommodation 🏠 `pool`; Trasporti / Transport 🚗 `sun`; Ristoranti / Restaurants 🍝 `coral`; Spesa / Groceries 🛒 `leaf`; Attività / Activities 🤿 `sea`; Altro / Other 📦 `stone` ([#5](https://github.com/Simi24/quits/issues/5), [#4](https://github.com/Simi24/quits/issues/4), mapping from the prototypes).
- **Custom per trip**: name + emoji, never translated (prototype default emoji 🏷️ when left empty); anyone can create, rename, delete them. Deleting one moves its expenses to Other. Their colour is assigned stably from a hash of the category id over `pool, sun, coral, leaf, sea` (prototype: `h = 7; for each char: h = (h × 31 + code) >>> 0`), and they **always** carry a texture in charts ([#10](https://github.com/Simi24/quits/issues/10)).

### 3.13 Operations
Each operation is immutable and carries: a **client-generated id**, the **participant** who made it, an **anonymous device id** (never shown; for conflicts and odd cases, [#6](https://github.com/Simi24/quits/issues/6)), the client **time**, and **`v`, its schema version** (decided under delegation, 2026-10-05); the server adds the **sequence number** ([§5](#5-offline-and-sync)). The operation kinds follow from the glossary, [#5](https://github.com/Simi24/quits/issues/5), [#6](https://github.com/Simi24/quits/issues/6), the history lines of the approved prototype and the decisions under delegation of 2026-10-05:

| Area | Operations | Payload |
|---|---|---|
| Trip | created\*; renamed (`TripRenamed`); dates changed (`TripDatesChanged`); currency changed (`TripCurrencyChanged`, only while no expenses; a `TripCurrencyChanged` that the server sequences after the first expense or refund, e.g. from an offline device, is ignored by the fold and shown in the history as "cambio di valuta ignorato: c'erano già spese", decided under delegation, 2026-10-05); default split changed; closed; reopened; link regenerated\*; deleted\*; restored\* | creation fields of §3.2; the new name; the new dates (either may be empty); the new currency; the new default split |
| Participants | added; renamed; removed (only if unused); merged; merge undone (`MergeUndone`) | name; old and new name; the merged pair (X into Y); the merge operation it undoes |
| Expenses | created; edited; deleted; restored | **edited carries the full new expense snapshot** (description, amount, date, category, payers, split method and inputs) **plus `baseOpId`**, the operation it was based on ([#3](https://github.com/Simi24/quits/issues/3)) |
| Settlements | recorded; deleted; restored | from, to, amount, date |
| Categories | added; renamed; deleted | name, emoji |

\* **Server actions** (decided under delegation, 2026-10-05): these four change server state as well as the log, so they never travel through push. Each has its own online-only endpoint ([§6.2](#62-endpoints)); the Worker performs the action and **appends the operation to the trip's log** in the same step, so the history shows it like any other. Close, reopen and every other operation are ordinary operations sent through push.

The operation schemas are **zod** schemas in `domain/`, shared by the app and the Worker ([#7](https://github.com/Simi24/quits/issues/7)); the expense invariants of §3.5 and §3.6 are part of them. Exact field names are fixed by those schemas in S1 ([G-B1](#17-open-gaps)); the PascalCase names above are the ones the decisions used.

**Schema evolution** (decided under delegation, 2026-10-05): the zod schemas are **versioned** by `v`. The fold **upcasts** operations of older versions to the current shape before applying them, and the server accepts every version it knows. An operation the server rejects (malformed, or of an unknown version) is handled as in [§5.1](#51-model).

### 3.14 Conflicts and restore
([#5](https://github.com/Simi24/quits/issues/5), [#3](https://github.com/Simi24/quits/issues/3))
- **Edit vs edit**: two edits of the same expense with the same `baseOpId` are a **detected conflict**. The edit the server sequenced **last** wins **on the whole expense** (never a per-field merge: it would break "shares sum to the total"); the other version stays in the history and is restorable. The UI shows the conflict ([§7.6](#76-screens-and-flows)).
- **Delete vs edit**: **delete wins**, whatever the order; the expense can be restored.
- **Restore**: a deleted expense or settlement is restored by a new operation, from the history. "Ripristina" on a deleted expense brings back its **latest version by server sequence**, including an edit that lost to the delete; the history shows both the delete and that edit (decided under delegation, 2026-10-05). Restoring an older version of an expense ("Ripristina questa versione", "Ripristina la mia versione") is a new edit carrying that version's snapshot.
- **Settlement recorded twice**: both stand (two valid operations); only the duplicate warning of §3.9 applies.

### 3.15 History
The trip's operations in order, **never erasable**; deleted expenses and settlements are restored from it ([#5](https://github.com/Simi24/quits/issues/5)). Each line: author avatar and name, what happened (prototype dictionary keys `h_*`), time; a "Ripristina" button on deletions that are still deleted. Each expense detail also lists its versions ("Modifiche") with what changed (description, amount, date, category, payers, split). Also shown (decided under delegation, 2026-10-05): the server actions of §3.13 like any other line; operations sequenced after a close, marked "aggiunta a viaggio chiuso"; a merge line with the action to undo it (`MergeUndone`); and, on the device that made them only, **rejected operations** marked "non inviata" with the reason ([§5.1](#51-model)).

---

## 4. Access without accounts

([#6](https://github.com/Simi24/quits/issues/6) amended by [#12](https://github.com/Simi24/quits/issues/12))

- **Trip link**: `https://quits.simonepetta.com/v/#<token>`. The token is **128 random bits as base64url, 22 characters** (as in [`prototypes/pwa/src/ids.ts`](prototypes/pwa/src/ids.ts)), generated by the server; it is the trip's **key**: whoever holds it can open the trip. It lives in the **URL fragment**, which never reaches the server. The app sends it to the API **only in the `Authorization` header**. Pages are served with `Referrer-Policy: no-referrer`.
- **Token and stable identity** (decided under delegation, 2026-10-05; [§16.2](#162-reconciliations) R24): the trip's **identity** is its `tripId` ([§3.2](#32-trip-and-lifecycle)), not its token. A singleton **Directory Durable Object** maps `sha256(token)` to `{ tripId, state: active | retired }` ([§6.5](#65-durable-object-storage)); **tokens are stored only hashed**, never in clear. Every API response carries the `tripId`, so a device that opens a new link recognises the same trip ([§5.2](#52-client-storage-indexeddb-via-idb)).
- **"Chi sei?"**: on first open, pick your name from the list or add yours ("Non sono nella lista" → "Aggiungimi"). The device remembers it **per trip** ([#11](https://github.com/Simi24/quits/issues/11)), and it must survive PWA installation on iOS ([§5.5](#55-boot-order-and-the-ios-cookie-bridge)). "Non sono io" changes it. There is **no protection against impersonation**: a pact of trust.
- **Creator codes**: creating a trip requires one. One code **per person**, with a label, revocable on its own; every trip remembers which code created it. Managed by the author with a **terminal script** (no admin page, no admin endpoint); stored on the server **only as hashes**, in a **Worker secret** holding a JSON of hashes and labels, written with `wrangler secret put` ([#7](https://github.com/Simi24/quits/issues/7)). A device enters the code once and remembers it. A creator has **no extra powers** inside a trip. Details (decided under delegation, 2026-10-05):
  - **Format**: `q-` followed by 20 characters of Crockford base32 (100 random bits), shown once, when the script creates it.
  - **Hash**: SHA-256 (the code is high-entropy, so no slow hash is needed).
  - **Script**: `scripts/creator-codes.ts` with `add <label>`, `revoke <label>` and `list`. Its source of truth is `~/.config/quits/creator-codes.json` (labels and hashes, never plaintext), **outside the repository** because labels are friends' names; after each change it pushes the JSON with `wrangler secret put CREATOR_CODES`.
  - **"Usa il codice"** checks the code online with `POST /api/creator/check` ([§6.2](#62-endpoints)): `200`, or `403` with the prototype's error "Questo codice non funziona...".
- **Regenerate link**: anyone in the trip, online only ([§6.2](#62-endpoints)). The old link dies immediately; whoever opens it sees "Il link è cambiato" / "Chiedi a qualcuno del viaggio il link nuovo..."; offline operations queued on that device are **not lost** and are sent when the new link is opened. Server side (decided under delegation, 2026-10-05): the Directory marks the old hash `retired` and adds the new one in one atomic step; a retired token gets `410 link_changed`. The queued operations of a device whose token was retired stay in its outbox until the new link is opened there; the response to the new token carries the same `tripId`, so the device swaps the token and pushes them.
- **Close / reopen**: anyone. **Delete**: anyone, with confirmation, restorable for 30 days ([§3.2](#32-trip-and-lifecycle)); during those days **anyone with the link** can restore it ([§7.6](#76-screens-and-flows), item 16; decided under delegation, 2026-10-05).
- **Landing** (`quits.simonepetta.com/`): public, playful, IT/EN; the list of trips **already opened on this device** (local only: the server keeps no lists), open trips first and closed at the bottom, plus deleted trips with "Ripristina" until their deadline; the field "Hai un codice da creatore?". A closed trip opens from its link read-only.

---

## 5. Offline and sync

([#3](https://github.com/Simi24/quits/issues/3) research, decided in [#7](https://github.com/Simi24/quits/issues/7) and [#11](https://github.com/Simi24/quits/issues/11))

### 5.1 Model
- The **server is the source of truth**; the phone is a cache plus an outbox ([#3](https://github.com/Simi24/quits/issues/3), [#11](https://github.com/Simi24/quits/issues/11)).
- Operations have a **client-generated id** (`crypto.randomUUID()`), so pushes are idempotent and retries safe. The server assigns a **per-trip, gap-free sequence number** on receipt; every device folds the same log in the same order and converges.
- Local unsynced operations are folded **on top of** the confirmed log and re-applied after each pull (rebase).
- The server **accepts every well-formed operation** (one that passes the shared zod schema, in any known version `v`): conflicts are resolved by the fold, never by rejecting writes.
- **Rejected operations** (decided under delegation, 2026-10-05): push returns a **result per operation**. An operation the server rejects (malformed, or of an unknown version) moves from the outbox to the **`rejected` store** ([§5.2](#52-client-storage-indexeddb-via-idb)), shows in the history as "non inviata" with the reason, and is **never retried**.
- **No sync library**: the pattern is written in-house ([#3](https://github.com/Simi24/quits/issues/3), [#7](https://github.com/Simi24/quits/issues/7)).

### 5.2 Client storage (IndexedDB via `idb`)
- Per trip, **keyed by `tripId`** ([#11](https://github.com/Simi24/quits/issues/11): one shared slot lost data in the prototype; keyed by `tripId` rather than token, decided under delegation, 2026-10-05): the current **token** (an attribute of the trip, replaced when a new link of the same trip is opened), **confirmed operations** (with their sequence number), the **outbox** (pending operations), the **`rejected` store** (operations the server refused, with the reason, [§5.1](#51-model)), and **meta** (last sequence pulled, the chosen participant for "chi sei?").
- **Recognising a new link** (decided under delegation, 2026-10-05): every API response carries the `tripId`. When a link is opened whose token is not known locally, the first response tells the device which trip it is; if that `tripId` is already stored, the device swaps in the new token and pushes the queued operations, otherwise it starts a new trip entry.
- Per device: the anonymous device id, the remembered creator code, the list of trips opened on the device (with the most recently used one, [§5.5](#55-boot-order-and-the-ios-cookie-bridge)), and the per-device preferences: theme, language ([§7.8](#78-themes)) and the "Motivi" toggle ([§8.5](#85-colour-stack-order-textures)).
- **The token lives in IndexedDB**, never only in the cookie: the service worker cannot read cookies ([#11](https://github.com/Simi24/quits/issues/11)).
- `navigator.storage.persist()` is requested (after joining a trip) but never relied on: it was denied on the emulator; data safety is the Durable Object's job ([#11](https://github.com/Simi24/quits/issues/11)).

### 5.3 Sync triggers
Push the outbox, then pull operations after the last sequence: **on app open, on `online`, on `visibilitychange` to visible, after every local change, and every ~30 s while the app is open** ([#7](https://github.com/Simi24/quits/issues/7), [#11](https://github.com/Simi24/quits/issues/11)). Never trust `navigator.onLine`: just try the request ([#3](https://github.com/Simi24/quits/issues/3)). The trip bar shows the state: "Tutto salvato e sincronizzato", "Offline: N modifiche in attesa", "Offline: le modifiche restano su questo dispositivo". A `410 link_changed` or `410 trip_deleted` answer stops the push and keeps the outbox as it is ([§6.4](#64-errors-the-client-must-tell-apart)).

### 5.4 Service worker and Background Sync
- The service worker precaches the app shell so the app loads offline after the first visit (`vite-plugin-pwa`, [#7](https://github.com/Simi24/quits/issues/7), [#11](https://github.com/Simi24/quits/issues/11)).
- **Sync also runs inside the service worker**, not only in the page: the push/pull code is shared so the service worker can run it. Where **Background Sync** exists (Chromium; verified on Android: it fires with the app and Chrome closed, 1-2 s after the network returns), register a sync tag after each local change; elsewhere (Safari, Firefox) sync only runs while the app is open, on the triggers of §5.3 ([#11](https://github.com/Simi24/quits/issues/11)). The service worker reads the token from IndexedDB and sends it in `Authorization`.
- **Fonts are precached** with the app shell: self-hosted woff2 ([§7.3](#73-typography-and-icons)), so the app looks right offline.
- **Updates** (decided under delegation, 2026-10-05): a new deploy is picked up through `vite-plugin-pwa`'s **prompt-for-update** mode, with the notice "Nuova versione disponibile"; queued operations of the older version stay valid because the server accepts every known `v` ([§3.13](#313-operations)).
- **Manifest** (decided under delegation, 2026-10-05): the icon is the "=" mark ([§7.4](#74-shapes-and-signature-objects)) as SVG plus **maskable PNGs at 192 and 512 px**; `theme_color` and `background_color` are the light paper `#FBEBDD` (the manifest has no dark variant, so the light one is used).

### 5.5 Boot order and the iOS cookie bridge
([#11](https://github.com/Simi24/quits/issues/11), logic proven in [`prototypes/pwa/src/boot.ts`](prototypes/pwa/src/boot.ts))
- On start, the app finds its trip in this order: **link fragment → IndexedDB → cookie bridge**. The manifest `start_url` is **`/v/?source=pwa`** (no fragment): the installed app starts without a token and looks it up.
- **Several trips on one device** (decided under delegation, 2026-10-05): started without a fragment, the installed app opens the **most recently used trip**; "I tuoi viaggi" leads to the landing's list of the device's trips.
- **Cookie bridge, for iOS only** (an installed iOS app receives Safari's cookies but not its IndexedDB): a first-party cookie with `Path=/v/`, `SameSite=Lax`, `Secure`, holding the device id and a **list of up to 10 most recent `{ tripId, token, participantId }` entries** (the cap keeps it under the cookie size limit; decided under delegation, 2026-10-05); on boot, if IndexedDB is empty and the cookie exists, restore every entry from it and write IndexedDB. Accepted: the token travels in the `Cookie` header on the rare navigations to `/v/` not served by the service worker; the Worker never records headers. Known limit: Safari keeps script-written cookies for 7 days. On Android the bridge is not needed (browser and installed app share storage, verified) and does no harm.
- **On iOS the first open of the installed app needs network.**

### 5.6 Install UX
([#11](https://github.com/Simi24/quits/issues/11)) Android/Chromium: offer installation through `beforeinstallprompt`. iOS: show the instruction "Condividi → Aggiungi alla schermata Home", **only when the outbox is empty** (the installed iOS app cannot see Safari's queue). The empty-queue rule is not needed on Android (the queue survives installation, verified).
Form and placement (decided under delegation, 2026-10-05): a dismissible **receipt-style card in Viaggio**, plus a **one-time hint after the 3rd expense**; on iOS the action opens a sheet with the Share → Add to Home Screen steps.

### 5.7 In-app browsers
When opened inside an in-app browser (Telegram, Instagram, sometimes WhatsApp; the prototype detects `FBAN|FBAV|Instagram|Line/|Telegram|WhatsApp` in the user agent), show a notice to open the link in Safari/Chrome ([#11](https://github.com/Simi24/quits/issues/11)). Form (decided under delegation, 2026-10-05): a **banner on trip open** with "Copia link" and the instruction to open the link in Safari or Chrome.

### 5.8 Open or paste a trip link
A field **"Apri o incolla un link di viaggio"** inside the app, because a link opened after installation can end up in the browser on both Android and iOS ([#11](https://github.com/Simi24/quits/issues/11)). It accepts a full link or a bare token.

---

## 6. API and Durable Object

([#7](https://github.com/Simi24/quits/issues/7), shape from [#3](https://github.com/Simi24/quits/issues/3), token rules from [#6](https://github.com/Simi24/quits/issues/6) and [#12](https://github.com/Simi24/quits/issues/12))

### 6.1 Routing
**One Worker** serves the PWA's static files and the API on the same origin (no CORS). The API lives under `/api/`; every **trip-scoped** request names its trip **only** through `Authorization` (the token), never in the path or query, so paths carry no trip id and no token ([§16.2](#162-reconciliations) R19). The two requests that are not about an existing trip, creating one and checking a creator code, carry the creator code instead, with the scheme `Authorization: Creator <code>` (decided under delegation, 2026-10-05); their paths carry no id either. Each trip has **one Durable Object** (SQLite storage backend) holding its operation log, in the **EU jurisdiction** ([§11.3](#113-jurisdiction)).

**Token to trip** (decided under delegation, 2026-10-05): the Worker hashes the token (SHA-256) and asks the singleton **Directory Durable Object** (also EU jurisdiction) for `{ tripId, state }`. An `active` token is forwarded to the trip's Durable Object, addressed by **`idFromName(tripId)`**; a `retired` token gets `410 link_changed`. KV is not used: its eventual consistency would delay revocation. **Every API response carries the `tripId`**, `410 link_changed` included.

### 6.2 Endpoints
The sync path depends only on push and pull, so the backend choice stays reversible ([#3](https://github.com/Simi24/quits/issues/3), [#7](https://github.com/Simi24/quits/issues/7)). The **server actions** (create, regenerate link, delete, restore) are separate endpoints, **online only**, because they change server state; each also appends its operation to the trip's log, so the history shows it (decided under delegation, 2026-10-05). Close, reopen and every other operation go through push.

| Endpoint | Authorization | Request | Behaviour |
|---|---|---|---|
| **push** (`POST`) | token | a batch of operations from the outbox | returns a **result per operation** (decided under delegation, 2026-10-05): a new operation id that passes the schema of its version is appended with the next sequence number; an id already stored is reported as already stored (idempotent retry); a malformed operation or one of an unknown version is reported **rejected**, with the reason, and not stored. The client clears appended and already-stored operations from its outbox and moves rejected ones to its `rejected` store ([§5.1](#51-model)). |
| **pull** (`GET`, with the last sequence the client has) | token | `after=<seq>` | returns the operations with sequence > `after`, in sequence order |
| **create** (`POST /api/trips`) | `Creator <code>` | the creation fields of §3.2 | the Worker checks the code against the hashes of the creator-codes secret ([§4](#4-access-without-accounts)), generates the `tripId` and the token, initialises the trip's Durable Object (with the creator code's label and the trip-created operation) and the Directory entry, and returns both `tripId` and token. Online only: the interface says creation needs a connection. |
| **creator check** (`POST /api/creator/check`) | `Creator <code>` | nothing | `200` if the code is valid; `403` otherwise (the app shows "Questo codice non funziona..."). Used by "Usa il codice". |
| **regenerate link** (`POST`) | token | the link-regenerated operation | the Worker generates a new token; the Directory marks the old hash `retired` and adds the new one atomically; the operation (which carries no token) is appended to the log; the new token is returned. |
| **delete** (`POST`) | token | the trip-deleted operation | soft-deletes the trip (restorable for 30 days) and appends the operation. |
| **restore** (`POST`) | token | the trip-restored operation | lifts the soft delete within the 30 days and appends the operation. |

The paths of push, pull, regenerate, delete and restore were fixed in S3 ([G-B1](#17-open-gaps), "Fixed in S3"); like every trip-scoped path they carry no trip id.

### 6.3 Ordering and idempotency
The Durable Object is single-threaded with input/output gates: push looks the operation id up and inserts it inside `transactionSync` (an `INSERT OR IGNORE` on an `AUTOINCREMENT` table burns a sequence number on every ignored retry, which would leave gaps; fixed in S3), pull a `SELECT ... WHERE seq > ?` ([#3](https://github.com/Simi24/quits/issues/3)). No counters, conditions or retries are needed. Server actions append their operation inside the same kind of transaction, so it is sequenced like any other.

**Strict idempotency of delete and restore (fixed in #18).** A retry of a delete or restore whose operation id is already stored is a no-op: it changes no state and answers `200` with the original outcome plus `"alreadyApplied": true` (`false` on the first application). A delete retried after a restore therefore does not delete the trip again, and a restore retried after a new delete does not lift it, so the log and the server state never disagree. The delete's original answer (`seq`, `deletedBy`, `deletedAt`, `restoreUntil`) is kept in the trip's Durable Object for this purpose. A restore of a trip that is not deleted still answers `{ "restored": false, "seq": null }`.

### 6.4 Errors the client must tell apart
From the decided UX, with the status codes decided under delegation, 2026-10-05:
- **`410 link_changed`**: the token was **regenerated** ("Il link è cambiato"); the body carries the `tripId`. The outbox is kept until the new link is opened ([§4](#4-access-without-accounts)).
- **`410 trip_deleted`**: the trip is **deleted** and restorable for 30 days. The outbox is kept and pushed if the trip is restored; the app shows the deleted-trip screen ([§7.6](#76-screens-and-flows), item 16), so the answer carries what it needs (who deleted it, when, the restore deadline).
- **A purged trip**: the token no longer leads to any trip; the app shows "Questo viaggio non è più disponibile.".
- **A rejected operation**: reported per operation in the push result, never as a failure of the whole batch ([§6.2](#62-endpoints)).
- **`403`** on create or creator check: the creator code is wrong or revoked.
- **The network being unreachable**: the outbox simply waits.

A token the Directory knows but whose trip has no state is answered like a purged trip, `404 trip_unavailable` (fixed in #18; it used to be a `500`).

Other status codes, the purged-trip answer and all error bodies are [G-B1](#17-open-gaps).

### 6.5 Durable Object storage
Two Durable Object classes, both SQLite-backed and in the EU jurisdiction.
- **Trip** (one per trip, `idFromName(tripId)`):
  - `ops`: `seq INTEGER PRIMARY KEY AUTOINCREMENT`, `op_id TEXT UNIQUE`, and the operation itself as validated JSON ([#3](https://github.com/Simi24/quits/issues/3)).
  - Trip metadata: the `tripId`, the creator code (label) that created the trip ([#6](https://github.com/Simi24/quits/issues/6)) and the soft-delete time ([#7](https://github.com/Simi24/quits/issues/7)).
- **Directory** (a singleton; decided under delegation, 2026-10-05): one row per token ever issued, `token_hash` (SHA-256 of the token, primary key), `trip_id`, `state` (`active` or `retired`). A trip has exactly one `active` row; tokens are never stored in clear, in the Directory, in the trip or in any operation. When a trip is purged its rows are deleted, so its tokens, retired ones included, lead nowhere (S3).
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
- **Fonts are self-hosted** (decided under delegation, 2026-10-05): woff2 files of Bagel Fat One and Onest (both under the SIL Open Font License), **Latin subset**, served by the Worker's static assets and precached by the service worker ([§5.4](#54-service-worker-and-background-sync)). **No Google Fonts at runtime** (the prototypes' Google Fonts links are not carried over). Files (decided in S0, group B): `src/fonts/bagel-fat-one-latin.woff2` (17 KB) and `src/fonts/onest-latin.woff2` (34 KB, one variable file for 400 to 700), taken from the `latin` block of the Google Fonts CSS API, with their provenance in `src/fonts/README.md`; Vite hashes and emits them, and `font-display: swap`. Their total weight is within the budget of [§12.1](#121-testing).
- Icons: **Phosphor** (fill/duotone) via `@phosphor-icons/react` ([#4](https://github.com/Simi24/quits/issues/4), [#7](https://github.com/Simi24/quits/issues/7)); the prototype's icon set is the reference.

### 7.4 Shapes and signature objects
From the prototype's shape rule: interactive controls are **pills**; inputs have a 14 px radius; sheets have 28 px top corners; **receipts have zig-zag edges and no radius** (the `.zz` CSS masks); tickets have side notches; chart postcards have a 16 px radius. The "=" mark: top bar `--hi`, bottom bar `--lead`; "open" (bars tilted) while a balance is not zero, it **closes** when the balance reaches zero.
**App icon** (decided under delegation, 2026-10-05): the "=" mark as two paper-coloured (`#FBEBDD`) rounded bars on a coral (`#F0644C`) rounded square, as SVG plus maskable PNGs (192, 512); manifest colours in [§5.4](#54-service-worker-and-background-sync).

### 7.5 Layout and navigation
([#4](https://github.com/Simi24/quits/issues/4)) Mobile first: one column; a **bottom tab bar** with **Spese, Saldi, Grafici, Viaggio** (icons receipt, scales, chart-bar, suitcase-rolling); a fixed **"+"** button (FAB) on Spese while the trip is open. Trip bar: back to the landing, trip name and dates, the "Sei X" chip (goes to Viaggio → identity), the sync line. On desktop: a centred column, charts wider ([§8.1](#81-layout)).

### 7.6 Screens and flows
All approved as prototyped ([#9](https://github.com/Simi24/quits/issues/9)) except where marked **changed**. Use the prototype's "Vai a" jumps to see each one. What the prototypes do not draw is marked **undrawn** (decided under delegation, 2026-10-05): the implementer designs it in the prototypes' visual language, loading the skills of [§7.11](#711-banned) first, in the form described here.

1. **Landing**: wordmark with the large "=" and the tagline "Chi ha pagato cosa in vacanza, e come tornare pari."; IT/EN switch; "I tuoi viaggi su questo dispositivo" as tickets (name, open/closed badge, dates, participant count), help "Per entrare in un viaggio apri il link che ti hanno mandato."; deleted trips ("Eliminati", "Eliminato il D. Si può ripristinare fino al D.", "Ripristina"); "Hai un codice da creatore?" with code field, checked online ([§4](#4-access-without-accounts)), error "Questo codice non funziona...", then "Codice attivo su questo dispositivo." and "Crea un viaggio"; footer ([§13](#13-the-link-from-simonepettacom), [§10.2](#102-privacy-page)), which also holds the theme and language selectors ([§7.8](#78-themes)).
2. **Create trip**: name, currency, optional dates, participants (yours first, duplicates refused "Questo nome c'è già."), default split ("Tutti uguali" / "Per quote" with steppers); then **"Il viaggio è pronto"** with the link box, "Copia il link", "Apri il viaggio". Creation is online only: offline, the screen says it needs a connection ([§6.2](#62-endpoints)).
3. **"Chi sei?"**: wordmark, trip name, the list of names as pill buttons with avatars, "Non sono nella lista" → name field → "Aggiungimi".
4. **Spese**: summary receipt ("Spesi finora" / "La tua parte"); search field (local, matches description and category name; settlements hidden while searching) and the history button; the roll grouped by day, newest first, each day headed by its date and day total. **Changed: one receipt per day**, the day's expenses as rows of the same receipt, not one receipt per expense ([#9](https://github.com/Simi24/quits/issues/9)); **undrawn**: rows separated by dotted rules, and the "print" animation applies only to the newly added row. Each row: category dot with emoji, description, conflict icon if any, "Rimborso" tag, "pagato da X" / "pagato da X e altri N" / "ricevuto da X", amount, "tua parte X" or "non ti riguarda". **Settlements stay stamped tickets** ("X ha dato a Y", "Pagamento"). Empty state "Ancora nessuna spesa." / "Tocca + per aggiungere la prima: il primo scontrino del viaggio."
5. **Expense sheet** (rises from the bottom): kind "Spesa"/"Rimborso"; description; big amount input with currency; date; category chips (scrolling row, standard then custom); payers as chips, or per-person amounts with "Hanno pagato in più persone" / "Ha pagato una persona sola"; split method segmented control with the per-person control (check, amount, percent, stepper), live result per person, the "+0,01" leftover marker, the leftover note; errors in the sheet footer; "Salva la spesa" / "Salva le modifiche".
6. **Expense detail**: the receipt (category, description, date, amount, payers with dotted leaders, split method with each share and its input, leftover note and rule), "Modifica" and "Elimina" (confirm: "Eliminare la spesa? Resta nella cronologia e si può ripristinare."; toast with "Annulla"), the versions list "Modifiche" with "Ripristina".
7. **Conflict**: an icon on the expense row and a notice in the detail ("Luca l'ha modificata mentre la modificavi tu. Vale la versione arrivata per ultima..."), both versions summarized, "Ripristina la mia versione" (or "Ripristina l'altra versione") and "Va bene così". **Changed: plus a notice when opening the trip if there are unseen conflicts** ([#9](https://github.com/Simi24/quits/issues/9)); **undrawn**: a banner at the top of Spese ("N spese modificate in contemporanea") that opens the list filtered to the conflicts.
8. **Saldi**, two views in the same tab, **Saldi** and **Totali** ([#9](https://github.com/Simi24/quits/issues/9)):
   - *Saldi*: hero receipt in words first ("Ti devono 45 €" / "Devi 20 €" / "Sei pari"; colour only as reinforcement, [#4](https://github.com/Simi24/quits/issues/4)), small PARI stamp when everyone is even; a row per participant (avatar, name, "deve ricevere X" / "deve dare X" / "è pari", signed amount, the "=" mark); "Pagamenti suggeriti" with the help "Quits non mostra chi deve a chi: solo i saldi e i pochi pagamenti che li portano a zero.", one ticket per suggestion with "Registra" (opens the settlement sheet prefilled), "Registra tutti i pagamenti suggeriti", or the notice "Siete tutti pari"; "Registra un altro pagamento".
   - *Totali*: trip total, per day, per person per day; "Pagato e spettante" rows; "Per categoria" bars.
9. **Settlement sheet**: "Chi ha dato i soldi" / "A chi", amount (help "Anche una parte: il resto rimane nei pagamenti suggeriti."), date, duplicate warning, "Registra". **Settlement detail**: the ticket and "Elimina il pagamento" (toast with "Annulla").
10. **"Tutti pari"**: when a settlement brings every balance to zero, once: the PARI/EVEN stamp lands on a receipt with confetti, "Tutti pari!", "Nessuno deve più niente a nessuno.", "Bello".
11. **Grafici**: [§8](#8-charts).
12. **Viaggio** (settings): identity ("Su questo dispositivo", "Non sono io"); **undrawn**: trip name and dates, editable at any time ([§3.2](#32-trip-and-lifecycle)); trip link with copy and "Rigenera il link" (confirm notice; online only); participants (rename, remove only when unused, add; rule text "Si può togliere solo chi non compare..."; **undrawn**: "Unisci X in Y" with its confirmation summary, [§3.3](#33-participants)); default split; categories (standard chips, custom list with rename/delete, add with emoji + name); currency (**undrawn**: selectable while the trip has no expenses, otherwise shown disabled with the reason); export ("CSV delle spese", "Backup JSON delle operazioni"); "Vedi la cronologia"; close/reopen (with the open-balances warning); delete (with "Sì, elimina per tutti"; online only). **Undrawn** (decided under delegation, 2026-10-05): a **"Questo dispositivo"** group with the theme and language selectors ([§7.8](#78-themes)); the dismissible install card ([§5.6](#56-install-ux)); at the bottom, the **footer of the trip shell**: "di Simone Petta" · code · privacy ([§13](#13-the-link-from-simonepettacom)).
13. **History** (overlay): help "Ogni modifica resta qui, non si cancella...", the list of §3.15.
14. **Closed trip**: the bar "Viaggio chiuso, sola lettura." with "Riapri"; no FAB, no edit, delete or record actions. **Undrawn**: when operations arrived after the close, a notice says so ([§3.2](#32-trip-and-lifecycle)).
15. **Old link**: "Il link è cambiato" receipt and "Torna all'inizio".
16. **Deleted trip seen from its link** (**undrawn**, decided under delegation, 2026-10-05): "Questo viaggio è stato eliminato da <nome> il <data>. Si può ripristinare fino al <data>." with **"Ripristina"** for anyone with the link (there are no admins). After the purge: "Questo viaggio non è più disponibile.".
17. **Banners on trip open** (**undrawn**): the in-app browser banner ([§5.7](#57-in-app-browsers)) and, after a deploy, "Nuova versione disponibile" ([§5.4](#54-service-worker-and-background-sync)).

### 7.7 Copy and languages
- The **IT/EN dictionaries in the two prototypes** (the `T` objects, minus the prototype-panel keys) are the approved interface copy ([#9](https://github.com/Simi24/quits/issues/9), [#10](https://github.com/Simi24/quits/issues/10)); reuse them verbatim. Settlement is "Pagamento" in Italian, Refund is "Rimborso" ([#5](https://github.com/Simi24/quits/issues/5)).
- **New copy** (decided under delegation, 2026-10-05): agents write the functional IT/EN interface copy the prototypes lack (warnings, hints, errors, empty states, the undrawn screens of §7.6) **without approval**, in the prototypes' tone, as on simonepetta.com. Only the **privacy text** needs the author's approval ([§10.2](#102-privacy-page)).
- **i18n without libraries**: a typed dictionary plus `Intl` (numbers, currency, dates, date ranges, lists) ([#7](https://github.com/Simi24/quits/issues/7)). Language from the browser, with a selector ([map](https://github.com/Simi24/quits/issues/1)). Trip contents (names, descriptions, custom categories) are never translated; standard categories are ([#5](https://github.com/Simi24/quits/issues/5)).
- As in the prototypes: no em-dashes in UI copy (date ranges use a hyphen), no uppercase eyebrow labels, no marketing copy ([#4](https://github.com/Simi24/quits/issues/4)).

### 7.8 Themes
Light and dark, **both designed** (the playful dark is drawn, not inverted), with a **system / light / dark** selector ([#4](https://github.com/Simi24/quits/issues/4)); `data-theme` on the root overrides `prefers-color-scheme`, exactly as in the prototypes. **Placement** (decided under delegation, 2026-10-05): the theme selector (system/light/dark) and the language selector (IT/EN) live in the Viaggio tab under **"Questo dispositivo"** and in the **landing footer**; both are **per device** ([§5.2](#52-client-storage-indexeddb-via-idb)).

### 7.9 Motion
**Only with meaning**, and always off under `prefers-reduced-motion` ([#4](https://github.com/Simi24/quits/issues/4)); timings and curves are in the prototype CSS:
- the "add expense" sheet rises with a light bounce (`rise`, .55 s);
- the receipt "prints" on save (`print`, .9 s in 9 steps);
- the "=" closes when a balance reaches zero;
- when everyone is even, one short celebration: the PARI/EVEN stamp (`thunk`) and confetti once (~1.6 s, in the category colours);
- overlays push in (.32 s); toasts rise; charts: marks grow from the baseline and the line draws **only when the data changes**, never on scroll ([#10](https://github.com/Simi24/quits/issues/10)).

### 7.10 Accessibility
Contrast **WCAG AA** in both themes ([#4](https://github.com/Simi24/quits/issues/4)); balances in words before colour; visible focus (`:focus-visible` outline in `--ink`); dialogs with `aria-modal` and Escape to close; charts reachable by keyboard and with a table twin ([§8.4](#84-reading-values)); colour never the only cue ([§8.5](#85-colour-stack-order-textures)); `prefers-reduced-motion` respected; touch targets at least 44 px (prototype). An automated axe check gates the main screens in both themes ([§12.1](#121-testing)).

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
4. **Andamento**: total so far, cumulative line, a **dashed projection** over the remaining days (hidden for undated trips, §8.3) with the estimated total ("≈ X", rounded), "al giorno" and "a testa al giorno" underneath. **Pace: the last 3 days** (mean of the last min(3, N) day totals); projected total = total so far + pace × days remaining. Once the trip is over the projection disappears and the line "N giorni. Il più caro: D, X." remains.
5. **Persona per categoria**: a heat table, categories × participants, cells shaded from `--lead` (light to strong), with a totals row equal to each person's due.
6. **Costo a testa al giorno**: the "A testa" mode of chart 2, dividing by **heads = shares of the default split** (the couple counts 2); the legend shows each category's per-person-per-day average.
7. **Le spese più grandi**: a long receipt, top 5 with "Mostra tutte e N" (up to 10), refunds excluded; with a person filter, ranked by that person's share.
8. **Chi ha fatto da banca**: small multiples of each person's running balance over time on **one shared scale**, settlements included and marked as dots; the lede names who was the group's bank for most days and the peak.

### 8.3 Data rules
Stack order and legend order are fixed: **Spesa, Alloggio, Ristoranti, Attività, Trasporti, Altro**, then custom categories ([#10](https://github.com/Simi24/quits/issues/10)). "Today" is the trip day of the current date; days after it are shaded as future.

**Dates** (decided under delegation, 2026-10-05):
- **Undated trip**: the day axis spans the first to the last expense date; the projection (chart 4) and "oggi" are hidden; per-day figures (here and in the Totali of [§3.11](#311-totals)) divide by that span, inclusive.
- **Expenses dated before the start date** (bookings): on the day chart they go in one **"Prima del viaggio"** bucket, and they are excluded from the per-day averages.
- **Before the trip starts**: the charts show what exists, plus "il viaggio inizia il <data>".

### 8.4 Reading values
**One responsive interface, not two UIs**: the input device changes how values are read, not the layout ([#10](https://github.com/Simi24/quits/issues/10)).
- **Touch** (`pointer: coarse`): no hover. **Tap** a mark to select it; its value appears in a **fixed readout row under the chart** (not a floating tooltip covered by the finger); on time charts **drag** to scrub; tap outside to deselect.
- **Mouse/trackpad** (`hover: hover`): the same readout row updates **on hover**; a click pins the selection.
- **Keyboard**: arrow keys move between marks, same readout row.
- The prototype's floating `.tip` is replaced by the readout row; its contents (title, value, rows, note) are the reference for what the row says.

### 8.5 Colour, stack order, textures
Colour is **never the only cue**: legend with emoji, 2 px gaps between stacked segments, the readout row, "Numeri". The fixed stack order raises the worst adjacent colour-blind ΔE from 1.5 to 10.4. **Custom categories always carry a texture** (their hash colour can repeat a standard one: in the prototype Aperitivi has Ristoranti's coral). Textures are the SVG patterns of the prototype (`tx-*`). **"Motivi" toggle** (decided under delegation, 2026-10-05): a per-device switch in Grafici adds textures to the standard categories too; it is **off by default**, and custom categories keep theirs whatever its state.

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
| Dev / test | `wrangler`, `vitest`, `@cloudflare/vitest-pool-workers`, `@playwright/test`, `@axe-core/playwright` | [#7](https://github.com/Simi24/quits/issues/7); `@axe-core/playwright` decided under delegation, 2026-10-05 |

**Type packages and peers** (decided in S0, group B): `@types/react`, `@types/react-dom` (React ships no types) and `@types/node` (the budget script and Playwright config; major pinned to the Node LTS) are dev dependencies that never ship. The Worker's runtime types come from `wrangler types` (the committed `worker-configuration.d.ts`), not from a package. `vite-plugin-pwa` pulls `workbox-build` and `workbox-window` as peers; they are installed by npm and not listed. **`vitest` is pinned to the 4.x line** because `@cloudflare/vitest-pool-workers` declares `vitest ^4.1.0` as a peer.

No i18n library, no chart library beyond the four visx packages, no sync or local-first library, no IndexedDB wrapper other than `idb`.

**Justification for `@axe-core/playwright`** (decided under delegation, 2026-10-05): the blocking accessibility gate of [§12.1](#121-testing) runs the axe rules inside the Playwright tests that already exist, which is what this package does; it is a dev dependency and never ships. Fonts are files in the repository, not packages ([§7.3](#73-typography-and-icons)). The performance budget is checked by a small script of ours, with no dependency.

### 9.3 Repository layout
([#7](https://github.com/Simi24/quits/issues/7)) One `package.json`. The repository is public under the **MIT licence** (`LICENSE`, copyright 2026 Simone Paolo Petta), like the author's other public repositories (decided under delegation, 2026-10-05).
```
SPEC.md, AGENTS.md, CONTEXT.md, README.md, LICENSE, .nvmrc, package.json, wrangler.jsonc
domain/        pure TypeScript shared by app and Worker: operation schemas (zod), fold,
               splits, leftover cents, balances, suggested settlements, totals, chart models,
               conflicts. The most tested part.
src/           the React PWA (screens, components, sync client, IndexedDB, service worker, i18n, tokens)
worker/        the Worker (static assets + API), the trip Durable Object and the Directory Durable Object
scripts/       creator-codes.ts (the author's creator-code script, §4) and the performance-budget check (§12.1)
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
- **EU jurisdiction** for all trips' Durable Objects and the Directory ([§11.3](#113-jurisdiction)).
- **Tokens are stored only as SHA-256 hashes** on the server ([§6.5](#65-durable-object-storage)); creator codes too ([§4](#4-access-without-accounts)).
- **Fonts are self-hosted** ([§7.3](#73-typography-and-icons)): no request reaches Google Fonts.
- **Analytics**: Cloudflare Web Analytics (cookieless) **on the landing only**; nothing inside the app. **No cookie banner**: the device only holds strictly technical storage (trips, "chi sei?", offline queue).

### 10.2 Privacy page
**Privacy page**, IT/EN, linked from the landing and the app footer. Content: what is stored (names, amounts, descriptions, the anonymous device id); where (Cloudflare, EU); for how long (until the trip is deleted); how to delete (delete the trip, rename yourself); how to export (JSON, CSV); contact `quits@simonepetta.com`. Functional text written by agents and **pre-approved by the author on 2026-10-05**. Built in S5 at `/privacy` (G-B7); the text is the `privacy` area of the IT/EN dictionaries (`src/i18n/*/privacy.ts`).

**Accuracy** (decided under delegation, 2026-10-05): the facts below are verified in the privacy slice (S5); until then the text says, conservatively, that
- after permanent deletion (the purge, 30 days after delete), data **may persist up to 30 more days** in Cloudflare's point-in-time recovery;
- **Cloudflare, as the provider, processes request metadata** under its own privacy policy, linked from the page.

**Approval** (decided under delegation, 2026-10-05; superseded the same day): the author **pre-approved the privacy text written by agents** (2026-10-05), so there is no separate human approval step before S10; a later change to the text is the author's call as for any product decision. The accuracy facts below were verified in S5.

**Verified in S5 (2026-10-05, Cloudflare documentation)**:
- **Point-in-time recovery**: SQLite-backed Durable Objects can restore their database "to any point in time in the past 30 days" ([PITR API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api)). The documentation does not say what history remains once `deleteAll()` has emptied an object (the purge, [§6.5](#65-durable-object-storage)). The page therefore keeps the conservative claim: after permanent deletion, technical copies **may remain for up to 30 more days**. It does not promise they are gone sooner.
- **Request metadata**: the Durable Object jurisdiction constrains only where the object "runs and persists data"; "Workers may still access Durable Objects constrained to a jurisdiction from anywhere in the world" ([data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)), and a Durable Object id "will be logged outside of the specified jurisdiction for billing and debugging purposes". Cloudflare is a processor of customer logs under its own policy ([privacy policy](https://www.cloudflare.com/privacypolicy/)), which does not give a retention period for request metadata. The page therefore says that requests go through the nearest Cloudflare network, possibly outside the EU, and that Cloudflare processes request metadata (for example the IP address) under its own policy, linked from the page.
- **Workers Logs**: new Workers have Workers Logs on by default and the automatic invocation log records "the Request, Response, and related metadata" ([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)), which would break "Worker logs only for errors" ([§10.1](#101-data-rules)). `wrangler.jsonc` therefore sets `observability.logs.invocation_logs: false`: only what the code logs (errors) is kept (Workers Free retention is 3 days).

---

## 11. Infrastructure

### 11.1 Cloudflare ([#7](https://github.com/Simi24/quits/issues/7))
- **The same Cloudflare account** as simonepetta.com. **Workers Free** plan; Durable Objects (SQLite backend) are on the Free plan. Two Durable Object classes: the trip and the singleton Directory ([§6.5](#65-durable-object-storage)). Free limits per day: 100,000 Worker requests, Durable Object requests/rows within the free allowance, 10 ms CPU per invocation; static asset requests are free ([#3](https://github.com/Simi24/quits/issues/3)).
- **No Terraform for Quits**: `wrangler.jsonc` describes the Worker, the static assets, the Durable Object class and its migrations, and the **Custom Domain** `quits.simonepetta.com`, which creates its DNS record by itself (as the simonepetta.com apex does). The simonepetta.com Terraform is **not** touched for Quits' DNS.

### 11.2 `wrangler.jsonc`
Worker with `main` (the Worker entry), `assets` (the Vite build, single-page-application fallback, the API path running the Worker first), the two Durable Object bindings (trip and Directory) and their migrations, the Custom Domain route `quits.simonepetta.com` (`routes: [{ pattern, custom_domain: true }]`), `workers_dev: false` and `preview_urls: false` ([G-B8](#17-open-gaps)), `observability` with `logs.invocation_logs: false` ([§10.2](#102-privacy-page), "Workers Logs"), a pinned `compatibility_date`. Headers on pages (`public/_headers`): `Referrer-Policy: no-referrer` ([#6](https://github.com/Simi24/quits/issues/6)) and `X-Robots-Tag: noindex` on `/v` and `/v/*` ([G-B10](#17-open-gaps)).

### 11.3 Jurisdiction
All trip Durable Objects, and the Directory (decided under delegation, 2026-10-05), are created in the **EU jurisdiction** ([#12](https://github.com/Simi24/quits/issues/12)). **Verify at implementation that it is available on the Free plan; if it is not, stop and return to the author.** Checked in S3 against the Cloudflare documentation: the Durable Objects data-location and pricing pages state no plan restriction for jurisdictions (SQLite-backed Durable Objects are the Free-plan option and `jurisdiction("eu")` is a property of the namespace); it can only be confirmed for real at the first deploy (S5), where a failure would show on the first request. workerd, locally and in tests, does not implement jurisdictions ("Jurisdiction restrictions are not implemented in workerd"), so the Worker reads the var `JURISDICTION` (`wrangler.jsonc`, `"eu"`) and only the explicit value `none` (set by the Vitest pool and by the Playwright dev server) turns the jurisdiction off; any other value keeps the EU.

### 11.4 Deploy
**GitHub Actions** deploys on **merge to `main`** with a **new, minimally scoped Cloudflare API token** (a one-time manual step by the author) ([#7](https://github.com/Simi24/quits/issues/7)). The workflow runs the tests before deploying; if they fail, nothing ships. Built in S5 as `.github/workflows/deploy.yml`: it calls the CI workflow (`ci.yml`, made reusable with `workflow_call`), then `npm run build` and `wrangler deploy` with the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. While either secret is missing the deploy job is **skipped, not failed** (a small job turns "are they set?" into an output, because a job `if` cannot read secrets), so `main` stays green until the author sets them. Deploys run one at a time and are never cancelled half way. `wrangler deploy` applies the Durable Object migrations.

### 11.5 Secrets
- Worker secret `CREATOR_CODES`: the **creator codes** JSON (SHA-256 hashes + labels), written only by the author's terminal script `scripts/creator-codes.ts` through `wrangler secret put` ([#7](https://github.com/Simi24/quits/issues/7)); the script's source of truth is `~/.config/quits/creator-codes.json`, outside the repository ([§4](#4-access-without-accounts), decided under delegation, 2026-10-05).
- GitHub secrets: the scoped Cloudflare API token and the account ID.

### 11.6 Contact and Email Routing
`quits@simonepetta.com` is an alias on **Cloudflare Email Routing** forwarding to the author's personal inbox ([#12](https://github.com/Simi24/quits/issues/12)). Email Routing adds MX/TXT records at the apex of the `simonepetta.com` zone, which is managed in Terraform in the **simonepetta.com repository** (`infra/main`): the routing rule and the records go there, in a PR on that repo following its `SPEC.md`, with **`terraform apply` run by hand by the author**. Verifying the destination inbox is a one-time manual step.

### 11.7 Costs and backups
**Cap: 0 €, by construction**: on Workers Free, requests beyond the limits fail, no bill is ever issued ([#7](https://github.com/Simi24/quits/issues/7)). Backups: Durable Object point-in-time recovery (30 days, [verified](#102-privacy-page)) plus the JSON export.

### 11.8 One-time manual steps (human)
The only configuration outside code; the author provides them when the slice asks:
1. Create the scoped Cloudflare API token for CI and store it with the account ID as GitHub secrets ([#7](https://github.com/Simi24/quits/issues/7)).
2. Create creator codes with the terminal script `scripts/creator-codes.ts add <label>` (which writes the Worker secret), and hand each code to its person.
3. ~~Approve the privacy text~~ ([#12](https://github.com/Simi24/quits/issues/12)): pre-approved by the author on 2026-10-05 ([§10.2](#102-privacy-page)); nothing to do.
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
- **Accessibility**: AA contrast in both themes ([#4](https://github.com/Simi24/quits/issues/4)). **Automated gate** (decided under delegation, 2026-10-05): axe (`@axe-core/playwright`) runs on the main screens in **both themes** and **blocks** CI on any violation.
- **Performance budget** (decided under delegation, 2026-10-05), **blocking**, checked on `dist` by a script: initial JS **≤ 200 KB gzip**, fonts **≤ 120 KB**.
  - **How it is measured** (decided in S0, group B): `scripts/check-budget.ts`. *Initial JS* is the gzip size of the scripts and `modulepreload` chunks that `dist/index.html` references (lazy chunks are not counted). *Fonts* is the raw size of every `woff2`/`woff`/`ttf`/`otf` file in `dist` (woff2 is already compressed). 1 KB = 1024 bytes. The script exits 1 on an overrun.
  - **Axe gate** (S0): `e2e/accessibility.spec.ts` runs `@axe-core/playwright` on every main screen in light and dark, each theme through both the system preference and the `data-theme` attribute, and fails on any violation.

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
- **Way back**: Quits' footer shows "di Simone Petta" linking to `https://simonepetta.com/` (IT) or `https://simonepetta.com/en/` (EN), plus a link to the repo `Simi24/quits` and to the privacy page. It appears on the landing and, inside a trip, at the bottom of the Viaggio tab as "di Simone Petta" · code · privacy ([§7.6](#76-screens-and-flows), item 12; decided under delegation, 2026-10-05).

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

Vertical slices, ordered so the app is **usable on a real trip as early as possible** (end of S5); each slice is meant to be split into issues for ralph-gh. Acceptance criteria (AC) are the definition of done. **[HUMAN]** marks steps only the author can do. No slice is blocked by an open gap: the former group A of [§17](#17-open-gaps) was closed under delegation on 2026-10-05, and group B items are fixed in the slice that meets them.

**S0 Scaffold and CI**
One `package.json` with the pinned dependencies of §9.2, `.nvmrc` (Node 24 LTS), TypeScript strict, Vite + React + Tailwind with `src/styles` tokens from §7.2 (both themes, `data-theme` override), self-hosted woff2 fonts, Latin subset (§7.3), `domain/`, `worker/` skeletons, `wrangler.jsonc` (assets only for now), Vitest, `@cloudflare/vitest-pool-workers`, Playwright wired, a CI workflow running all tests on PRs, with the blocking axe check (both themes) and the performance-budget script on `dist` (§12.1). `AGENTS.md` and `LICENSE` in place.
*AC*: `npm test`, the Worker tests and the Playwright smoke test pass in CI on a PR; the empty app renders in light and dark; no request leaves for Google Fonts; CI fails on an axe violation or on a budget overrun (initial JS > 200 KB gzip, fonts > 120 KB).

**S1 Domain core**
`domain/`: zod operation schemas (§3.13), versioned by `v`, with upcasting of older versions in the fold; the fold, the four splits and their validation (§3.6), largest remainder with tie-break (§3.7), refunds, settlements and the duplicate check, balances, greedy suggested settlements, totals and heads (with the per-day rules for undated trips and pre-start expenses, §8.3), categories (standard, custom, hash colour, delete to Other), participant rules (remove only if unused), conflict detection (same `baseOpId`), delete-wins, restore (after delete-wins: the latest version by sequence, §3.14), operations after close applied and flagged (§3.2), rebase of pending operations on a confirmed log.
*AC*: the prototype's "Sardegna 2026" data, rebuilt as operations, reproduces the prototype's numbers (balances sum to zero; 4 suggested settlements for 5 participants; charts totals 4565,18 €, 570,65 € per day, 95,11 € per person per day; the leftover cents land on the same participants as in the prototype's expense details (e.g. "Cena di pesce")); two devices folding the same operations in different arrival orders converge after sequencing; restoring an expense whose delete beat an edit brings back that edit; an operation of an older `v` folds like its current form.

**S2 Local app, one device**
IndexedDB per trip, keyed by `tripId`, via `idb` (§5.2), the fold exposed by a hook, the app shell precached by `vite-plugin-pwa` (loads offline), and the core screens: Spese (roll with one receipt per day, rows separated by dotted rules, summary, search), the expense sheet (all four splits, refunds, several payers), expense detail with leftover note, Saldi (balances, suggested settlements, "Registra", "Registra tutti", settlement sheet and detail), the Viaggio basics (participants add/rename, default split, categories). For development the trip is created locally (server creation comes in S4).
*AC*: on one phone, offline, a whole trip can be recorded and settled with the prototype's look; reload keeps everything; Playwright covers add, edit, split validation, settle-all reaching zero.

**S3 Sync with the Durable Object**
Worker API (push/pull, §6), the token-to-trip routing through the Directory Durable Object and `idFromName(tripId)` (§6.1), the trip and Directory Durable Objects with their SQLite schemas and migrations (§6.5), EU jurisdiction for both (verify on Free, §11.3; if unavailable, stop and ask the author **[HUMAN]**), push results per operation and the `rejected` store (§5.1), `tripId` in every response, outbox and rebase, sync triggers and the ~30 s polling (§5.3), the sync status line, error logging rules (§10).
*AC*: two browser contexts editing the same trip offline converge after reconnecting; a retried push creates no duplicates; edit vs edit shows the conflict icon and detail notice; delete vs edit leaves the expense deleted and restorable; a malformed operation or one of an unknown `v` is rejected alone, lands in the `rejected` store, shows "non inviata" in the history and is never retried, while the rest of its batch is stored; Worker tests prove no IP, token, header or operation content is logged, and that the Directory holds only token hashes.

**S4 Access without accounts**
Trip link `/v/#<token>` and boot from the fragment, token only in `Authorization`, "chi sei?" per trip, creator codes (format and SHA-256 hash of §4, the script `scripts/creator-codes.ts` with `add`/`revoke`/`list` and its JSON in `~/.config/quits/`, hashes in the `CREATOR_CODES` Worker secret), `POST /api/creator/check` behind "Usa il codice", online-only trip creation with `POST /api/trips` and the "Il viaggio è pronto" screen, landing with local trip list and creator-code field, regenerate link (Directory retire and add, `410 link_changed`, the "Il link è cambiato" screen, the device recognising the new link by `tripId` and pushing its queue), close/reopen (read-only closed trip, operations arriving after close shown "aggiunta a viaggio chiuso" with the closed-trip notice), delete and restore endpoints with 30-day restore by anyone with the link, `410 trip_deleted` keeping the outbox, the deleted-trip screen (§7.6, item 16) and purge, `Referrer-Policy: no-referrer`.
*AC*: a creator creates a trip, a friend joins from the link on another device and picks a name; a wrong or revoked code gets `403` and can no longer create trips; after regeneration the old link shows the notice and offline operations from the old link arrive through the new one; a deleted trip shows who deleted it and until when it can be restored, any participant can restore it within 30 days and the queued operations then arrive; after the purge the link shows "Questo viaggio non è più disponibile.".

**S5 First production deploy** [HUMAN]
Privacy page IT/EN (§10.2) with the conservative text on point-in-time recovery and Cloudflare's request metadata (facts verified in this slice, [§10.2](#102-privacy-page); the text is pre-approved by the author, 2026-10-05); the footer (§13 "way back", §11.6 contact); deploy workflow on merge to `main` (§11.4) **[HUMAN: scoped token + account ID as GitHub secrets]**; Custom Domain `quits.simonepetta.com`; creator codes in production **[HUMAN: run the script]**; Email Routing for `quits@simonepetta.com` in the simonepetta.com repo's Terraform (PR there) **[HUMAN: `terraform apply`, verify the inbox]**.
*AC*: `https://quits.simonepetta.com/` serves the landing; a trip created in production syncs between two phones; the privacy page is reachable from landing and footer; an email to `quits@simonepetta.com` reaches the author. **From here Quits can be used on a trip.**

**S6 Full interface**
Everything in §7.6 not yet built: history overlay and restore of expenses and settlements, versions and "Ripristina questa versione", conflict banner on trip open (§7.6, item 7), Totali view, export CSV and JSON backup, currency lock, remove participant when unused, merge ("Unisci X in Y", its fold semantics and `MergeUndone` from the history, the "chi sei?" switch with notice, §3.3), closed-trip mode, all motion of §7.9 (print on the new row only, "=" closing, PARI with confetti once), theme and language selectors under "Questo dispositivo" and in the landing footer (§7.8), trip editing (`TripRenamed`, `TripDatesChanged`, `TripCurrencyChanged`, §3.2), the trip-shell footer at the bottom of Viaggio, IT/EN complete (new functional strings per §7.7).
*AC*: every prototype screen (both prototypes' "Vai a" lists) exists in the app in both languages and themes, with reduced motion honoured; restoring from the history brings balances back; a merge combines amounts, percentages and shares as in §3.3 and undoing it restores the previous balances; the currency control is disabled once an expense exists; export files download.

**S7 Charts**
The Grafici tab (§8): visx compatibility check (fallback to d3 if needed), the eight charts, the "Di chi" filter, postcards and overlays, "Numeri" twins, touch/hover/keyboard readout row, textures on custom categories and the per-device "Motivi" toggle (§8.5), the date rules (undated trips, "Prima del viaggio", before the start, §8.3), desktop two-per-row layout.
*AC*: with the Sardegna data the charts match the prototype's numbers (bank chart ends exactly on Saldi); keyboard alone can read every chart; on a touch emulation no hover is needed; an undated trip spans first to last expense with no projection and no "oggi"; an expense dated before the start sits in "Prima del viaggio" and is left out of the per-day averages.

**S8 PWA and offline polish**
Sync inside the service worker and Background Sync (§5.4), boot order and the iOS cookie bridge with up to 10 trips (§5.5), `persist()`, install UX (§5.6: the card in Viaggio, the one-time hint after the 3rd expense, the iOS sheet), in-app browser banner (§5.7), "Apri o incolla un link di viaggio" (§5.8), several trips per device without interference (the installed app opens the most recently used trip, "I tuoi viaggi" reaches the landing list, §5.5), manifest icons and colours (§5.4, §7.4), prompt-for-update "Nuova versione disponibile" (§5.4).
*AC*: in Playwright, a context with empty storage but the bridge cookie restores every trip it lists, with name and device id; Background Sync is registered after a change in Chromium; opening a second trip never touches the first one's identity or queue; started from `start_url`, the app opens the most recently used trip; a new build triggers the update prompt.

**S9 Landing analytics**
Cloudflare Web Analytics beacon on the landing only (§10) **[HUMAN: create the Web Analytics site]**.
*AC*: the beacon is present on `/` and absent from every `/v/` page.

**S10 Link from simonepetta.com**
A PR on the simonepetta.com repo (§13) after the first deploy, following that repo's `SPEC.md` and `AGENTS.md`: the Open source entry with the explicit href and the verbatim IT/EN text **[HUMAN: merge]**.
*AC*: both about pages link `https://quits.simonepetta.com/` with the approved text; the privacy text in production is the one the author pre-approved (§10.2); that repo's tests pass.

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
| Delegation, 2026-10-05 (no ticket; the orchestrating agent, under the author's explicit delegation, reversible by the author) | Closed every group A gap of §17: stable `tripId` and a Directory Durable Object of token hashes; server-side online creation, creator check and separate endpoints for regenerate, delete and restore; operations after close applied, `410 trip_deleted` keeps the outbox; merge semantics with `MergeUndone`; restore brings back the latest version; date rules for charts; selectors under "Questo dispositivo"; forms of the undrawn UI; most recent trip and a 10-trip cookie bridge; agents write functional copy, only privacy needs approval; creator-code format, SHA-256 and script; axe and performance gates; self-hosted fonts; MIT licence; conservative privacy text; "Motivi" toggle; trip editing operations; deleted-trip screen with restore by anyone; icon and manifest; versioned operations with per-operation push results. |

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
19. **R19 API paths**: the research routed `/trips/{id}/ops` ([#3](https://github.com/Simi24/quits/issues/3)); the token is the trip id ([#6](https://github.com/Simi24/quits/issues/6)) and may not appear in URLs ([#12](https://github.com/Simi24/quits/issues/12)), so the trip is named only by `Authorization` and paths carry no id (§6.1). The endpoints added under delegation (2026-10-05) keep the rule: trip-scoped ones name the trip only through the token in `Authorization`; creation and the creator check, which name no trip, carry `Authorization: Creator <code>`; no path carries a trip id or a token.
20. **R20 Implied build packages**: "React + Vite + TypeScript + Tailwind" ([#7](https://github.com/Simi24/quits/issues/7)) implies `react`, `react-dom`, the Vite React plugin and Tailwind's Vite integration; they are listed as part of that decision, not new ones (§9.2).
21. **R21 Token encoding**: the flows prototype generated 22 characters from a 58-character alphabet (under 128 bits); [#6](https://github.com/Simi24/quits/issues/6) requires 128 bits in 22 characters, which is base64url of 16 random bytes as in the PWA prototype (§4).
22. **R22 Grafici tab**: a placeholder in the flows prototype; replaced by the charts prototype ([#10](https://github.com/Simi24/quits/issues/10)) (§8).
23. **R23 Analytics creation**: `wrangler.jsonc` cannot hold a Web Analytics site, so with "no Terraform for Quits" ([#7](https://github.com/Simi24/quits/issues/7)) the site is a one-time manual step (§11.8).
24. **R24 Token and trip identity**: [#6](https://github.com/Simi24/quits/issues/6) made the token the trip's identifier and key at once; to let regeneration keep the same trip, the decision under delegation (2026-10-05) separates them: the token stays the key (and the only thing in the link and in `Authorization`), the identity is a server-generated `tripId`, and client storage is keyed by `tripId` instead of the token ([#11](https://github.com/Simi24/quits/issues/11)'s "keyed by token" still holds in intent: one slot per trip) (§3.2, §4, §5.2, §6).
25. **R25 Closed is read-only**: [#5](https://github.com/Simi24/quits/issues/5) makes a closed trip read-only; operations made offline and sequenced after the close are still applied (decided under delegation, 2026-10-05), since the server never rejects a well-formed write. Read-only binds the interface, not the fold (§3.2).

---

## 17. Open gaps

No ticket decided these. **Group A**, the decisions that needed the author, was **closed under delegation on 2026-10-05** (see the list below); every decision now lives in its section, tagged "(decided under delegation, 2026-10-05)", and stays reversible by the author. **Group B** has no product impact: the implementing slice picks the conventional option, writes it into this document in the same PR and names it in the PR body, and the author may override.

### Closed under delegation (2026-10-05)
- **G-A1 Token vs stable trip identity**: `tripId`, Directory Durable Object of token hashes, `410 link_changed`, client keyed by `tripId`: §3.2, §4, §5.2, §6.1, §6.5, R24.
- **G-A2 Trip creation**: server-side, online only, `POST /api/trips` and `POST /api/creator/check` with `Authorization: Creator <code>`: §4, §6.1, §6.2, §7.6 (items 1, 2).
- **G-A3 Server actions**: separate online endpoints for create, regenerate, delete, restore, each appending its operation: §3.13, §6.2.
- **G-A4 Operations after close or delete**: applied and flagged after close; `410 trip_deleted` keeps the outbox: §3.2, §3.15, §6.4, R25.
- **G-A5 Merge**: §3.3, §3.13 (`MergeUndone`), §7.6 (item 12).
- **G-A6 Restore after delete-wins**: §3.14.
- **G-A7 Undated trips and charts before the start**: §8.3 (with §3.11, §8.2).
- **G-A8 Theme and language selectors**: §7.8, §7.6 (items 1, 12).
- **G-A9 Undrawn UI**: §7.6 (items 4, 7, 12, 16, 17), §5.6, §5.7, §13.
- **G-A10 Several trips on one device**: §5.5, §5.2.
- **G-A11 New copy**: §7.7, §1.3.
- **G-A12 Creator codes**: §4, §11.5, §11.8.
- **G-A13 Quality gates**: §12.1, §9.2 (`@axe-core/playwright`), §7.10.
- **G-A14 Fonts**: §7.3, §5.4.
- **G-A15 Licence**: MIT, `LICENSE`: §9.3.
- **G-A16 Privacy text accuracy**: §10.2.
- **G-A17 Textures on standard categories**: §8.5.
- **G-A18 Editing a trip**: §3.2, §3.13, §7.6 (item 12).
- **G-A19 Deleted trip seen by others**: §7.6 (item 16), §4, §6.4.
- **G-A20 App icon and manifest colours**: §7.4, §5.4.
- **G-A21 Operation schema evolution**: §3.13, §5.1, §6.2, §5.4 (update prompt).

### Group B: implementation details, fixed in the slice
Where a decision under delegation already fixed part of an item, that part is no longer open: in G-B1 the `403`/`410 link_changed`/`410 trip_deleted` answers and the paths `POST /api/trips` and `POST /api/creator/check` (the other endpoint paths of §6.2 are fixed with G-B1); in G-B2 the `Creator <code>` scheme (the trip-token scheme stays open); in G-B3 the secret name `CREATOR_CODES`; in G-B9 the script location `scripts/creator-codes.ts`.
- Fixed in S4 (server side): `scripts/creator-codes.ts` has `add <label>`, `revoke <label>`, `list` and `sync` (re-uploads the secret when an upload failed; added because the file is saved before the upload). The code is shown once, before the upload. The secret and the JSON file are a list of `{ label, hash }` (hash: lowercase hex SHA-256 of the code trimmed and upper-cased). `QUITS_CONFIG_DIR` overrides `~/.config/quits` (tests use it).
- **G-B1** Exact field names of operations and API bodies (S1, from the zod schemas); HTTP status codes and error bodies (S3); pull page size.
  - **Fixed in S1: operation field names** (the zod schemas in `domain/operations.ts` are the source of truth; this is their summary). Every operation is a flat object: `id` (client-generated), `v`, `by` (participant id), `device` (anonymous device id), `at` (ISO 8601 client time), `type`, plus the payload. The server's sequence number is not in the operation: the log is `{ seq, operation }`. Payloads:
    - `TripCreated { name, currency, participants: [{ id, name }] (at least 2, unique ids), from, to (date or null), defaultSplit }`; `TripRenamed { name }`; `TripDatesChanged { from, to }`; `TripCurrencyChanged { currency }`; `DefaultSplitChanged { defaultSplit }`; `TripClosed`, `TripReopened`, `LinkRegenerated`, `TripDeleted`, `TripRestored` (no payload; the last three are server actions, §3.13).
    - `ParticipantAdded { participantId, name }`; `ParticipantRenamed { participantId, name }`; `ParticipantRemoved { participantId }`; `ParticipantsMerged { fromParticipantId, intoParticipantId }` (X into Y); `MergeUndone { mergeOpId }`.
    - `ExpenseCreated { expenseId, expense }`; `ExpenseEdited { expenseId, baseOpId, expense }`; `ExpenseDeleted { expenseId }`; `ExpenseRestored { expenseId }`. `expense` is the whole snapshot: `{ description, amount, date, categoryId, payers: [{ participantId, amount }], split }`, with `amount` signed (a refund is negative, and so are its payers), `date` as `YYYY-MM-DD`.
    - `split` is `{ method: "equal", among: [id] }`, `{ method: "exact", amounts: { id: minor units > 0 } }` (positive, as entered; the sign of the expense is applied when sharing), `{ method: "percentage", percentages: { id: number } }` (up to two decimals) or `{ method: "shares", shares: { id: integer >= 0 } }`. The trip's `defaultSplit` is `{ method: "equal" }` or `{ method: "shares", shares }`.
    - `SettlementRecorded { settlementId, fromParticipantId, toParticipantId, amount (> 0), date }`; `SettlementDeleted { settlementId }`; `SettlementRestored { settlementId }`.
    - `CategoryAdded { categoryId, name, emoji }`; `CategoryRenamed { categoryId, name, emoji }`; `CategoryDeleted { categoryId }`.
  - **Fixed in S1: schema versions.** The current version is **2**. Version 1 differs only in the expense snapshot, which named the category `category` instead of `categoryId`; the app never writes it, it exists so the upcasting path is real and tested. Settled at review (2026-10-05): kept over shipping v1 alone with a test-only registry of versions, because testing upcasting through the fold (the S1 AC) would then need either a registry parameter on `parseOperation`, `foldTrip` and `foldWithPending` that production never passes, or tests against the module's internals; one small legacy schema the server accepts is cheaper, and the next real version slots into a path already exercised. The server accepts versions 1 and 2 and stores the operation as received; the fold upcasts. Any other `v` is rejected as an unknown version, anything else that fails the schema as malformed. The rejection detail lists failing field names only, never contents.
  - **Fixed in S1: standard category ids** are `accommodation`, `transport`, `restaurants`, `groceries`, `activities`, `other`. A category id that is unknown or deleted reads as `other`; the expenses are not rewritten. A custom category with no emoji gets 🏷️. Standard categories cannot be renamed, deleted or shadowed. Settled at review (2026-10-05): the ids are English because they are stored keys, never shown (English for code, AGENTS.md); the interface shows the IT/EN names of §3.12 from the prototype dictionaries.
  - **Fixed in S1: fold details the spec left open.**
    - The fold sorts by sequence and applies an operation id once.
    - An operation that has no effect (see below) stays in the history with a reason: `currency_has_expenses`, `unknown_participant`, `unknown_target`, `participant_in_use`, `invalid_merge`.
    - `TripCurrencyChanged` is ignored if the trip has **ever** had an expense, deleted ones included (restoring one would mix currencies).
    - "Sequenced after the close" is every operation applied while the trip is closed except close, reopen, delete, restore and link regeneration; each is flagged and counted in `changesAfterClose` until the next reopen or close.
    - A conflict is an edit whose `baseOpId` is not the expense's latest version when it is sequenced: it was made without knowledge of the edits sequenced after its base (CONTEXT.md, Conflict). Two edits with the same `baseOpId` are the usual case; an edit based on a version that already lost is one too. The edit wins on the whole expense (it is the last sequenced) and the losers are every edit sequenced after its base; the conflict always names the version the expense shows. Settled at review (2026-10-05): a conflict is settled (cleared) by the next edit based on the latest version, i.e. on the winner, since that edit was made by someone who saw it. An edit sequenced after a delete is kept in the versions and does not undelete.
    - Removing a participant is judged against live expenses and settlements (deleted ones do not count) and active merges. If a later operation (for example from an offline device) uses a removed participant, they come back into the trip, in their original position. An operation that names a participant who never entered the trip is ignored.
    - A merge needs two different participants who are both in the trip and not merged away; merging is global and retroactive, and chains resolve to the final survivor.
    - Per-day figures: days run from `from` to `to` inclusive; a missing `from` is the first live expense date counted, a missing `to` the last one (one day if there are none). Whenever `from` is set, expenses dated before it are out of the per-day averages and in the total.
    - The folded trip's `defaultSplit` has merges applied (X's shares added to Y's); the fold keeps the one written in the operations, so undoing a merge splits them again. The duplicate-settlement check also sees through merges.
    - The fold never changes an operation it is given: folding the same log twice gives the same trip.
    - `perDay = round(total / days)`, `perPersonPerDay = round(total / days / heads)`, as the prototype.
    - Rebase: the device folds its confirmed log, then its pending operations in outbox order, skipping any the server has since confirmed.
  - **Fixed in S3: the HTTP API.** Every response is JSON, with `Referrer-Policy: no-referrer`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`; every trip-scoped response carries `tripId`, refusals included (every answer after the token has led to a trip). Errors are `{ "error": "<code>" }` plus the fields named here. A request body over 1 MB (counted in bytes; reading stops there) is `413 too_large`; a body that is not JSON is `400 bad_request`.
    - `POST /api/creator/check` (`Creator <code>`): `200 { ok: true }`; `403 invalid_creator_code`. The code is matched case-insensitively (hashed after trim and upper-casing).
    - `POST /api/trips` (`Creator <code>`), body `{ operation: TripCreated }`: `201 { tripId, token, seq }`; `403 invalid_creator_code`; `400 invalid_operation` (`reason`, `detail`; `reason` is `malformed` or `unknown_version` as in push, or `wrong_type` for an operation of another kind; the same answer, with `tripId`, on the other server-action endpoints).
    - `POST /api/push` (`Bearer`), body `{ operations: [...] }` (at most 100, else `413 too_large`; the client sends a longer outbox in batches): `200 { tripId, results }`, one result per operation, in order: `{ id, status: "appended", seq }`, `{ id, status: "stored", seq }` (already stored: idempotent retry), or `{ id: string | null, status: "rejected", reason, detail }` with `reason` `malformed`, `unknown_version` or `server_action` (create, regenerate, delete and restore only travel through their endpoints, §3.13). `detail` names failing fields, never contents. `400 bad_request` for a body that is not `{ operations: array }`.
    - `GET /api/pull?after=<seq>` (`Bearer`; `after` defaults to 0): `200 { tripId, operations: [{ seq, operation }], hasMore }`, in sequence order, at most **500** per page (the pull page size); the client pulls again from the last `seq` while `hasMore`. `400 bad_request` for a bad `after`.
    - `POST /api/trip/regenerate-link` (`Bearer`), body `{ operation: LinkRegenerated }`: `200 { tripId, token, seq }` with the new token; the old one is `410 link_changed` from then on. The operation is appended first and the token rotated second, so a failure never strands the trip; two simultaneous regenerations leave one winner and one `410 link_changed`.
    - `POST /api/trip/delete` (`Bearer`), body `{ operation: TripDeleted }`: `200 { tripId, seq, deletedBy, deletedAt, restoreUntil }`.
    - `POST /api/trip/restore` (`Bearer`), body `{ operation: TripRestored }`: `200 { tripId, restored, seq }`; the only request a deleted trip accepts; restoring a trip that is not deleted is `{ restored: false, seq: null }` and appends nothing; once `restoreUntil` has passed a restore is `404 trip_unavailable`, as for a purged trip, even if the purge has not run yet (so a late restore can never race the purge).
    - `410 trip_deleted { tripId, deletedBy, deletedAt, restoreUntil }` (`deletedBy` is a participant id, `deletedAt` and `restoreUntil` are ISO 8601, 30 days apart) answers every trip-scoped request but restore on a deleted trip, delete included; `410 link_changed { tripId }` answers a retired token.
    - `401 unauthorized` (no or malformed `Bearer`), `404 trip_unavailable` (a token that leads to no trip: unknown, or its trip was purged; the two are indistinguishable on purpose), `404 not_found` (unknown `/api` path), `405 method_not_allowed`, `500 internal_error`.
    - Logging: the Worker logs only a caught error, as `{ event, where, error }` (the route and the error's class name): no header, IP, token or operation content (§10.1).
- **G-B2** `Authorization` scheme (S3).
  - Fixed in S3: the trip token travels as `Authorization: Bearer <token>`; a missing or malformed one gets `401 unauthorized`.
- **G-B3** Names: Worker, Durable Object class, secrets, cookie, IndexedDB database; the manifest `id` and `scope` (the PWA prototype used `/v/` and `/`) (S0, S3, S8).
  - Fixed in S3: the Durable Object classes are `Trip` (binding `TRIP`) and `Directory` (binding `DIRECTORY`), migration tag `v1`; the var is `JURISDICTION` (§11.3); the Directory is the single instance named `directory`. Shipped migrations are never edited: a change is a new tag.
  - Fixed in S0: the Worker is named **`quits`** (`wrangler.jsonc`). `compatibility_date` is **`2026-08-22`**, the newest date the workerd binary bundled with the pinned `@cloudflare/vitest-pool-workers` accepts; raise it together with the Wrangler pin. The Durable Object classes, secrets (`CREATOR_CODES` is already fixed), cookie, IndexedDB database and manifest keys stay open for S2, S3 and S8.
  - Fixed in S2: the IndexedDB database is **`quits`**, version 1, with three stores. `trips` (key `tripId`) holds `meId` ("chi sei?"), `nextOutbox` and `lastUsedAt`. `outbox` (key `[tripId, n]`, index `byTrip`) holds, in the order they were written, the operations made on this device; until S3 every operation lives here, and the app folds them with `foldWithPending([], outbox)`. `device` holds one record: the anonymous device id, the language (null until chosen), the theme and the trip the app was left on. S3 adds the `confirmed` and `rejected` stores with a version bump. Every operation is checked with `parseOperation` before it is stored. The service worker is `vite-plugin-pwa`'s `generateSW`, `registerType: "prompt"`, precaching js, css, html and woff2 with `index.html` as the navigation fallback; the manifest, icons and the update prompt stay in S8.
  - Fixed in S3 (client): the IndexedDB database is **`quits`**, **version 2**. `trips` gains `token` (indexed by `byToken`, so a link the device knows opens offline), `lastSeq` (the pull cursor), `access` (`ok`, `link_changed`, `deleted` or `unavailable`, what the server last said), `deletion` (`deletedBy`, `deletedAt`, `restoreUntil`, kept for the landing's "Eliminati" list) and `seenConflicts` (the winning operation ids of conflicts dismissed with "Va bene così", per device). `confirmed` (key `[tripId, seq]`, index `byTrip`) holds the server's log; `rejected` (key `[tripId, id]`, index `byTrip`) holds the refused operations with `reason` and `detail`. `outbox` now holds only unconfirmed operations. The `device` record gains `creatorCode`. The upgrade backfills trips made in S2: they get `token: null`, stay on the device and never sync (there is no way to give them a server identity without rewriting their log). The trip's own `TripCreated` arrives like any operation: the creator's device adopts the trip with the token the server returned and pulls.
  - Fixed in S3 (client): the sync engine lives in `src/sync/` behind two seams, `SyncStore` and `Api`, both faked in the Vitest tests. A round pushes the outbox in chunks of at most 100, then pulls pages (500) until `hasMore` is false. Appended and stored results move the operation to `confirmed` with the sequence the server gave it (before the pull, in one transaction with leaving the outbox); rejected ones go to `rejected`. An operation the push answer says nothing about (no result at its place, or one for another id) stays in the outbox: only a rejection the server gave is final. A pulled operation this version cannot read stays out of `confirmed`, and the saved cursor stops just before it, so every round asks for it again until an updated app can read it (moving past it would leave the updated device folding a different log from the others). An answer that is not a JSON object (a captive portal's page) is an error, never an empty success. After `410 link_changed` or `404 trip_unavailable` (any other `404` is a plain error) the device sends no more requests for that trip (the first until a new link is opened, the second for good); after `410 trip_deleted` it keeps polling, so a restore from another device is noticed, and any normal answer resets `access` to `ok`. What the server says about the trip's link and life is recorded only while the token it was asked with is still the trip's token, so a round still in flight with the old token cannot mark a just-regenerated link as changed. Opening a link whose token the device does not know asks `GET /api/pull?after=0` once; the `tripId` in the answer decides between swapping the token of a trip it has and starting a new one. A deleted trip opened from a link on a device that does not have it shows "Ripristina" without the deleter's name (the device knows no roster) and restores with the deleter's participant id as `by`, since the operation needs a participant and the server does not check membership.
  - Fixed in S3 (client): the page syncs on open, on `online`, on `visibilitychange` to visible, after each local change and every 30 s, one round at a time per tab. Tabs of one browser tell each other through a `BroadcastChannel` named `quits-changes` when IndexedDB changed, so two tabs on one trip refresh each other at once.
- **G-B4** Purge mechanism for deleted trips, e.g. a Durable Object alarm (S4).
  - Fixed in S3: the trip's Durable Object sets an alarm 30 days after the delete (a restore cancels it). The alarm deletes the trip's rows from the Directory first and then all the trip's storage, so a failure loses nothing. The alarm never gives up (fixed in #18): if the Directory call or the deletion throws, the alarm catches it and schedules itself again with an exponential backoff (1 min, 2, 4, ... capped at 1 h) until the purge succeeds; a restore cancels it.
- **G-B5** The currency list at creation (the prototype offers EUR, USD, GBP, CHF, JPY) (S4).
  - Fixed in S2 for the local creation, and kept by S4: EUR, USD, GBP, CHF and JPY, the prototype's list. Creation is online only (`POST /api/trips` with the device's creator code).
- **G-B6** CSV columns (S6).
  - Fixed in S6: "CSV delle spese" has one row per live expense (deleted ones left out), by date then order of entry, UTF-8 with a BOM so spreadsheets read the accents, CRLF line ends, RFC 4180 quoting; a cell that starts with `=`, `+`, `-` or `@` gets a leading `'` so it is read as text. Columns, in this order and with these English headers in both languages: `date` (YYYY-MM-DD), `description`, `category` (custom ones as typed, standard ones in the interface language), `type` (`expense` or `refund`), `amount` (decimal in the trip currency's minor unit, a dot as separator, negative for a refund), `currency`, `split` (`equal`, `exact`, `percentage` or `shares`), then `paid <name>` and `share <name>` for every active participant in order of entry (merges applied, the leftover cent included in the shares). The "Backup JSON delle operazioni" is `{ app: "quits", format: 1, tripId, exportedAt, operations }` with the operations as stored; it never carries the trip link. Files are named `<trip-name-slug>-spese.csv` and `<trip-name-slug>-backup.json`.
- **G-B7** Privacy page route; mapping of browser languages other than Italian and English; desktop column width for the non-chart tabs (S5, S6).
  - Privacy page route, fixed in S6 as a placeholder: `/privacy`. The footer links to it; the page itself is built in S5 (§10.2). Until then the path falls back to the app.
  - Fixed in S5: the privacy page is the plain path `/privacy` (trailing slash accepted), rendered by the app shell instead of the trip screens, so it needs no trip, no token and no new dependency. It is in the main bundle, hence precached, and the service worker's navigation fallback serves it offline. Its language is the device language, with the same IT/EN switch as the landing. The landing footer and the Viaggio footer share one `FooterLinks` ("di Simone Petta", "codice", "Privacy").
  - Fixed in S2: a browser language that starts with `it` gives Italian, any other gives English; the choice is per device and overrides it. The app column is centred at 30 rem (480 px) on desktop for the non-chart tabs.
  - Fixed in S2, copy: until sync exists (S3) the line under the trip bar reads "Tutto salvato su questo dispositivo" / "Everything saved on this device", not the prototype's "sincronizzato", which would be untrue. S2 creates trips locally, from the landing, with no creator code; S4 replaces that with creator codes and server creation.
  - Fixed in S3, copy (supersedes the line above for trips with a link): the line under the trip bar reads "Tutto salvato e sincronizzato" once a round has succeeded and nothing is waiting, "Sincronizzo le modifiche" while changes wait to go out, "Offline: N modifiche in attesa" (or "Offline: le modifiche restano su questo dispositivo" when none wait) after a request that could not reach the server, and "Non riesco a sincronizzare..." after an unexpected answer. The S2 line remains only for the trips made before sync, which never sync. A 30 s poll does not flash "Sincronizzo". Landing: trips whose `access` is `deleted` appear under "Eliminati" until `restoreUntil` (with "Ripristina"); purged ones (`unavailable`) are left off the list, since their link only leads to "Questo viaggio non è più disponibile."
  - Fixed in S3/S4, conflicts and closed mode (client): the conflict icon and the detail notice show for a conflict the device has not dismissed. "Va bene così" only dismisses it on this device; "Ripristina la mia versione" (or "l'altra") is a new `ExpenseEdited` carrying the losing version's snapshot with `baseOpId` the winning operation, which clears the conflict in the fold. The history overlay, with the "non inviata" and "aggiunta a viaggio chiuso" marks, and the banner on trip open are S6; this slice exposes the data (`rejected`, `afterClose`, `changesAfterClose`) and shows the closed-trip notice in the trip bar. A closed trip is read only in the interface: no "+", no edit, delete or record actions, and the Viaggio controls that change the trip are disabled; close, reopen, regenerate and delete stay available (the last two online only).
  - Fixed in S4 (tests): `playwright.config.ts` writes `.dev.vars` (gitignored) with a made-up creator code's SHA-256 before `wrangler dev` starts, and only when its content changed (Wrangler restarts when the file changes). A real creator code never goes through it.
- **G-B8** PR preview deploys (simonepetta.com has them; not decided here) (S5).
  - Fixed in S5: **no PR previews**. Quits is one Worker bound to the production Durable Objects, so any preview of a pull request would read and write real trips; there is no staging namespace and none is worth its cost for a free, single-author app. `wrangler.jsonc` sets `workers_dev: false` and `preview_urls: false` (a Version URL follows `workers_dev` by default; the explicit `false` keeps it off even if that changes). CI on pull requests runs the whole gate against a local build instead.
- **G-B9** Location of the creator-code script (S4).
- **G-B10** Indexing: `noindex` on `/v/` pages and whether the landing is indexable (S5).
  - Fixed in S5: the landing and `/privacy` are **indexable** (the landing has a meta description); every `/v` path answers `X-Robots-Tag: noindex` (`public/_headers`, so it is a response header and also reaches crawlers that do not run JavaScript). `public/robots.txt` allows everything except `/api/`; `/v/` is deliberately **not** disallowed, because a crawler that may not fetch a page never sees its `noindex`. A trip link is never public anyway: the token is in the fragment.
- **G-B11** Fixed in S0: Playwright runs against `wrangler dev --local` (port 8787, `WRANGLER_SEND_METRICS=false`, no Cloudflare credentials) serving the `dist` of `npm run build`, i.e. the production runtime with the single-page-application fallback. Locally an already running server is reused; in CI a fresh one starts.
- **Fixed in S7 (Grafici).** Written back from the slice.
  - **visx verdict**: `@visx/scale`, `@visx/shape`, `@visx/group` and `@visx/axis` 4.0.0 declare `react ^18 || ^19` as peers and work with the pinned React 19.3.0; no fallback to d3. They pull `@visx/curve`, `@visx/point`, `@visx/text` and `@visx/vendor` (the bundled d3 modules) as their own dependencies; these are never imported directly. The charts are a lazy chunk (about 34 KB gzip) loaded when the Grafici tab first opens; the service worker precaches it, so it works offline. Initial JS stays at about 134 KB gzip.
  - **Models** live in `domain/charts/` (`chartModel(trip, { today, who })`, pure, tested on the Sardegna data); axis ticks are `niceStep`/`axisTicks` there. The "today" is the device date, passed in.
  - **Dates, completing §8.3**: a trip counts as undated unless both dates are set (no projection, no "oggi"); the axis then runs from the start date, or the first expense, to the end date, or the last expense. An expense dated after the end stretches the axis so no money disappears. Totals, the cumulative line and all charts count every live expense; "so far" only shades the future and drives the projection. Projection and pace are rounded to a minor unit; the label "≈ X" rounds to 10 units of the currency. Per-day averages divide by the days gone (all of them once over), bookings before the start left out, as in §3.11.
  - **Bank chart time axis**: expenses sit on their `date`, not on the time they were written; several events of one day are spread across it in the order written (expense creation time, settlement operation time). The last step equals the balances of Saldi. "Chi ha fatto da banca" counts the days each person held the group's largest credit; the chart ignores the "Di chi" filter except to dim the others.
  - **Readout row**: always visible under each chart, with a hint until a mark is selected. Mouse hover previews, tap/click/focus pins, a tap outside clears. Time charts are one `slider` each (arrows, Home, End); list charts are buttons with arrow-key navigation.
  - **"Motivi"** is stored in the browser's `localStorage` (`quits.motivi`), not in the IndexedDB device record, so it needs no schema change; it is per device.
  - Desktop width: the app column widens to 760 px while the Grafici tab is open (`:has`), and the feed goes two per row from a container width of 620 px.
  - Per-day figures divide the per-person view by the head count of the chosen person (their default-split shares, 1 if equal).
