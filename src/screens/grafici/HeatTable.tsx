import { resolveCategory } from "../../../domain";
import type { ChartModel } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { categoryName } from "../../trip/labels";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { useChartFormat } from "./use-chart-format";
import { arrowNav } from "./use-arrow-nav";
import { useSelection } from "./use-selection";

interface HeatTableProps {
  model: ChartModel;
}

/** Chart 5: categories by people, cells shaded from the lead colour, a totals row equal to each person's due (SPEC.md §8.2). */
export const HeatTable = ({ model }: HeatTableProps) => {
  const { t, lang } = useDevice();
  const { trip, nameOf } = useTrip();
  const f = useChartFormat();
  const sel = useSelection<string>();
  const m = model.matrix;
  const headsOf = (id: string) => (trip.defaultSplit.method === "shares" ? (trip.defaultSplit.shares[id] ?? 1) : 1);

  const read = (key: string): ReadoutData | null => {
    const [categoryId, id] = key.split("|") as [string, string];
    const value = m.cells[categoryId]?.[id];
    if (value === undefined) return null;
    const c = resolveCategory(trip, categoryId);
    const due = m.totals[id] ?? 0;
    return {
      title: `${nameOf(id)}, ${c.emoji} ${categoryName(c, lang)}`,
      value: f.money(value),
      rows: [
        { color: `var(--${c.color})`, label: t.charts.ofPart(f.percent(due ? value / due : 0)) },
        ...(headsOf(id) > 1 ? [{ color: `var(--${c.color})`, label: t.charts.perHead(f.money(Math.round(value / headsOf(id)))) }] : []),
      ],
    };
  };

  return (
    <div ref={sel.ref} className="grid gap-3">
      <div className="heat-wrap" onKeyDown={arrowNav}>
        <table className="heat" data-testid="heat">
          <thead>
            <tr>
              <th className="rowh">
                <span className="sr-only">{t.charts.thCat}</span>
              </th>
              {m.participantIds.map((id) => (
                <th key={id} scope="col" className={model.who === id ? "hl" : ""}>
                  <span>{nameOf(id)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.categoryIds.map((categoryId) => {
              const c = resolveCategory(trip, categoryId);
              return (
                <tr key={categoryId}>
                  <th scope="row" className="rowh">
                    {c.emoji} {categoryName(c, lang)}
                  </th>
                  {m.participantIds.map((id) => {
                    const value = m.cells[categoryId]![id]!;
                    const key = `${categoryId}|${id}`;
                    const strength = 10 + 82 * (value / m.max);
                    return (
                      <td key={id} className={model.who === id ? "hl" : ""}>
                        <button
                          type="button"
                          data-mark
                          data-selected={sel.active === key || undefined}
                          aria-label={`${nameOf(id)}, ${categoryName(c, lang)}: ${f.money(value)}`}
                          className={value <= 0 ? "zero" : strength > 56 ? "inv" : ""}
                          style={value > 0 ? ({ "--h": `color-mix(in srgb, var(--lead) ${strength.toFixed(0)}%, var(--receipt))` } as React.CSSProperties) : undefined}
                          {...sel.mark(key)}
                        >
                          {value < 0 ? f.plain(value) : value === 0 ? "0" : f.plain(value)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="rowh">
                {t.charts.matTot}
              </th>
              {m.participantIds.map((id) => (
                <td key={id} className="num">
                  {f.plain(m.totals[id] ?? 0)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="ramp" aria-hidden="true">
        <span>{t.charts.less}</span>
        <i />
        <span>{t.charts.more}</span>
        <span className="flex-1" />
        <span>{t.charts.amountsIn(f.symbol)}</span>
      </div>
      <ReadoutRow data={sel.active ? read(sel.active) : null} />
    </div>
  );
};
