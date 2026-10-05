import { logEvent } from './log';
import { saveOutbox, type AppState } from './state';
import { registerOutboxSync } from './sw';

export async function addFakeOp(state: AppState): Promise<void> {
  const n = state.outbox.length + 1;
  const op = { id: crypto.randomUUID(), at: new Date().toISOString(), desc: `Spesa finta ${n}`, cents: 1000 + n * 250 };
  await saveOutbox(state, [...state.outbox, op]);
  await logEvent('op-queued', `${op.desc} (online=${navigator.onLine})`);
  await registerOutboxSync();
}

// Fake push: a real network round trip (query string bypasses the precache); empties the outbox on success.
export async function fakeSync(state: AppState): Promise<void> {
  try {
    const res = await fetch(`/icon.svg?probe=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sent = state.outbox.length;
    await saveOutbox(state, []);
    await logEvent('sync-ok', `${sent} operazioni inviate (finto)`);
  } catch (e) {
    await logEvent('sync-failed', String(e));
  }
}
