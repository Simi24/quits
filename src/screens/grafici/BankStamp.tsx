import type { ChartModel } from "../../../domain";

/** The small multiples in miniature, for the postcard. */
export const BankStamp = ({ model }: { model: ChartModel }) => {
  const { bank, timeline } = model;
  const D = Math.max(1, timeline.dates.length);
  const rh = 82 / Math.max(1, bank.participantIds.length);
  const x = (t: number) => (t / D) * 66;
  const lo = Math.min(bank.lo, -1);
  const hi = Math.max(bank.hi, 1);
  return (
    <svg viewBox="0 0 66 82" aria-hidden="true">
      {bank.participantIds.map((id, r) => {
        const yv = (v: number) => r * rh + 2 + ((rh - 4) * (hi - v)) / (hi - lo);
        let d = `M0 ${yv(0).toFixed(1)}`;
        bank.steps.forEach((s, k) => {
          if (k) d += `H${x(s.t).toFixed(1)}`;
          d += `V${yv(s.balances[id]!).toFixed(1)}`;
        });
        d += `H${x(Math.max(bank.horizon, bank.steps.at(-1)?.t ?? 0)).toFixed(1)}`;
        const last = bank.steps.at(-1)!.balances[id]!;
        return (
          <g key={id}>
            <line x1={0} x2={66} y1={yv(0)} y2={yv(0)} style={{ stroke: "var(--line)" }} />
            <path d={d} fill="none" style={{ stroke: `var(--${last >= 0 ? "pos" : "neg"})` }} strokeWidth={1.6} />
          </g>
        );
      })}
    </svg>
  );
};
