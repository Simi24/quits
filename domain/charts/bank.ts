import type { ParticipantId } from "../ids.ts";
import { resolveParticipant } from "../merge.ts";
import type { ChartContext } from "./context.ts";

export type BankEvent =
  | { kind: "expense"; id: string; description: string; amount: number; date: string }
  | { kind: "settlement"; id: string; fromParticipantId: ParticipantId; toParticipantId: ParticipantId; amount: number; date: string };

export type BankStep = {
  /** Days since the start of the first day; several events of one day are spread across it in the order they were written. */
  t: number;
  event: BankEvent | null;
  /** Everyone's balance after the event; the last step is the balances of Saldi. */
  balances: Record<ParticipantId, number>;
};

export type Bank = {
  participantIds: ParticipantId[];
  steps: BankStep[];
  /** Days drawn: those gone, or all of them. */
  horizon: number;
  peak: { amount: number; participantId: ParticipantId; date: string } | null;
  /** Who held the group's largest credit for most days. */
  bankId: ParticipantId | null;
  bankDays: number;
  /** Lowest and highest balance anyone reached, for the shared scale. */
  lo: number;
  hi: number;
};

type Raw = { sortKey: string; date: string; event: BankEvent; apply: (b: Record<ParticipantId, number>) => void };

/** Running balance per person, expenses and settlements, on one shared scale (SPEC.md §8.2, chart 8). Ignores the "Di chi" filter. */
export function bank(ctx: ChartContext): Bank {
  const { trip, timeline, expenses } = ctx;
  const participantIds = trip.participants.map((p) => p.id);
  const history = new Map(trip.history.map((h) => [h.opId, h.at]));
  const raws: Raw[] = [
    ...expenses.map((e): Raw => ({
      sortKey: `${e.date}|${e.at}|${e.id}`,
      date: e.date,
      event: { kind: "expense", id: e.id, description: e.description, amount: e.fullAmount, date: e.date },
      apply: (b) => {
        for (const p of e.payers) b[p.participantId] = (b[p.participantId] ?? 0) + p.amount;
        for (const [id, share] of Object.entries(e.shares)) b[id] = (b[id] ?? 0) - share;
      },
    })),
    ...trip.settlements
      .filter((s) => !s.deleted)
      .map((s): Raw => {
        const from = resolveParticipant(trip, s.fromParticipantId);
        const to = resolveParticipant(trip, s.toParticipantId);
        return {
          sortKey: `${s.date}|${history.get(s.opId) ?? ""}|${s.id}`,
          date: s.date,
          event: { kind: "settlement", id: s.id, fromParticipantId: from, toParticipantId: to, amount: s.amount, date: s.date },
          apply: (b) => {
            b[from] = (b[from] ?? 0) + s.amount;
            b[to] = (b[to] ?? 0) - s.amount;
          },
        };
      }),
  ].sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));

  const lastDay = Math.max(0, timeline.dates.length - 1);
  const bucketOf = (date: string) => {
    const index = timeline.dates.findIndex((d) => d >= date);
    return index < 0 ? lastDay : index;
  };
  const perBucket = new Map<number, number>();
  for (const raw of raws) perBucket.set(bucketOf(raw.date), (perBucket.get(bucketOf(raw.date)) ?? 0) + 1);
  const seen = new Map<number, number>();

  const current: Record<ParticipantId, number> = Object.fromEntries(participantIds.map((id) => [id, 0]));
  const steps: BankStep[] = [{ t: 0, event: null, balances: { ...current } }];
  for (const raw of raws) {
    const bucket = bucketOf(raw.date);
    const k = (seen.get(bucket) ?? 0) + 1;
    seen.set(bucket, k);
    raw.apply(current);
    steps.push({ t: bucket + k / ((perBucket.get(bucket) ?? 1) + 1), event: raw.event, balances: { ...current } });
  }

  const horizon = timeline.phase === "running" ? timeline.elapsed : timeline.dates.length;
  const held: Record<ParticipantId, number> = Object.fromEntries(participantIds.map((id) => [id, 0]));
  let peak: Bank["peak"] = null;
  let lo = 0;
  let hi = 0;
  steps.forEach((step, i) => {
    const end = Math.min(steps[i + 1]?.t ?? horizon, horizon);
    const creditors = participantIds.filter((id) => step.balances[id]! > 0).sort((a, b) => step.balances[b]! - step.balances[a]!);
    if (creditors[0] !== undefined) held[creditors[0]]! += Math.max(0, end - step.t);
    for (const id of participantIds) {
      const value = step.balances[id]!;
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
      if (value > (peak?.amount ?? 0)) peak = { amount: value, participantId: id, date: step.event?.date ?? timeline.dates[0] ?? "" };
    }
  });
  const leader = [...participantIds].sort((a, b) => held[b]! - held[a]!)[0];
  const bankId = leader !== undefined && held[leader]! > 0 ? leader : null;
  return { participantIds, steps, horizon, peak, bankId, bankDays: bankId ? Math.round(held[bankId]!) : 0, lo, hi };
}
