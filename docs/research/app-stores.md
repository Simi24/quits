# App store economics: native Quits with accounts?

Research for [issue #38](https://github.com/Simi24/quits/issues/38). Question: does it make economic sense to add real authentication to Quits, rewrite it as a native or cross-platform app (React Native/Expo, Flutter, or Swift+Kotlin, not a WebView wrapper) and publish it on the App Store and Google Play? Are the developer accounts worth paying?

All sources were read on **2026-10-09**. Confidence tags: **[official]** the vendor's or the law's own text, **[store]** a live store listing read that day, **[secondary]** a third party, **[inferred]** my estimate or reading, not stated anywhere. Euro conversions use roughly 1 USD = 0.87 EUR and may drift. Figures marked *possibly stale* come from sources older than 2025.

Two standing decisions bear on this question and are not changed by this note: `SPEC.md` §1.2 point 4 (**identity without accounts**) and §2.3 (**push notifications are out of scope**). Adding accounts reverses the first; push is the main thing a native app adds, and the spec already excludes it.

## TL;DR

- **Cash cost of being in both stores is small**: Apple 99 €/year in Italy, Google 25 USD once, Cloudflare 0-5 USD/month even at 10k MAU. The real cost is the **rewrite and its upkeep** (my estimate: 220-350 hours with React Native/Expo, more with Flutter or native), and, if you charge money, **Italian tax compliance** (up to ~1,000-1,500 €/year with a partita IVA) plus publishing a **home address and phone number** on the EU store pages (DSA trader).
- **The market is saturated and the free tier is already taken**: Tricount (bunq) is "Free. No ads. No limits." and dropped its Premium on 2026-10-02; Splid (1M+ Play downloads, 4.87★) sells a one-time 3,99 € unlock; Settle Up and Splitwise sell subscriptions. Quits' selling point ("Splitwise without limits") is what Tricount and Splid already give away.
- **Realistic year-1 revenue for an unmarketed indie app is tens to low hundreds of euros**. RevenueCat's 2026 data: freemium download-to-paid median 2.1%, median subscription app about 72 USD/month one year after launch, only 17.3% reach 1,000 USD/month. Every monetized scenario below except the optimistic one loses money in cash terms, and none repays the rewrite time.
- **Recommendation**: do not rewrite and do not publish; stay a PWA without accounts. If you want a store presence, the only cheap experiment is a **Play Store TWA of the existing PWA, free, non-trader** (25 USD once, 12 testers for 14 days).

## 1. Store costs and obligations

| Item | Apple App Store | Google Play |
|---|---|---|
| Account fee | **99 USD/year**, local price shown at enrollment ([Apple](https://developer.apple.com/programs/enroll/)) [official]; **99 €/year incl. VAT in Italy** ([macitynet](https://www.macitynet.it/apple-aumenta-prezzi-per-il-programma-sviluppatori-ios-e-mac-anche-italia/)) [secondary] | **25 USD once**, ID and card in your legal name ([Play Help](https://support.google.com/googleplay/android-developer/answer/6112435)) [official] |
| Seller name | An individual's **legal name** is shown as seller ([Apple](https://developer.apple.com/programs/enroll/)) [official] | Identity verification with government ID ([Play Help](https://support.google.com/googleplay/android-developer/answer/6112435)) [official] |
| Before production | App Review | Personal accounts created after 2023-11-13: **at least 12 testers opted in continuously for 14 days** in a closed test, plus proof of an Android device via the Play Console app ([testing rule](https://support.google.com/googleplay/android-developer/answer/14151465), [registration](https://support.google.com/googleplay/android-developer/answer/6112435)) [official] |
| Commission | Small Business Program: **15%** on paid apps and IAP (under 1M USD/year proceeds) ([Apple](https://developer.apple.com/app-store/small-business-program/)) [official]. EU unified terms from 2026-10-01: 15% for program participants via Apple IAP ([Apple DMA page](https://developer.apple.com/support/dma-and-apps-in-the-eu/)) [official] | Since **2026-06-30** in the EEA: **10% service fee + 5% Play Billing fee** on the first 1M USD and on all subscriptions (new installs) ([Play Help](https://support.google.com/googleplay/android-developer/answer/112622), [Android blog](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)) [official] |
| Unlocking features | Must use In-App Purchase (3.1.1); tips go through IAP too ([guidelines](https://developer.apple.com/app-store/review/guidelines/)) [official] | Play Billing for digital goods (the 5% billing fee applies only to it) [official, same pages] |
| Accounts | If the app creates accounts it must offer **in-app account deletion** (5.1.1(v)); it may not require personal data unless core to the function ([guidelines](https://developer.apple.com/app-store/review/guidelines/)) [official] | **In-app deletion path and a web link** where users can request account and data deletion ([Play Help](https://support.google.com/googleplay/android-developer/answer/13327111)) [official] |
| Third-party login | Google/Facebook/etc. login requires also offering an equivalent privacy-preserving login (Sign in with Apple qualifies) (4.8) [official, guidelines] | none |
| Privacy declarations | Privacy "nutrition label" covering your code and every SDK, plus a **required privacy policy URL** ([Apple](https://developer.apple.com/app-store/app-privacy-details/)) [official] | **Data safety form**, mandatory even if no data is collected, plus privacy policy ([Play Help](https://support.google.com/googleplay/android-developer/answer/10787469)) [official] |
| EU DSA trader status | Every developer declares it; since **2025-02-17** apps without it are removed from the EU store. Traders show **address (or P.O. box), phone and email** on the EU product page. Revenue (IAP, paid, ads) and VAT registration point to trader; "a hobbyist ... with no intention of commercializing it" may not be one ([Apple DSA help](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/), [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)) [official] | Same obligation: declare to publish or update in the EU, traders' address, phone and email shown ([makaka tutorial](https://makaka.org/unity-tutorials/trader-status), [orbitkit](https://orbitkit.io/blog/eu-dsa-trader-status-app-store/)) [secondary; Google's own help page was not found] |
| Yearly policy churn | Minimum Xcode/SDK raised every spring (from **2026-04-28**: Xcode 26, iOS 26 SDK); new age-rating questionnaire (deadline 2026-01-31) ([Apple](https://developer.apple.com/news/upcoming-requirements/)) [official] | **Target API raised every 31 August** (2026: Android 16 / API 36 for new apps and updates) ([Android](https://developer.android.com/google/play/requirements/target-sdk)) [official] |

**Guideline 4.2 and wrappers** (secondary under the native scope): Apple rejects apps that are not "app-like" beyond "a repackaged website" (4.2, 4.2.2) [official, guidelines]; a real native rewrite is not at risk. On Play a PWA can ship as a **Trusted Web Activity** (Digital Asset Links, Chrome 72+), the cheap alternative of §6 ([Chrome docs](https://developer.chrome.com/docs/android/trusted-web-activity)) [official].

**DMA alternatives** (alternative marketplaces, web distribution) carry a 5% Core Technology Commission and eligibility tests (D&B score, 1M first-year installs, a 1M USD letter of credit...) ([Apple DMA page](https://developer.apple.com/support/dma-and-apps-in-the-eu/)) [official]. Irrelevant at Quits' scale.

## 2. Italy: tax and legal side of earning from the app

The author is an employee without a partita IVA. **Sources disagree on the key point**, so this needs a commercialista before any euro is earned.

- **Without partita IVA**: occasional income is *redditi diversi*, declared in the 730/Redditi PF and taxed at the **marginal IRPEF rate**: 23% up to 28k, **33% from 28k to 50k** (cut from 35% by the 2026 budget law), 43% above, plus regional 1.23-3.33% and municipal 0-0.9% surcharges ([fiscomania](https://fiscomania.com/aliquote-irpef/)) [secondary]. INPS Gestione Separata applies to occasional self-employment only above **5,000 €/year** or 30 days ([informazionefiscale, 2024](https://www.informazionefiscale.it/app-developer-partita-iva-codice-ateco-inquadramento-fiscale)) [secondary].
- **Is an app on sale "occasional"?** informazionefiscale (2024) says occasional, non-habitual work needs no partita IVA; money.it (2022, *possibly stale*) says that **an app permanently on sale is habitual by definition** and requires one ([money.it](https://www.money.it/vendita-applicazioni-online-funziona-fiscalmente)) [secondary]. Open.
- **With partita IVA**: selling your own apps on stores is a **commercial activity** (art. 2195 c.c.; ATECO 47.91.10, or 62.01), with registration in the Registro imprese ([informazionefiscale](https://www.informazionefiscale.it/app-developer-partita-iva-codice-ateco-inquadramento-fiscale)) [secondary].
  - **INPS Commercianti** fixed minimum for 2026 is **4,611.64 €/year** (INPS circ. 14/2026) ([Unioncamere](https://sni.unioncamere.it/notizie/inps-gestioni-artigiani-e-commercianti-i-contributi-il-2026)) [secondary], but it applies only if the activity is **habitual and prevalent**; a full-time job normally rules out prevalence ([fiscoconsulting](https://www.fiscoconsulting.it/lavoro-dipendente-e-partita-iva-quando-e-possibile-evitare-i-contributi-inps-commercianti/)) [secondary].
  - **Regime forfettario** is closed to anyone whose **employment income in the previous year exceeded 35,000 €** (2025 and 2026) ([investireoggi](https://www.investireoggi.it/forfettario-2026-arriva-la-conferma-35000-euro-di-reddito-dipendente-senza-esclusione/)) [secondary]. An employed software engineer is likely above it, which leaves the ordinary regime (IRPEF at the marginal rate, IVA bookkeeping).
  - If the activity were classed as self-employment instead, Gestione Separata is **26.07%**, or **24%** for those already insured elsewhere, such as employees (INPS circ. 8/2026) ([fiscoetasse](https://www.fiscoetasse.com/new-rassegna-stampa/3491-gestione-separata-inps-2026-aliquote-e-massimali-contributivi.html)) [secondary].
  - **Commercialista**: 250-2,500 €/year for a forfettario, most often **1,000-1,200 €**; online services 400-700 € + IVA ([regimeforfettario.it](https://www.regimeforfettario.it/quanto-costa-un-commercialista-per-un-regime-forfettario/), [centrofiscale](https://centrofiscale.com/costo-commercialista-forfettario-2026/)) [secondary]. The ordinary regime costs more.
- **VAT to consumers** is collected by Apple and Google, so no per-country VAT registration ([money.it](https://www.money.it/vendita-applicazioni-online-funziona-fiscalmente)) [secondary].
- **Employment contract**: check exclusivity and conflict-of-interest clauses before selling software on the side [inferred].

**Implied fixed yearly cost**: about **0-100 €** on the occasional route (a CAF/730 filing) with legal risk, or about **1,000-1,600 €** with a partita IVA in the ordinary regime, before taxes on profit [inferred from the figures above]. Below roughly 1,500-2,000 € of yearly net revenue, a partita IVA costs more than the app earns.

## 3. Authentication and running costs

### 3.1 Auth options

| Option | Free tier | First paid step | Note |
|---|---|---|---|
| Cloudflare-native (email OTP or magic link in the Worker, Sign in with Apple/Google verified in the Worker, users in a Durable Object or D1) | Workers Free has **no outbound email**; Workers Paid (5 USD/month) includes **3,000 emails/month**, then 0.35 USD per 1,000 ([CF Email Service](https://developers.cloudflare.com/email-service/platform/pricing/)) [official] | 5 USD/month | Keeps one vendor and the EU jurisdiction; you write and own the security code |
| Resend (email only) | 3,000/month, 100/day ([Resend](https://resend.com/pricing)) [official] | 20 USD/month for 50,000 | alternative mailer |
| Clerk | **50,000 MRU** per app ([Clerk](https://clerk.com/pricing)) [official] | 25 USD/month (20 annual), 0.02 USD per extra MRU | US processor, extra DPA |
| Auth0 | **25,000 MAU** ([Auth0](https://auth0.com/pricing)) [official] | 35 USD/month for only 500 MAU (B2C Essentials) | steep first step |
| Supabase Auth | **50,000 MAU**, but **free projects pause after 1 week of inactivity** ([Supabase](https://supabase.com/pricing)) [official] | 25 USD/month, 100k MAU | pausing is bad for a seasonal trip app |
| Firebase Auth | **50,000 MAU** no-cost; SMS billed ([Firebase](https://firebase.google.com/pricing)) [official] | pay as you go | Google processor |

Email OTP alone needs no Sign in with Apple; adding Google Sign-In on iOS makes an equivalent privacy login mandatory (4.8). Both stores then require account deletion (§1).

### 3.2 Cloudflare at 1k / 10k / 100k MAU

Prices: Workers Paid 5 USD/month with 10M requests, then 0.30 USD/M ([Workers](https://developers.cloudflare.com/workers/platform/pricing/)); Durable Objects 1M requests included, then 0.15 USD/M; duration billed at 128 MB but **not while idle and hibernatable**; SQLite 50M rows written, 5 GB stored included; Free plan 100k requests/day and fails instead of billing ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)) [official].

Assumption [inferred]: an active user generates about **150 API requests a month** (opens, pushes, ~30 s polling while open, `SPEC.md` §5.3), each hitting the Worker and one Durable Object, plus about 0.3 login emails a month. Static assets are free.

| MAU | Requests/month | Plan | Estimated cost |
|---|---|---|---|
| 1,000 | ~150k (≈5k/day) | Free | **0** |
| 10,000 | ~1.5M (≈50k/day, August peaks may pass 100k/day) | Paid | **~5 USD/month** (DO overage ≈ 0.08 USD; 3,000 emails included) |
| 100,000 | ~15M | Paid | **~20 USD/month**: Worker overage ≈ 1.5, DO requests ≈ 2.1, storage ≈ 1, emails ≈ 9.5 |

The backend never dominates the economics.

### 3.3 GDPR duties that grow with accounts

Today Quits stores names and amounts behind secret links. Accounts add **email addresses linkable across trips and devices, and credentials**, which raises the stakes on:
- erasure on request (Art. 17) and answering within a month (Art. 12(3)), on top of the stores' in-app deletion;
- a **processing agreement with every processor** (Art. 28): Cloudflare's DPA is part of its terms; an auth vendor or mailer adds one more;
- **records of processing** (Art. 30): the under-250-employees exemption does not cover regular, non-occasional processing;
- **breach notification to the Garante within 72 hours** (Art. 33) and to users when the risk is high (Art. 34);
- security of processing (Art. 32).

Sources: [GDPR text, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) [official]; [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) [official]. The privacy page (`SPEC.md` §10.2) would need a rewrite and the "no accounts" promise would go.

## 4. Market

### 4.1 Competitors

| App | Model and price (IT store unless noted) | Proxy for size | Recent change |
|---|---|---|---|
| **Splitwise** | Free with **3-4 expenses/day**, ads and a cooldown; Pro IAP list on the IT App Store: 0,99-47,99 €, mostly **2,99 €** and **29,99 €** [store](https://apps.apple.com/it/app/splitwise/id458023433); US: 4.99 USD/month, 39.99 USD/year (`splitwise-inventory.md`) | Play **10M+**, 3.97★ from **194,640** ratings [store](https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile); IT App Store 4.5★, 4,227 ratings | daily limit since 2023, a stream of "Splitwise alternative" posts ([flatmateflow](https://www.flatmateflow.com/blog/splitwise-daily-limit), [areweeven](https://www.areweeven.com/blog/splitwise-free-vs-pro-2026)) [secondary] |
| **Tricount** (bunq) | **"Free. No ads. No limits."**; Premium (CSV/PDF export, stats, personal mode) discontinued with the new app; monetized by funnelling users to bunq ([tricount help, 2026-10-02](https://help.tricount.com/d/61452)) [official] | Play **10M+**, 4.77★ from **195,332** ratings [store](https://play.google.com/store/apps/details?id=com.tribab.tricount.android) | Premium removed 2026-10-02 |
| **Settle Up** | Free with ads (one every 3 expenses), no daily cap; Premium **3,99 €/month, 21,99 €/year**, Group Premium 6,99 €/week to **179,99 € lifetime** [store](https://apps.apple.com/it/app/settle-up-group-expenses/id737534985) | Play **1M+**, 4.73★ from **50,435** [store](https://play.google.com/store/apps/details?id=cz.destil.settleup); IT App Store 4.8★, 1,231 | none found |
| **Splid** | Free, no sign-up, offline; **one-time** "Splid Plus" **3,99 €**, "2 gruppi" 2,99 € [store](https://apps.apple.com/it/app/splid-split-group-bills/id991473495) | Play **1M+**, 4.87★ from **87,072** [store](https://play.google.com/store/apps/details?id=splid.teamturtle.com.splid); IT App Store 4.8★, 7,036 | none found |
| **Spliit** | Free, open source, web only, donations | GitHub **2,978 stars**, 510 forks, active 2026-10-08 ([GitHub](https://github.com/spliit-app/spliit)) [official] | n/a |
| **Kittysplit** | Free, web-first, no registration; Android IAP 0.99-149.99 USD | Play **10K+**, 4.94★ from 555 [store](https://play.google.com/store/apps/details?id=com.kittysplit) | n/a |
| Recent entrants (examples) | Splito (open source): Play **1K+**, 169 ratings [store](https://play.google.com/store/apps/details?id=com.canopas.splito); "SettleUp: Split & Settle": Play **100+** [store](https://play.google.com/store/apps/details?id=com.settleup.settleup) | | |

**Saturation**: one search for "Splitwise limits" returns more than ten 2025-2026 apps that each run SEO blogs against Splitwise (split-circle, splitt-app, areweeven, hipposplit, getfinny, goodshare, flatmateflow, splitterup, usefairsplit, famzam, trip-count, countclub, bananasplitapp, splittyapp, spliit.pro; see the links above) [secondary]. The niche of "no limits, no ads, no sign-up, works offline" is filled at zero price by Tricount and, nearly, by Splid.

### 4.2 Downloads and conversion an unmarketed indie app can expect

- RevenueCat *State of Subscription Apps 2026* (115k apps, 16B USD): freemium download-to-paid **2.1%** median at day 35, hard paywall 10.7%; Western Europe median **2.0%**; **17.3%** of new apps reach 1,000 USD/month in year one, **4.6%** reach 10,000 within two years; **median ≈ 72 USD/month one year after launch** (IQR 16-429 USD); apps launched in 2025 or later take **3%** of all subscription revenue; about **72% of annual subscribers cancel within year 1** ([report](https://www.revenuecat.com/state-of-subscription-apps), [summary](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)) [official, vendor data]. Survivorship bias: these are apps that already integrated a paywall SDK.
- A public indie recap: a bill-splitting and tip app got about **50 downloads and 0 USD in its first year** ([via search summary of Roman Koch's 2025 recap](https://medium.com/@romankoch/my-2025-recap-as-an-indie-developer-6846593eaad6); the page itself returned 403) [secondary, unverified].
- Group apps have a built-in loop (each trip brings 3-6 friends), but in a group only **one person needs to pay** (Settle Up's Group Premium exists for this reason), which lowers per-download conversion [inferred].

## 5. Scenarios, year 1

Assumptions [inferred]: downloads across both stores of **300 / 2,000 / 15,000** (pessimistic, realistic, optimistic: between the new entrants above and a small fraction of Splid). Net per sale after 22% VAT and a 15% store fee: one-time **3,99 € → 2.78 €**; yearly subscription **14,99 € → 10.44 €**; average tip 2,99 € → 2.08 €. Conversion: one-time 1 / 2 / 4%; subscription 0.5 / 1 / 2%; tips 0.1 / 0.3 / 0.5%.

Cash costs: **free model ≈ 150 €** (Apple 99 €, Google ≈ 22 € once, Cloudflare 0-52 €); **monetized ≈ 250 €** on the occasional tax route (+ ≈ 100 € filing), **≈ 1,550 €** on the partita IVA route (+ ≈ 1,400 €).

| Model | Pessimistic | Realistic | Optimistic |
|---|---|---|---|
| Free (no IAP, non-trader) | 0 − 150 = **−150 €** | **−150 €** | **−150 €** |
| One-time unlock 3,99 € | 8 − 250 = **−242 €** | 111 − 250 = **−139 €** | 1,668 − 250 = **+1,418 €** (P.IVA route: +118 €) |
| Subscription 14,99 €/year | 21 − 250 = **−229 €** | 209 − 250 = **−41 €** | 3,132 − 250 = **+2,882 €** (P.IVA route: +1,582 €) |
| Tip jar | 0 − 250 = **−250 €** | 12 − 250 = **−238 €** | 156 − 250 = **−94 €** |

Positive results are then taxed at about 35% (IRPEF 33% plus surcharges). Sanity check: the realistic subscription (209 €/year) sits below RevenueCat's median (≈ 72 USD/month), the optimistic one (≈ 260 €/month) near its top quartile.

**Opportunity cost of the rewrite** (§7.3, not in the table): 220-350 hours hand-written with React Native/Expo, valued at an assumed 25 €/hour = **5,500-8,750 €**; or 60-100 human hours if agents write the code as they did for the PWA (= 1,500-2,500 €). Plus 20-40 hours/year of upkeep. Break-even downloads on cash alone, at the realistic conversions: one-time ≈ 4,500, subscription ≈ 2,400; including the agent-driven opportunity cost: about **40,000** and **22,000** [inferred].

## 6. Cheaper alternatives

| Option | Cost | Gains | Loses or keeps |
|---|---|---|---|
| **Stay PWA** (today) | 0 € (Workers Free, `SPEC.md` §11.7) | no review, no store policy churn, one codebase, no accounts | no store discoverability; iOS push only for installed web apps (iOS 16.4+) ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); Safari's **7-day cap on script-writable storage** does not apply to Home Screen web apps ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)), and installed apps are likelier to get `persist()` granted ([WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)) [official]; eviction under disk pressure remains possible, which Quits already absorbs because the Durable Object is the source of truth (`SPEC.md` §5.2) |
| **Play Store only, via TWA** (e.g. PWABuilder/Bubblewrap) | 25 USD once | a Play listing and search presence on Android, same code and backend | 12 testers × 14 days; Data safety form; DSA declaration (non-trader if free); yearly target-API bump of the wrapper; any digital sale must use Play Billing |
| **iOS: Add to Home Screen only** | 0 € | already built (`SPEC.md` §5.6) | no App Store presence |
| **Native rewrite + accounts + both stores** | 99 €/year + 25 USD + rewrite | native push, widgets, share extension, better storage guarantees, store search | §7 |

## 7. Native or cross-platform rewrite

### 7.1 What native adds, weighed against this app

| Capability | Value for Quits |
|---|---|
| Push notifications | High in general ("Anna added an expense"), but **out of scope** in `SPEC.md` §2.3; reachable on the PWA too (Android, installed iOS 16.4+) |
| Reliable storage on iOS | Moderate: the installed PWA is exempt from the 7-day cap and the server holds the truth; native removes the iOS cookie bridge (`SPEC.md` §5.5) |
| Store discoverability | Low in practice: the category is led by 10M+ apps with about 195k ratings each |
| Widgets, share extension (share a receipt into Quits) | Nice to have; receipts are in the fog (`SPEC.md` §2.2) |
| Background sync on iOS | Best effort only (BGTaskScheduler) [inferred]; the PWA already syncs in the background on Android |
| Apple Pay-style payments | Not needed: in-app payments are out of scope (§2.3); settle-up links already exist (#37) |

### 7.2 Code reuse by option

Measured on `origin/main` (2026-10-09), production lines without tests: `domain/` 1,938 (3,398 with tests), `worker/` 673, `src/` 10,683, of which screens 6,023, components 780, i18n 1,246, sync 555, IndexedDB 407, PWA/service worker 282.

| Part | React Native / Expo | Flutter | Swift + Kotlin |
|---|---|---|---|
| `domain/` (zod schemas, fold, splits, balances, chart models) | **Reused as is** (pure TypeScript) [inferred] | Port to Dart, re-test | Port twice (or Kotlin Multiplatform) |
| i18n dictionaries | Reused | Port | Port ×2 |
| Sync client (op-log push/pull) | Mostly reused; IndexedDB, BroadcastChannel and service-worker Background Sync replaced | Rewrite | Rewrite ×2 |
| Local storage (IndexedDB via `idb`) | Rewrite on **expo-sqlite** (transactions, KV store, `localStorage` shim) ([Expo](https://docs.expo.dev/versions/latest/sdk/sqlite/)) [official] or MMKV | sqflite/drift | Core Data/SQLite, Room |
| Screens and components (Tailwind) | Rewrite with RN primitives (StyleSheet or a Tailwind-for-RN layer, a new dependency) | Rewrite | Rewrite ×2 |
| Charts (visx is DOM-only) | Rewrite: **Victory Native XL** (Skia + Reanimated, bar/line/area/pie) ([docs](https://nearform.com/open-source/victory-native/docs/)) [official] or react-native-svg + d3-scale; chart models reused | fl_chart or similar | Swift Charts, Compose libraries |
| Worker + Durable Objects | **Stays**, plus auth endpoints | Stays | Stays |
| E2E tests (Playwright, 22 files) | Rewrite (Maestro/Detox) | integration_test | XCTest/Espresso |

### 7.3 Effort and upkeep

Estimates for one developer, evenings at about 10 h/week [inferred]:

| | RN/Expo | Flutter | Native ×2 |
|---|---|---|---|
| Rewrite of the client | 150-250 h | 250-400 h | 450-700 h |
| Accounts (OTP + Sign in with Apple/Google, deletion, migration of existing trips, privacy rewrite) | 40-60 h | 40-60 h | 50-80 h |
| IAP (e.g. RevenueCat, free under 2,500 USD/month tracked ([RevenueCat](https://www.revenuecat.com/pricing/)) [official]), store listings, review rounds, the 14-day Play test | 30-40 h | 30-40 h | 40-60 h |
| **Total** | **220-350 h ≈ 5-8 months** | **320-500 h ≈ 8-12 months** | **540-840 h ≈ 13-20 months** |

Agent-written code (as for the PWA, built 2026-10-03 to 2026-10-06) cuts the writing, not the human parts: device testing, store consoles, review back-and-forth, closed testing.

**Build tooling**: EAS Free gives **15 iOS + 15 Android builds a month** (low priority), Starter 19 USD/month, 1-4 USD per extra build ([Expo](https://expo.dev/pricing)) [official]; local builds are free but iOS needs **macOS** with Xcode, fastlane and CocoaPods ([Expo](https://docs.expo.dev/build-reference/local-builds/)) [official].

**Upkeep, about 20-40 h/year** [inferred]: Apple's yearly Xcode/SDK minimum, Play's target API every 31 August, framework upgrades, renewing the Apple membership, age-rating and Data safety questionnaires, DSA declarations, and keeping the PWA alive for friends without the app (or dropping it).

## 8. Recommendation

**Do not rewrite and do not publish: keep Quits a PWA without accounts.** The category is saturated and already free (Tricount: no ads, no limits), so every realistic scenario loses money in cash terms and none repays 220+ hours of rewrite. Pay only the 25 USD for a free, non-trader Play TWA if you want a store presence as an experiment.

## Sources

Apple: [enrollment](https://developer.apple.com/programs/enroll/), [Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Small Business Program](https://developer.apple.com/app-store/small-business-program/), [DSA trader](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/), [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [privacy details](https://developer.apple.com/app-store/app-privacy-details/), [DMA in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/). Google: [registration](https://support.google.com/googleplay/android-developer/answer/6112435), [testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465), [service fees](https://support.google.com/googleplay/android-developer/answer/112622), [June 2026 fees](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [target API](https://developer.android.com/google/play/requirements/target-sdk), [TWA](https://developer.chrome.com/docs/android/trusted-web-activity). Cloudflare: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Email Service](https://developers.cloudflare.com/email-service/platform/pricing/). WebKit: [7-day cap](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), [storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). The other sources are linked inline.
