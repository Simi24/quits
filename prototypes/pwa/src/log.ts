import { appendLog, readLog, type LogEntry } from './db';
import { context } from './platform';

let listener: () => void = () => {};

export function onLogChange(fn: () => void): void {
  listener = fn;
}

export async function logEvent(type: string, detail = ''): Promise<void> {
  await appendLog({ at: new Date().toISOString(), type, detail, ctx: context() });
  listener();
}

export async function recentLog(limit = 60): Promise<LogEntry[]> {
  return (await readLog()).slice(-limit).reverse();
}
