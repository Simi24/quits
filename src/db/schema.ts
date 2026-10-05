import type { DBSchema } from "idb";
import type { Operation } from "../../domain";
import type { Lang } from "../i18n";

/** One trip on this device. Identity is the `tripId`; the token is an attribute that arrives with sync (SPEC.md §5.2). */
export interface TripMeta {
  tripId: string;
  /** The participant this device is, for this trip ("chi sei?"). Null until chosen. */
  meId: string | null;
  /** Counter for the next outbox entry, so pending operations keep the order they were written in. */
  nextOutbox: number;
  lastUsedAt: string;
}

export interface OutboxEntry {
  tripId: string;
  n: number;
  operation: Operation;
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
}

export interface QuitsDb extends DBSchema {
  trips: { key: string; value: TripMeta };
  outbox: { key: [string, number]; value: OutboxEntry; indexes: { byTrip: string } };
  device: { key: "device"; value: DeviceRecord };
}
