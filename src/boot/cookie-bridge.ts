/** One trip the bridge carries: enough to find it again and to know who this device was in it (SPEC.md §5.5). */
export interface BridgeEntry {
  tripId: string;
  token: string;
  /** Null while "chi sei?" has not been answered. */
  participantId: string | null;
}

export interface Bridge {
  deviceId: string;
  /** Most recently used first. */
  trips: BridgeEntry[];
}

/** The cap keeps the cookie under the 4 KB limit (SPEC.md §5.5). */
export const BRIDGE_LIMIT = 10;

const VERSION = 1;

/** Compact on purpose: each trip is a list of three, not an object, so the percent-encoding stays small. */
export const encodeBridge = ({ deviceId, trips }: Bridge): string =>
  encodeURIComponent(JSON.stringify({ v: VERSION, d: deviceId, t: trips.slice(0, BRIDGE_LIMIT).map((t) => [t.tripId, t.token, t.participantId]) }));

const isEntry = (raw: unknown): raw is [string, string, string | null] =>
  Array.isArray(raw) && raw.length === 3 && typeof raw[0] === "string" && typeof raw[1] === "string" && (raw[2] === null || typeof raw[2] === "string");

/** What the cookie holds, or null when it is missing or not ours. A damaged trip is dropped, the rest is kept. */
export function decodeBridge(raw: string): Bridge | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { v, d, t } = parsed as Record<string, unknown>;
  if (v !== VERSION || typeof d !== "string" || !Array.isArray(t)) return null;
  const trips = t.filter(isEntry).map(([tripId, token, participantId]) => ({ tripId, token, participantId }));
  return { deviceId: d, trips: trips.slice(0, BRIDGE_LIMIT) };
}
