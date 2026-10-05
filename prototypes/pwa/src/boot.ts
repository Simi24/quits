import { readCookie } from './cookie';
import { getKv, setKv, type FakeOp, type Instance, type Trip } from './db';
import { randomToken, tokenFrom } from './ids';
import { logEvent } from './log';
import { context } from './platform';
import { saveTrip, type AppState } from './state';

// How a launch finds its trip: link fragment, else IndexedDB, else the cookie mirror.
// The installed app starts at /v/?source=pwa (no fragment), so it relies on the last two.
export async function boot(): Promise<AppState> {
  const instance = await ensureInstance();
  const cookie = readCookie();
  const storedDevice = await getKv<string>('deviceId');
  const deviceId = storedDevice ?? cookie?.d ?? randomToken();
  const deviceIdSource = storedDevice ? 'idb' : cookie?.d ? 'cookie' : 'new';
  if (!storedDevice) await setKv('deviceId', deviceId);

  const state: AppState = {
    instance,
    deviceId,
    deviceIdSource,
    trip: null,
    outbox: (await getKv<FakeOp[]>('outbox')) ?? [],
    bootSource: 'none',
    bootNote: '',
    launchHref: location.href,
  };

  const linkToken = tokenFrom(location.hash);
  const idbTrip = (await getKv<Trip | null>('trip')) ?? null;

  if (linkToken) {
    const name =
      idbTrip?.token === linkToken ? idbTrip.name
      : cookie?.t === linkToken ? cookie.n
      : null;
    state.bootSource = 'link';
    state.bootNote = idbTrip?.token === linkToken ? 'Viaggio dal link (già in IndexedDB).' : 'Viaggio dal link (nuovo su questo storage).';
    await saveTrip(state, { token: linkToken, name });
  } else if (idbTrip) {
    state.bootSource = 'idb';
    state.bootNote = 'Viaggio trovato in IndexedDB.';
    await saveTrip(state, idbTrip);
  } else if (cookie?.t) {
    state.bootSource = 'cookie';
    state.bootNote = 'IndexedDB vuoto: viaggio e identità ripristinati dal cookie.';
    await saveTrip(state, { token: cookie.t, name: cookie.n });
  } else {
    state.bootNote = 'Nessun viaggio: né link, né IndexedDB, né cookie.';
  }

  await logEvent('boot', `source=${state.bootSource} device=${deviceIdSource} outbox=${state.outbox.length}`);
  return state;
}

async function ensureInstance(): Promise<Instance> {
  const existing = await getKv<Instance>('instance');
  if (existing) return existing;
  const instance = { id: randomToken().slice(0, 8), createdAt: new Date().toISOString(), createdIn: context() };
  await setKv('instance', instance);
  await logEvent('idb-new-instance', `id=${instance.id}`);
  return instance;
}
