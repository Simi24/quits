import { DurableObject } from "cloudflare:workers";
import { parseOperation } from "../domain/index.ts";
import type { StoredOperation } from "../domain/index.ts";
import { fieldOf } from "./field.ts";
import { directoryStub } from "./jurisdiction.ts";
import { appendOperation, createLogTables, readPage } from "./trip-log.ts";
import type { DeletedInfo, Gated, Page, PushResult } from "./trip-types.ts";

/** A deleted trip can be restored for 30 days, then it is purged (SPEC.md §3.2). */
export const RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** The operations that change server state too: they only arrive through their own endpoint (SPEC.md §3.13). */
const SERVER_ACTIONS = new Set(["TripCreated", "LinkRegenerated", "TripDeleted", "TripRestored"]);

type TripRow = { trip_id: string; deleted_at: number | null; deleted_by: string | null };

/** One trip: its operation log and its metadata (SPEC.md §6.5). Reached only through the Worker. */
export class Trip extends DurableObject<Env> {
  private readonly sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      createLogTables(this.sql);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS trip (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        trip_id TEXT NOT NULL,
        creator_label TEXT NOT NULL,
        deleted_at INTEGER,
        deleted_by TEXT
      )`);
    });
  }

  /** Starts the trip with its first operation. Returns that operation's sequence number. */
  async init(tripId: string, creatorLabel: string, created: StoredOperation): Promise<number> {
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("INSERT INTO trip (id, trip_id, creator_label) VALUES (1, ?, ?)", tripId, creatorLabel);
      return appendOperation(this.sql, created).seq;
    });
  }

  async push(raw: unknown[]): Promise<Gated<PushResult[]>> {
    return this.whenNotDeleted(() =>
      this.ctx.storage.transactionSync(() => raw.map((item) => this.pushOne(item))),
    );
  }

  async pull(after: number, limit: number): Promise<Gated<Page>> {
    return this.whenNotDeleted(() => readPage(this.sql, after, limit));
  }

  /** Appends the link-regenerated operation; the Worker rotates the token in the Directory. */
  async recordLinkRegeneration(operation: StoredOperation): Promise<Gated<number>> {
    return this.whenNotDeleted(() => appendOperation(this.sql, operation).seq);
  }

  async deleteTrip(operation: StoredOperation): Promise<Gated<{ seq: number } & DeletedInfo>> {
    const now = Date.now();
    const result = this.whenNotDeleted(() =>
      this.ctx.storage.transactionSync(() => {
        this.sql.exec("UPDATE trip SET deleted_at = ?, deleted_by = ?", now, operation.by);
        const { seq } = appendOperation(this.sql, operation);
        return { seq, ...deletedInfo(now, operation.by) };
      }),
    );
    if (result.status === "ok") await this.ctx.storage.setAlarm(now + RESTORE_WINDOW_MS);
    return result;
  }

  /**
   * Lifts the soft delete. Restoring a trip that is not deleted does nothing. Once the 30 days are
   * over the trip is as good as purged, even if the alarm has not run yet (or is running: it awaits
   * the Directory, which lets this request in), so a late restore can never be undone by the purge.
   */
  async restoreTrip(operation: StoredOperation): Promise<{ restored: boolean; seq: number | null } | "past_deadline"> {
    const { deleted_at: deletedAt } = this.row();
    if (deletedAt === null) return { restored: false, seq: null };
    if (Date.now() >= deletedAt + RESTORE_WINDOW_MS) return "past_deadline";
    const seq = this.ctx.storage.transactionSync(() => {
      this.sql.exec("UPDATE trip SET deleted_at = NULL, deleted_by = NULL");
      return appendOperation(this.sql, operation).seq;
    });
    await this.ctx.storage.deleteAlarm();
    return { restored: true, seq };
  }

  /** The only alarm is the purge of a deleted trip, 30 days after the delete. */
  override async alarm(): Promise<void> {
    const row = this.row();
    if (row.deleted_at === null) return;
    // The Directory first: if this throws, the alarm is retried and nothing is lost yet.
    await directoryStub(this.env).purgeTrip(row.trip_id);
    await this.ctx.storage.deleteAll();
  }

  private pushOne(item: unknown): PushResult {
    const parsed = parseOperation(item);
    if (!parsed.ok) {
      const id = fieldOf(item, "id");
      return { id: typeof id === "string" ? id : null, status: "rejected", reason: parsed.reason, detail: parsed.detail };
    }
    const { operation } = parsed;
    if (SERVER_ACTIONS.has(operation.type)) {
      return { id: operation.id, status: "rejected", reason: "server_action", detail: operation.type };
    }
    return { id: operation.id, ...appendOperation(this.sql, operation) };
  }

  private whenNotDeleted<T>(run: () => T): Gated<T> {
    const row = this.row();
    if (row.deleted_at !== null) return { status: "deleted", deleted: deletedInfo(row.deleted_at, row.deleted_by ?? "") };
    return { status: "ok", value: run() };
  }

  private row(): TripRow {
    return this.sql.exec<TripRow>("SELECT trip_id, deleted_at, deleted_by FROM trip").one();
  }
}

function deletedInfo(deletedAt: number, deletedBy: string): DeletedInfo {
  return {
    deletedBy,
    deletedAt: new Date(deletedAt).toISOString(),
    restoreUntil: new Date(deletedAt + RESTORE_WINDOW_MS).toISOString(),
  };
}
