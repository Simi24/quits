import type { ChartModel } from "../../../domain";
import { Avatar } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import { ChartCard } from "./ChartCard";
import { NumbersTable } from "./NumbersTable";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { useChartFormat } from "./use-chart-format";
import { arrowNav } from "./use-arrow-nav";
import { useSelection } from "./use-selection";

interface PaidDueCardProps {
  model: ChartModel;
  table: boolean;
  onTable: () => void;
}

/** Chart 3: per person a bar of what they paid and a notch at what they were due; the difference in words (SPEC.md §8.2). */
export const PaidDueCard = ({ model, table, onTable }: PaidDueCardProps) => {
  const { t } = useDevice();
  const { trip, nameOf } = useTrip();
  const f = useChartFormat();
  const sel = useSelection<string>();
  const rows = model.paidDue;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.paid, r.due)));
  const pct = (v: number) => `${((Math.max(0, v) / max) * 100).toFixed(2)}%`;
  const words = (diff: number) => (diff > 0 ? t.charts.pvdOver(f.money(diff)) : diff < 0 ? t.charts.pvdShort(f.money(-diff)) : t.charts.pvdEven);
  const whoName = trip.participants.find((p) => p.id === model.who)?.name;

  const read = (id: string): ReadoutData | null => {
    const r = rows.find((x) => x.participantId === id);
    if (!r) return null;
    return {
      title: nameOf(id),
      value: f.signed(r.difference),
      rows: [
        { color: "var(--ink)", label: t.charts.kPaid, value: f.money(r.paid) },
        { color: "var(--ink-2)", label: t.charts.kDue, value: f.money(r.due) },
      ],
      notes: [words(r.difference)],
    };
  };

  return (
    <ChartCard id="pvd" title={t.charts.cPvd} sub={whoName ? t.charts.subHl(whoName) : t.charts.pvdNote} table={table} onTable={onTable}>
      {table ? (
        <NumbersTable
          head={[t.charts.thPerson, t.charts.thPaid, t.charts.thDue, t.charts.thDiff]}
          rows={rows.map((r) => [nameOf(r.participantId), f.money(r.paid), f.money(r.due), f.signed(r.difference)])}
        />
      ) : (
        <div ref={sel.ref} className="grid gap-2.5">
          <div className="pvd-key" aria-hidden="true">
            <span><i className="k-paid" />{t.charts.kPaid}</span>
            <span><i className="k-due" />{t.charts.kDue}</span>
            <span><i className="k-over" />{t.charts.kOver}</span>
            <span><i className="k-short" />{t.charts.kShort}</span>
          </div>
          <div className="pvd" role="group" aria-label={t.charts.cPvd} onKeyDown={arrowNav}>
            {rows.map((r) => {
              const tone = r.difference > 0 ? "text-pos" : r.difference < 0 ? "text-neg" : "text-ink-2";
              return (
                <button
                  key={r.participantId}
                  type="button"
                  data-mark
                  data-selected={sel.active === r.participantId || undefined}
                  aria-label={`${nameOf(r.participantId)}: ${t.charts.kPaid} ${f.money(r.paid)}, ${t.charts.kDue} ${f.money(r.due)}`}
                  className={`pr ${model.who && model.who !== r.participantId ? "dim" : ""}`}
                  {...sel.mark(r.participantId)}
                >
                  <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                    <Avatar name={nameOf(r.participantId)} index={avatarIndex(trip, r.participantId)} size="sm" />
                    <b className="truncate text-[15.5px]">{nameOf(r.participantId)}</b>
                    <span className={`num font-bold ${tone}`}>{f.signed(r.difference)}</span>
                  </span>
                  <span className="track">
                    {r.difference >= 0 ? (
                      <>
                        <i className="paid gx" style={{ width: pct(r.due) }} />
                        <i className="over gx" style={{ left: pct(r.due), width: `${(parseFloat(pct(r.paid)) - parseFloat(pct(r.due))).toFixed(2)}%`, animationDelay: ".25s" }} />
                      </>
                    ) : (
                      <>
                        <i className="paid gx" style={{ width: pct(r.paid) }} />
                        <i className="short gx" style={{ left: pct(r.paid), width: `${(parseFloat(pct(r.due)) - parseFloat(pct(r.paid))).toFixed(2)}%`, animationDelay: ".25s" }} />
                      </>
                    )}
                    <i className="due" style={{ left: pct(r.due) }} />
                  </span>
                  <span className="text-[13.5px] text-ink-2">{words(r.difference)}</span>
                </button>
              );
            })}
          </div>
          {model.who ? <p className="text-[13px] text-ink-2">{t.charts.pvdNote}</p> : null}
          <ReadoutRow data={sel.active ? read(sel.active) : null} />
        </div>
      )}
    </ChartCard>
  );
};
