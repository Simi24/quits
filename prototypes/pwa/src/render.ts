import type { Report } from './diagnostics';
import { canPrompt } from './install';
import { isInstalledContext, isIos } from './platform';
import type { AppState } from './state';

export const FAKE_NAMES = ['Anna', 'Bruno', 'Carla', 'Dario'];

const esc = (v: unknown): string =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const kib = (n: number | null): string => (n === null ? 'n/d' : `${(n / 1024).toFixed(0)} KiB`);

export function render(root: HTMLElement, state: AppState, report: Report, flash: string): void {
  root.innerHTML = `
    <header>
      <h1>Quits (prototipo)</h1>
      <p class="badge">Prototipo usa e getta per la issue #11. Dati finti.</p>
      <button data-action="copy-report" class="secondary">Copia diagnostica (JSON)</button>
    </header>
    ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
    <p class="note${state.bootSource === 'cookie' ? ' flash' : ''}">${esc(state.bootNote)}</p>
    ${tripSection(state)}
    ${outboxSection(state)}
    ${installSection(state)}
    ${storageSection(report)}
    ${diagnosticsSection(report)}
    ${logSection(report)}
    <section>
      <h2>Ricomincia il test</h2>
      <button data-action="wipe" class="secondary">Cancella IndexedDB e cookie</button>
    </section>`;
}

function tripSection(state: AppState): string {
  const pasteForm = `
    <form data-form="paste" class="row">
      <input name="link" placeholder="Incolla link o token" autocomplete="off" />
      <button type="submit" class="secondary">Apri</button>
    </form>`;
  if (!state.trip) {
    return `<section><h2>Viaggio</h2>
      <p>Nessun viaggio su questo dispositivo.</p>
      <button data-action="new-trip">Crea un link di viaggio finto</button>
      ${pasteForm}</section>`;
  }
  const link = `${location.origin}/v/#${state.trip.token}`;
  const who = state.trip.name
    ? `<p>Sei <strong>${esc(state.trip.name)}</strong>. <button data-action="not-me" class="link">Non sono io</button></p>`
    : `<p>Chi sei?</p><div class="row">${FAKE_NAMES.map((n) => `<button data-action="pick" data-name="${n}">${n}</button>`).join('')}</div>`;
  return `<section><h2>Viaggio finto</h2>
    <p class="mono">${esc(link)}</p>
    <div class="row"><button data-action="copy-link" class="secondary">Copia link</button></div>
    ${who}
    <details><summary>Apri un altro link</summary>${pasteForm}</details></section>`;
}

function outboxSection(state: AppState): string {
  const items = state.outbox.map((op) => `<li>${esc(op.desc)}, ${(op.cents / 100).toFixed(2)} €, ${esc(op.at)}</li>`).join('');
  return `<section><h2>Coda offline: ${state.outbox.length} operazioni</h2>
    ${items ? `<ul>${items}</ul>` : '<p>Coda vuota.</p>'}
    <div class="row">
      <button data-action="add-op" ${state.trip ? '' : 'disabled'}>Aggiungi spesa finta</button>
      <button data-action="sync" class="secondary">Sincronizza (finto)</button>
    </div>
    <p class="hint">Niente sincronizzazione automatica: la coda resta finché non premi Sincronizza, così si vede se sopravvive all'installazione.</p></section>`;
}

function installSection(state: AppState): string {
  const rule = `<p class="hint">Regola: proporre l'installazione solo con la coda vuota. Su iOS l'app installata non vede l'IndexedDB di Safari, solo i cookie.</p>`;
  const blocked = state.outbox.length > 0;
  let body: string;
  if (isInstalledContext()) body = '<p>Stai usando l’app installata.</p>';
  else if (canPrompt())
    body = `<button data-action="install" ${blocked ? 'disabled' : ''}>Installa</button>
      ${blocked ? '<p class="warn">Prima sincronizza la coda.</p>' : ''}`;
  else if (isIos())
    body = `<p>${blocked ? '<span class="warn">Prima sincronizza la coda.</span> Poi: ' : ''}tocca Condividi, poi <strong>Aggiungi alla schermata Home</strong> (con "Apri come app web" attivo).</p>`;
  else body = '<p>Nessun prompt di installazione ricevuto (ancora). Prova dal menu del browser.</p>';
  return `<section><h2>Installazione</h2>${body}${rule}</section>`;
}

function storageSection(r: Report): string {
  return `<section><h2>Storage</h2>
    <p>persisted(): <strong>${esc(r.storage.persisted)}</strong> · uso ${kib(r.storage.usage)} di ${kib(r.storage.quota)}</p>
    <button data-action="persist" class="secondary">Chiedi storage persistente</button></section>`;
}

function diagnosticsSection(r: Report): string {
  const rows: [string, unknown][] = [
    ['display-mode', r.displayMode],
    ['navigator.standalone', r.navigatorStandalone],
    ['piattaforma', r.platformGuess],
    ['online', r.online],
    ['URL all’avvio', r.launchHref],
    ['avvio da', r.boot.source],
    ['istanza IndexedDB', `${r.idb.instance.id} (creata ${r.idb.instance.createdAt} in ${r.idb.instance.createdIn})`],
    ['device id', `${r.idb.deviceId} (da ${r.idb.deviceIdSource})`],
    ['IDB viaggio', JSON.stringify(r.idb.trip)],
    ['IDB coda', r.idb.outbox.length],
    ['cookie', JSON.stringify(r.cookie.value)],
    ['cookie scade', r.cookie.expires],
    ['Background Sync', r.backgroundSyncSupported],
    ['tag sync in attesa', JSON.stringify(r.serviceWorker.syncTags)],
    ['beforeinstallprompt', r.install.promptFired],
    ['appinstalled', r.install.appInstalled],
    ['service worker', `${r.serviceWorker.activeState ?? 'nessuno'}, controlla la pagina: ${r.serviceWorker.controlled}`],
  ];
  return `<section><h2>Diagnostica</h2>
    <table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td class="mono">${esc(v)}</td></tr>`).join('')}</table>
    <div class="row"><button data-action="copy-report">Copia diagnostica (JSON)</button></div>
    <details><summary>JSON completo</summary><pre id="report">${esc(JSON.stringify(r, null, 2))}</pre></details></section>`;
}

function logSection(r: Report): string {
  const lines = r.log.map((e) => `<li><span class="mono">${esc(e.at.slice(5, 19).replace('T', ' '))}</span> [${esc(e.ctx)}] <strong>${esc(e.type)}</strong> ${esc(e.detail)}</li>`).join('');
  return `<section><h2>Eventi (ultimi ${r.log.length}, salvati in IndexedDB)</h2><ol class="log">${lines}</ol></section>`;
}
