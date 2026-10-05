import { DurableObject } from "cloudflare:workers";

export type TokenState = "active" | "retired";
export type TokenEntry = { tripId: string; state: TokenState };

/**
 * The singleton Directory (SPEC.md §6.5): one row per token ever issued, keyed by the token's
 * SHA-256. A token itself is never stored, here or anywhere on the server.
 */
export class Directory extends DurableObject<Env> {
  private readonly sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS tokens (
        token_hash TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'retired'))
      )`);
      this.sql.exec("CREATE INDEX IF NOT EXISTS tokens_by_trip ON tokens (trip_id)");
    });
  }

  async resolve(tokenHash: string): Promise<TokenEntry | null> {
    const row = this.sql
      .exec<{ trip_id: string; state: TokenState }>("SELECT trip_id, state FROM tokens WHERE token_hash = ?", tokenHash)
      .toArray()[0];
    return row ? { tripId: row.trip_id, state: row.state } : null;
  }

  async register(tokenHash: string, tripId: string): Promise<void> {
    this.sql.exec("INSERT INTO tokens (token_hash, trip_id, state) VALUES (?, ?, 'active')", tokenHash, tripId);
  }

  /** Retires the old token and adds the new one in one step. False when the old one was no longer active. */
  async rotate(oldHash: string, newHash: string): Promise<boolean> {
    return this.ctx.storage.transactionSync(() => {
      const retired = this.sql
        .exec<{ trip_id: string }>("UPDATE tokens SET state = 'retired' WHERE token_hash = ? AND state = 'active' RETURNING trip_id", oldHash)
        .toArray()[0];
      if (!retired) return false;
      this.sql.exec("INSERT INTO tokens (token_hash, trip_id, state) VALUES (?, ?, 'active')", newHash, retired.trip_id);
      return true;
    });
  }

  /** The trip is gone for good: its tokens lead nowhere (SPEC.md §6.4, a purged trip). */
  async purgeTrip(tripId: string): Promise<void> {
    this.sql.exec("DELETE FROM tokens WHERE trip_id = ?", tripId);
  }
}
