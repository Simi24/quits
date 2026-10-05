import { logEvent } from './log';

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void>; getTags(): Promise<string[]> };
};

export type SwInfo = { supported: boolean; controlled: boolean; activeState: string | null; scope: string | null; syncTags: string[] | string | null };

export function backgroundSyncSupported(): boolean {
  return 'ServiceWorkerRegistration' in window && 'sync' in ServiceWorkerRegistration.prototype;
}

export async function registerSw(): Promise<void> {
  if (!('serviceWorker' in navigator)) return logEvent('sw', 'non supportato');
  navigator.serviceWorker.addEventListener('controllerchange', () => void logEvent('sw-controllerchange'));
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const worker = reg.installing;
    worker?.addEventListener('statechange', () => void logEvent('sw-state', worker.state));
  } catch (e) {
    await logEvent('sw-error', String(e));
  }
}

export async function swInfo(): Promise<SwInfo> {
  if (!('serviceWorker' in navigator)) return { supported: false, controlled: false, activeState: null, scope: null, syncTags: null };
  const reg = (await navigator.serviceWorker.getRegistration()) as SyncRegistration | undefined;
  return {
    supported: true,
    controlled: Boolean(navigator.serviceWorker.controller),
    activeState: reg?.active?.state ?? null,
    scope: reg?.scope ?? null,
    syncTags: await syncTags(reg),
  };
}

// getTags() throws when the API exists but is disabled (e.g. headless, site setting).
async function syncTags(reg: SyncRegistration | undefined): Promise<string[] | string | null> {
  if (!reg?.sync) return null;
  try {
    return await reg.sync.getTags();
  } catch (e) {
    return `errore: ${String(e)}`;
  }
}

// Where Background Sync exists, ask the browser to wake the SW when back online.
export async function registerOutboxSync(): Promise<void> {
  if (!backgroundSyncSupported()) return;
  try {
    const reg = (await navigator.serviceWorker.ready) as SyncRegistration;
    await reg.sync?.register('outbox');
    await logEvent('sync-registered', 'tag=outbox');
  } catch (e) {
    await logEvent('sync-register-error', String(e));
  }
}
