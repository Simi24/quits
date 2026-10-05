import type { StoredOperation } from "../domain/index.ts";
import type { Page } from "./trip-types.ts";

export function createLogTables(sql: SqlStorage) {
  sql.exec(`CREATE TABLE IF NOT EXISTS ops (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    op_id TEXT NOT NULL UNIQUE,
    op TEXT NOT NULL
  )`);
}

/**
 * Idempotent append (SPEC.md §6.3): an id already stored keeps its sequence number. The lookup comes
 * first because `INSERT OR IGNORE` on an AUTOINCREMENT table burns a number on every ignored retry,
 * and the sequence must have no gaps. The Durable Object is single-threaded, so nothing can slip in between.
 */
export function appendOperation(sql: SqlStorage, operation: StoredOperation) {
  const known = sql.exec<{ seq: number }>("SELECT seq FROM ops WHERE op_id = ?", operation.id).toArray()[0];
  if (known) return { status: "stored" as const, seq: known.seq };
  const { seq } = sql
    .exec<{ seq: number }>("INSERT INTO ops (op_id, op) VALUES (?, ?) RETURNING seq", operation.id, JSON.stringify(operation))
    .one();
  return { status: "appended" as const, seq };
}

export function readPage(sql: SqlStorage, after: number, limit: number): Page {
  const rows = sql
    .exec<{ seq: number; op: string }>("SELECT seq, op FROM ops WHERE seq > ? ORDER BY seq LIMIT ?", after, limit + 1)
    .toArray();
  return {
    operations: rows.slice(0, limit).map((row) => ({ seq: row.seq, operation: JSON.parse(row.op) as StoredOperation })),
    hasMore: rows.length > limit,
  };
}
