import type { DefaultSplit } from "./split.ts";
import type { ExpenseSnapshot } from "./expense.ts";
import type { ParticipantId } from "./ids.ts";
import type { OperationType } from "./operations.ts";

export type Participant = { id: ParticipantId; name: string };

export type ExpenseVersion = {
  opId: string;
  seq: number;
  by: ParticipantId;
  at: string;
  kind: "created" | "edited";
  /** The operation an edit was based on; null for the creation. */
  baseOpId: string | null;
  snapshot: ExpenseSnapshot;
  /** Sequenced while the trip was closed (SPEC.md §3.2). */
  afterClose: boolean;
};

/** Two edits of one expense made without knowledge of each other (SPEC.md §3.14). */
export type Conflict = {
  baseOpId: string;
  /** The edit sequenced last: it wins on the whole expense. */
  winnerOpId: string;
  /** The edits that lost; they stay in the versions and are restorable. */
  loserOpIds: string[];
};

export type ExpenseRecord = {
  id: string;
  deleted: boolean;
  /** The latest version by sequence, deleted or not. */
  snapshot: ExpenseSnapshot;
  versions: ExpenseVersion[];
  conflict: Conflict | null;
};

export type SettlementRecord = {
  id: string;
  opId: string;
  by: ParticipantId;
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amount: number;
  date: string;
  deleted: boolean;
  afterClose: boolean;
};

/** Everyone who ever entered the trip, in order of entry. `removed` ones are out of the trip until something uses them again. */
export type RosterEntry = { id: ParticipantId; name: string; removed: boolean };

export type CustomCategory = { id: string; name: string; emoji: string };

export type Merge = {
  opId: string;
  fromParticipantId: ParticipantId;
  intoParticipantId: ParticipantId;
  undone: boolean;
};

/** Why the fold skipped an operation's effect. The operation stays in the history. */
export type IgnoredReason =
  | "currency_has_expenses"
  | "unknown_participant"
  | "unknown_target"
  | "participant_in_use"
  | "invalid_merge";

export type HistoryEntry = {
  seq: number;
  opId: string;
  type: OperationType;
  by: ParticipantId;
  at: string;
  /** Sequenced while the trip was closed (SPEC.md §3.2). */
  afterClose: boolean;
  /** Not yet confirmed by the server: folded on top of the confirmed log. */
  pending: boolean;
  ignored: IgnoredReason | null;
};

/** The trip: a pure fold of its operations. */
export type Trip = {
  name: string;
  currency: string;
  from: string | null;
  to: string | null;
  defaultSplit: DefaultSplit;
  status: "open" | "closed";
  /** Operations sequenced after the close, in the current closed period. */
  changesAfterClose: number;
  deleted: boolean;
  roster: RosterEntry[];
  /** Active participants, in order of entry (removed and merged-away ones left out). */
  participants: Participant[];
  /** For each merged-away participant, the one they were folded into. */
  mergedInto: Record<ParticipantId, ParticipantId>;
  merges: Merge[];
  expenses: ExpenseRecord[];
  settlements: SettlementRecord[];
  categories: CustomCategory[];
  history: HistoryEntry[];
  lastSeq: number;
};
