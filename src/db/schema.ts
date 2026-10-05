import type { DBSchema } from "idb";
import type { Operation, StoredOperation } from "../../domain";
import type { Lang } from "../i18n";
import type { Access, Deletion } from "../sync/types";

/** One trip on this device. Identity is the `tripId`; the token is an attribute, replaced when a new link of the trip is opened (SPEC.md §5.2). */
export interface TripMeta {
  tripId: string;
  /** The current link's token. Null for a trip made on this device before there was a server (S2). */
  token: string | null;
  /** The participant this device is, for this trip ("chi sei?"). Null until chosen. */
  meId: string | null;
  /** Counter for the next outbox entry, so pending operations keep the order they were written in. */
  nextOutbox: number;
  lastUsedAt: string;
  /** The last sequence pulled from the server. */
  lastSeq: number;
  /** What the server last said about the link and the trip's life. */
  access: Access;
  deletion: Deletion | null;
  /** Conflicts this person has seen and dismissed, by the operation that won. */
  seenConflicts: string[];
}

export interface OutboxEntry {
  tripId: string;
  n: number;
  operation: Operation;
}

/** An operation the server sequenced. */
export interface ConfirmedEntry {
  tripId: string;
  seq: number;
  operation: StoredOperation;
}

/** An operation the server refused: kept for the history, never sent again (SPEC.md §5.1). */
export interface RejectedEntry {
  tripId: string;
  id: string;
  operation: StoredOperation;
  reason: string;
  detail: string;
}

export type ThemeChoice = "system" | "light" | "dark";

/** Per-device values, one record under a fixed key. */
export interface DeviceRecord {
  key: "device";
  deviceId: string;
  lang: Lang | null;
  theme: ThemeChoice;
  /** The trip the app opens on start; null when the landing was left open. */
  lastTripId: string | null;
  /** The creator code this device has used successfully, so it is entered once (SPEC.md §4). */
  creatorCode: string | null;
  /** The first-use tip beside "+" was dismissed, or an expense was recorded: it is never shown again on this device (SPEC.md §7.6). */
  tipSeen: boolean;
}

export interface QuitsDb extends DBSchema {
  trips: { key: string; value: TripMeta; indexes: { byToken: string } };
  outbox: { key: [string, number]; value: OutboxEntry; indexes: { byTrip: string } };
  confirmed: { key: [string, number]; value: ConfirmedEntry; indexes: { byTrip: string } };
  rejected: { key: [string, string]; value: RejectedEntry; indexes: { byTrip: string } };
  device: { key: "device"; value: DeviceRecord };
}
