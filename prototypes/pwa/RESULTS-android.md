# Prototipo PWA: risultati Android su emulatore (issue #11)

Eseguito da un agente il 2026-10-05, in autonomia, sui passi Android di `CHECKLIST.md`. iOS non è provato (niente Xcode).

## Ambiente

- Emulatore `sdk_gphone64_arm64`, Android 16 (API 36, immagine `google_apis`, senza account Google; Play Store solo stub).
- Chrome 133.0.6943.137 (quello preinstallato, non aggiornato).
- Prototipo servito in locale (`npm run build`, `vite preview --port 4173`) e raggiunto dall'emulatore come `http://localhost:4173` con `adb reverse` (contesto sicuro: service worker e cookie `Secure` funzionano). Nessun deploy pubblico.
- **Offline** = modalità aereo **e** server di preview spento: `adb reverse` passa dal canale adb e la modalità aereo da sola non lo taglia, quindi ogni prova "offline" ha entrambe le cose e la pagina può arrivare solo dalla cache del service worker.
- **Link "da un messaggio"**: intent `VIEW` senza pacchetto (quello che fa un'app di messaggistica) e, per il passo 8, un SMS vero ricevuto in Google Messages (`adb emu sms send`) e toccato. WhatsApp non c'è sull'emulatore.
- Pilotaggio: tocchi reali (`adb shell input`) per i pulsanti; lettura di diagnostica e IndexedDB via DevTools remoto di Chrome (`chrome_devtools_remote`), senza flag a riga di comando su Chrome.
- L'emulatore aveva un proxy globale `10.0.2.2:8080` senza nessuno in ascolto (niente internet): tolto per la prova e rimesso alla fine.

### Limite importante: niente WebAPK

"Installa" ha creato un **collegamento Chrome** (icona con il badge di Chrome, `WebappActivity`, `display: standalone`, `start_url` del manifest), **non una WebAPK**: sull'emulatore manca il Play Store vero e un account, e l'origine è `http://localhost`. Su un telefono vero con origine HTTPS pubblica Chrome crea una WebAPK. Conseguenze:

- storage, avvio, offline e Background Sync: il risultato vale anche per la WebAPK (gira nello stesso profilo di Chrome);
- **apertura dei link (passo 8)** e `persist()`: il risultato **non** è rappresentativo. Una WebAPK registra intent filter per il suo scope e Chrome la considera installata; il collegamento no (infatti `beforeinstallprompt` continua a scattare anche dopo l'installazione).

## Passi

| Passo | Atteso | Osservato | Evidenza |
|---|---|---|---|
| 1. Link finto, aperto "dal messaggio" | Si apre in Chrome col frammento | Ok: intent `VIEW` senza pacchetto, apre `ChromeTabbedActivity` su `/v/#DHpfB8DD5GdzG76v3buBWA` | `02-step1-link.png` |
| 2. Nome, `persisted()`, `beforeinstallprompt` | `persist()` probabilmente `false`; prompt `true` | Anna salvata in IndexedDB e cookie; `persist() -> false`; `beforeinstallprompt: true` (anche al primo caricamento, prima del viaggio) | JSON 1, `03-step2-anna.png` |
| 3. Offline, 2 spese, ricarica | Si carica dalla cache; coda 2; "Installa" disattivato | Ok: ricarica offline servita dal SW, coda 2, `online: false`, "Installa" disattivato con "Prima sincronizza la coda." | `04-step3-offline-reload.png` |
| 4. JSON 1 | Background Sync `true`, tag `["outbox"]` | Ok: `backgroundSyncSupported: true`, `syncTags: ["outbox"]`; cookie scade `2027-11-09` (400 giorni, letto dalla Cookie Store API) | `json1-chrome-before-install.json` |
| 5. Installazione con coda piena | Dal menu di Chrome | Menu "Add to Home screen", poi "Install" (l'altra scelta è "Create shortcut"), poi dialogo "Install app", poi il launcher chiede di aggiungere l'icona. Log `appinstalled`. Collegamento, non WebAPK (vedi sopra). Anche il pulsante "Installa" della pagina (dopo "Sincronizza") apre lo stesso dialogo `prompt()`. | `05`…`09`, `22-installa-button.png` |
| 6. Primo avvio dall'icona | Avvio da `idb`, stessa istanza, coda intatta | Ok, **ed era offline** (aereo + server spento): `displayMode: standalone`, `boot.source: idb`, istanza IndexedDB `NCo8YIYy` creata in `browser` (la stessa di Chrome), device id "da idb", Anna, coda 2. Il cookie non è servito. | `json2-app-first-launch.json`, `11-app-first-launch-offline.png` |
| 7. Background Sync ad app chiusa | `sw-sync` dal contesto `service-worker` | **Sì, anche con Chrome morto.** Terza spesa in coda nell'app offline (tag `outbox`), app e Chrome tolti dalle recenti: il processo di Chrome è terminato (non force-stop), resta un job JobScheduler persistente di Chrome in attesa di rete. Tolta la modalità aereo alle 15:29:17 (server riacceso): alle 15:29:18 Android avvia Chrome "for service BackgroundTaskJobService", alle 15:29:19 il log ha `[service-worker] sw-sync tag=outbox`; l'app è stata riaperta solo alle 15:31:26. | log di `json3-app-reopen-offline.json`, logcat (sotto) |
| 8. Link nuovo con app installata | App o Chrome? `#token` nell'URL all'avvio? | **Chrome**, sia con l'intent `VIEW` sia toccando il link nell'SMS in Google Messages (`ChromeTabbedActivity`, scheda normale, non Custom Tab). Il frammento arriva intero (`/v/#cFsl_…`). Con un collegamento è atteso; con una WebAPK va riprovato sul telefono. Nell'app, "Apri un altro link" incollando il link funziona e resta in standalone. | `15-step8-intent.png`, `19-sms-link-opened.png` |
| 9. Chiudi e riapri offline | Si carica | Ok: tutte le attività chiuse, aereo + server spento, avvio dall'icona: standalone, `boot.source: idb`, coda 3. | `json3-app-reopen-offline.json`, `20-step9-reopen-offline.png` |
| 9. JSON 4 dopo N giorni | | **Non fatto**: richiede giorni reali. | |

Logcat del passo 7 (ora locale, UTC+2):

```
17:29:18.958 I/ActivityManager: Start proc 6014:com.android.chrome/u0a153 for service {com.android.chrome/org.chromium.components.background_task_scheduler.internal.BackgroundTaskJobService}
```

## Risposte

- **L'app installata condivide IndexedDB e cookie con Chrome?** Sì: stessa istanza IndexedDB (`NCo8YIYy`, creata nel browser), stesso device id, stesso cookie. Quello che fa uno lo vede subito l'altro.
- **Trova viaggio, identità e coda dopo l'installazione?** Sì, da IndexedDB (`boot.source: idb`), con la coda piena (2 operazioni) intatta. Il ripristino dal cookie non serve su Android.
- **Si carica offline al primo avvio?** Sì: il primo avvio è stato fatto offline (aereo + server spento) e la pagina è arrivata dalla precache del service worker, già installato da Chrome.
- **Un secondo link aperto dopo va nell'app o in Chrome?** In Chrome (intent `VIEW` e SMS in Google Messages), col frammento intero. Valido per il collegamento creato qui; per una WebAPK va visto su un telefono vero. Comunque i dati non dipendono da dove si apre, perché lo storage è uno solo.
- **Background Sync scatta ad app chiusa?** Sì, anche con Chrome terminato: JobScheduler riavvia Chrome appena c'è rete validata e il SW riceve `sync` entro 1-2 secondi, minuti prima che l'app venga riaperta.
- **`storage.persist()` viene concesso?** No, `false` sia in Chrome sia nell'app installata (anche richiesto a mano dall'app). Con un collegamento Chrome non considera il sito installato, quindi va riprovato con una WebAPK; intanto non si può contare su `persist()`.
- **Con che URL parte l'app installata?** `http://localhost:4173/v/?source=pwa`, cioè lo `start_url` del manifest, senza frammento (`launchHref` nei JSON 2 e 3).

## Altro emerso

- **Uno slot solo per viaggio, nome e coda, condiviso tra Chrome e app.** Aprire il secondo link (in Chrome) ha sostituito il viaggio per tutti e due: riaprendo l'app dall'icona c'era il viaggio nuovo, senza nome; il nome "Anna" del primo viaggio si è perso (anche nel cookie), e le 3 spese del primo viaggio restavano in coda accanto al viaggio nuovo. Limite del prototipo, ma conferma che nell'app vera identità e coda vanno tenute **per token** (l'elenco dei viaggi già aperti della landing, issue #6).
- **La regola "installa solo a coda vuota" non serve su Android**: la coda sopravvive all'installazione. Resta per iOS.
- `beforeinstallprompt` scatta già al primo caricamento e continua a scattare dopo l'installazione col collegamento (Chrome non lo considera installato).
- Lo scatto di `sync` quando torna la rete avviene anche a pagina aperta in Chrome (15:24:43, passo 5), quindi il tag si consuma lì e non resta per dopo.

## Effetto sulle decisioni di #6 e #12

- **Link `/v/#<token>`**: regge su Android. Il frammento arriva intero dal messaggio a Chrome; l'app installata parte da `/v/?source=pwa` senza token e lo trova in IndexedDB. Nessun motivo per cambiarlo.
- **Ponte nel cookie**: su Android non serve (storage condiviso); non dà fastidio e resta per iOS. Il cookie scritto da script dura davvero 400 giorni su Chrome.
- **Header `Authorization`**: compatibile. Il token sta in IndexedDB, che il service worker legge, quindi il SW svegliato da Background Sync può mandare la coda all'API con l'header, senza pagina aperta. Il cookie non c'entra (il SW non legge `document.cookie`). Da qui una conseguenza per l'implementazione: l'invio della coda deve stare nel service worker (o in codice condiviso che il SW può eseguire), non solo nella pagina.

## Evidenza

JSON e screenshot sono nella scratchpad dell'agente, non nel repo (`json1-chrome-before-install.json`, `json2-app-first-launch.json`, `json3-app-reopen-offline.json`, `00`…`22-*.png`). I valori chiave sono riportati sopra.

## Da fare su un telefono vero

Passo 8 e `persist()` con una WebAPK vera (origine HTTPS pubblica), JSON 4 dopo qualche giorno, e Samsung Internet / Firefox.
