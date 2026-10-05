import { openDB, type DBSchema } from 'idb';

// PROTOTYPE (issue #11): "quits-proto", wipe me. Same name and stores as public/sw-sync.js.
export type Trip = { token: string; name: string | null };
export type FakeOp = { id: string; at: string; desc: string; cents: number };
export type Instance = { id: string; createdAt: string; createdIn: string };
export type LogEntry = { at: string; type: string; detail: string; ctx: string };

interface ProtoDB extends DBSchema {
  kv: { key: string; value: unknown };
  log: { key: number; value: LogEntry };
}

const dbPromise = openDB<ProtoDB>('quits-proto', 1, {
  upgrade(db) {
    db.createObjectStore('kv');
    db.createObjectStore('log', { autoIncrement: true });
  },
});

export async function getKv<T>(key: string): Promise<T | undefined> {
  return (await (await dbPromise).get('kv', key)) as T | undefined;
}

export async function setKv(key: string, value: unknown): Promise<void> {
  await (await dbPromise).put('kv', value, key);
}

export async function appendLog(entry: LogEntry): Promise<void> {
  await (await dbPromise).add('log', entry);
}

export async function readLog(): Promise<LogEntry[]> {
  return (await dbPromise).getAll('log');
}

export async function wipeAll(): Promise<void> {
  const db = await dbPromise;
  await db.clear('kv');
  await db.clear('log');
}
