import { clearCookie } from './cookie';
import { wipeAll } from './db';
import { collect } from './diagnostics';
import { randomToken, tokenFrom } from './ids';
import { promptInstall } from './install';
import { logEvent } from './log';
import { addFakeOp, fakeSync } from './outbox';
import { saveTrip, type AppState } from './state';
import { requestPersist } from './storage';

// Each handler returns a short message shown at the top of the page ("" for none).
export async function runAction(state: AppState, action: string, el: HTMLElement): Promise<string> {
  switch (action) {
    case 'new-trip':
      location.assign(`/v/#${randomToken()}`);
      return '';
    case 'pick':
      if (!state.trip) return '';
      await saveTrip(state, { ...state.trip, name: el.dataset['name'] ?? null });
      await logEvent('identity', `chi sei = ${state.trip?.name}`);
      await requestPersist();
      return 'Identità salvata in IndexedDB e nel cookie.';
    case 'not-me':
      if (!state.trip) return '';
      await saveTrip(state, { ...state.trip, name: null });
      await logEvent('identity', 'non sono io');
      return '';
    case 'add-op':
      await addFakeOp(state);
      return '';
    case 'sync':
      await fakeSync(state);
      return '';
    case 'install':
      await promptInstall();
      return '';
    case 'persist':
      await requestPersist();
      return '';
    case 'copy-link':
      return copy(`${location.origin}/v/#${state.trip?.token ?? ''}`, 'Link copiato.');
    case 'copy-report':
      return copyReport(state);
    case 'wipe':
      await wipeAll();
      clearCookie();
      location.replace('/v/');
      return '';
    default:
      return '';
  }
}

export async function openPasted(input: string): Promise<string> {
  const token = tokenFrom(input);
  if (!token) return 'Link o token non valido.';
  location.assign(`/v/#${token}`); // hashchange in main.ts reloads
  return '';
}

// Safari only allows clipboard writes started synchronously inside the tap, so the
// report is handed over as a promise inside a ClipboardItem; writeText is the fallback.
async function copyReport(state: AppState): Promise<string> {
  const ok = 'Diagnostica copiata: incollala nella issue #11.';
  const text = collect(state).then((r) => JSON.stringify(r, null, 2));
  if ('ClipboardItem' in window && navigator.clipboard?.write) {
    try {
      const blob = text.then((t) => new Blob([t], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return ok;
    } catch {
      // fall through
    }
  }
  return copy(await text, ok);
}

async function copy(text: string, ok: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return ok;
  } catch {
    return 'Copia non riuscita: apri "JSON completo" e copialo a mano.';
  }
}
