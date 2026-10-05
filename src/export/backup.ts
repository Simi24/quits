import type { Operation } from "../../domain";

interface BackupInput {
  tripId: string;
  operations: Operation[];
  exportedAt: string;
}

/**
 * The trip's operations as JSON (SPEC.md §7.6 item 12). The trip is a fold of them, so this is the whole trip.
 * It never carries the trip link: the token stays out of files that travel by mail and chat.
 */
export const buildBackup = ({ tripId, operations, exportedAt }: BackupInput): string =>
  JSON.stringify({ app: "quits", format: 1, tripId, exportedAt, operations }, null, 2);
