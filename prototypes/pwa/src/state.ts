import { writeCookie } from './cookie';
import { setKv, type FakeOp, type Instance, type Trip } from './db';

export type BootSource = 'link' | 'idb' | 'cookie' | 'none';

export type AppState = {
  instance: Instance;
  deviceId: string;
  deviceIdSource: 'idb' | 'cookie' | 'new';
  trip: Trip | null;
  outbox: FakeOp[];
  bootSource: BootSource;
  bootNote: string;
  launchHref: string;
};

// Every trip/identity change goes to IndexedDB and to the cookie mirror.
export async function saveTrip(state: AppState, trip: Trip | null): Promise<void> {
  state.trip = trip;
  await setKv('trip', trip);
  if (trip) writeCookie({ t: trip.token, n: trip.name, d: state.deviceId });
}

export async function saveOutbox(state: AppState, outbox: FakeOp[]): Promise<void> {
  state.outbox = outbox;
  await setKv('outbox', outbox);
}
