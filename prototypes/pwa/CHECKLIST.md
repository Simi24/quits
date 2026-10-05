# Prototipo PWA: checklist di prova (issue #11)

Prototipo usa e getta, dati finti. Domanda: link del viaggio, "chi sei?" e coda offline sopravvivono all'installazione su iOS e Android?

## Come l'app installata trova il viaggio

Il link è `/v/#<token>`: il frammento non fa parte di `start_url` (`/v/?source=pwa`), quindi l'app installata parte senza token e lo cerca, in ordine:

1. nel frammento dell'URL (se l'app è stata aperta da un link);
2. in IndexedDB (`quits-proto`: viaggio, nome, id dispositivo, coda);
3. nel cookie `quits_proto` (token + nome + id dispositivo; `Path=/v/`, `SameSite=Lax`, `Secure`, `Max-Age` 400 giorni). Se IndexedDB è vuoto ma il cookie c'è, ripristina e lo scrive in alto.

La coda **non** è nel cookie: serve a vedere se si perde (regola: proporre l'installazione solo a coda vuota). La sincronizzazione è finta e solo manuale (pulsante "Sincronizza").

## Prima di iniziare

- Serve un URL HTTPS vero (vedi sotto): su `http://` il service worker e il cookie `Secure` non funzionano.
- Apri il link **nel browser vero** (Safari, Chrome), non nel browser interno di WhatsApp/Telegram/Instagram: lì lo storage è separato e non si installa. Se lo apri da un'app di messaggistica, annota quale e come si è aperto.
- Per ricominciare da zero: "Cancella IndexedDB e cookie" in fondo (e rimuovi l'icona dalla Home).

## iPhone (Safari)

1. In Safari apri l'URL, tocca "Crea un link di viaggio finto", poi "Copia link". Mandatelo (es. su WhatsApp) e aprilo da lì in Safari.
2. Scegli un nome (es. Anna). Annota `persisted()`.
3. Attiva la modalità aereo. Tocca 2 volte "Aggiungi spesa finta". Ricarica la pagina: si carica offline? La coda è ancora 2?
4. "Copia diagnostica" e salva il JSON (**JSON 1: Safari prima dell'installazione**). Annota "cookie scade" (Safari limita i cookie scritti da script a 7 giorni?).
5. Ancora in modalità aereo: Condividi, Aggiungi alla schermata Home ("Apri come app web" attivo). Apri l'app dall'icona. Si carica offline? (Ci si aspetta di no: l'app ha una cache sua.) Annota cosa vedi.
6. Togli la modalità aereo, apri l'app installata. Controlla: banner "ripristinati dal cookie"? Nome e token uguali a Safari? Id dispositivo "da cookie"? Coda (attesa: 0, rimasta in Safari)? "URL all'avvio" contiene `#token`? Copia la diagnostica (**JSON 2: app, primo avvio**).
7. Chiudi l'app (swipe), riaprila offline: si carica? Copia (**JSON 3: app, riavvio offline**).
8. Torna in Safari: la coda è ancora lì? Premi "Sincronizza", poi controlla che l'app installata non la veda (storage separati).
9. Link nuovo dopo l'installazione: crea un altro link finto in Safari e toccalo da WhatsApp. Si apre in Safari o nell'app? Nell'app, prova "Apri un altro link" incollandolo. Annota.
10. Dopo 2 o più giorni (meglio 8, per i 7 giorni di Safari): riapri app e Safari senza usarli prima. Viaggio, nome e coda ci sono ancora? Copia (**JSON 4: dopo N giorni**, scrivi N).

## Android (Chrome)

1. In Chrome apri l'URL, crea il link finto, mandatelo e aprilo dal messaggio.
2. Scegli un nome. Annota `persisted()` e se compare "beforeinstallprompt: true".
3. Modalità aereo, 2 spese finte, ricarica: si carica offline? Il pulsante "Installa" è disattivato con la coda piena?
4. Copia la diagnostica (**JSON 1: Chrome prima dell'installazione**). Annota "Background Sync" e "tag sync in attesa" (atteso: `["outbox"]`).
5. Installa: dal menu di Chrome (con la coda piena), oppure prima "Sincronizza" online e poi "Installa". Apri l'app dall'icona.
6. Controlla: avvio da `idb` (storage condiviso con Chrome)? Stessa "istanza IndexedDB" di Chrome? Coda intatta? Copia (**JSON 2: app, primo avvio**).
7. Con la coda piena e l'app chiusa, togli la modalità aereo e aspetta un minuto: nel log compare `sw-sync` con contesto `service-worker` (Background Sync scattato ad app chiusa)?
8. Link nuovo da WhatsApp con l'app installata: si apre nell'app o in Chrome? "URL all'avvio" contiene `#token`? Annota.
9. Chiudi e riapri offline, poi dopo qualche giorno come per iPhone (**JSON 3, JSON 4**).

## Facoltativo: Samsung Internet, Firefox per Android

Stessi passi di Android. Annota: compare `beforeinstallprompt`? Come si installa (menu)? L'app installata vede la stessa istanza IndexedDB? Firefox chiede il permesso per `persist()`?

## Cosa incollare nella issue #11

Per ogni telefono e browser: modello, versione del sistema, i JSON (1, 2, 3, 4) e una riga per passo con l'esito (ok / no / cosa è successo), soprattutto i passi 5, 6, 9 su iPhone e 6, 7, 8 su Android.

## Come pubblicarlo per il test

Serve HTTPS su un URL reale. **Non è stato pubblicato nulla**: ogni opzione sotto è un'azione dell'autore. Build:

```sh
cd prototypes/pwa
npm ci
npm run build
```

**A. Worker statico su `*.workers.dev` (consigliato).** `wrangler.jsonc` è già pronto (solo file statici, fallback SPA, nessun binding). Account Cloudflare del sito:

```sh
npx wrangler@4 login            # se non già autenticato
npx wrangler@4 deploy           # pubblica dist/ su https://quits-pwa-prototype.<sottodominio>.workers.dev
```

L'URL resta stabile tra un deploy e l'altro, quindi l'app installata continua a funzionare. A fine test: `npx wrangler@4 delete`.

**B. URL di anteprima di una versione.** Dopo il primo deploy di A, `npx wrangler@4 versions upload --preview-alias prova` dà `https://prova-quits-pwa-prototype.<sottodominio>.workers.dev` senza toccare la versione attiva. Ogni origin ha storage suo: non cambiare URL a metà prova.

**C. Senza account, temporaneo.** `npm run preview` più `cloudflared tunnel --url http://localhost:4173` dà un URL `https://*.trycloudflare.com` che cambia a ogni avvio e richiede il computer acceso: va bene per i passi 1-8, non per la prova dopo N giorni.
