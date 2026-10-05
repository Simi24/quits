import { logEvent } from './log';

export type StorageInfo = { persisted: boolean | null; usage: number | null; quota: number | null };

export async function requestPersist(): Promise<void> {
  if (!navigator.storage?.persist) return void logEvent('persist', 'API assente');
  const granted = await navigator.storage.persist();
  await logEvent('persist', `persist() -> ${granted}`);
}

export async function storageInfo(): Promise<StorageInfo> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  return { persisted, usage: est?.usage ?? null, quota: est?.quota ?? null };
}
