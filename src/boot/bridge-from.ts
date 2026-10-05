import { BRIDGE_LIMIT } from "./cookie-bridge";
import type { Bridge } from "./cookie-bridge";

interface TripRecord {
  tripId: string;
  token: string | null;
  meId: string | null;
  lastUsedAt: string;
}

/** The bridge for this device: its trips that have a link, most recently used first (SPEC.md §5.5). */
export const bridgeFrom = (deviceId: string, metas: TripRecord[]): Bridge => ({
  deviceId,
  trips: metas
    .filter((meta): meta is TripRecord & { token: string } => meta.token !== null)
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
    .slice(0, BRIDGE_LIMIT)
    .map(({ tripId, token, meId }) => ({ tripId, token, participantId: meId })),
});
