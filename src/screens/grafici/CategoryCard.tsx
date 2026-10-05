import type { ChartModel } from "../../../domain";
import { resolveCategory } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { categoryName } from "../../trip/labels";
import { ChartCard } from "./ChartCard";
import { NumbersTable } from "./NumbersTable";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { textureOf } from "./textures";
import { useChartFormat } from "./use-chart-format";
import { arrowNav } from "./use-arrow-nav";
import { useSelection } from "./use-selection";

interface CategoryCardProps {
  model: ChartModel;
  sub: string;
  patterns: boolean;
  table: boolean;
  onTable: () => void;
}

/** Chart 1: horizontal bars, biggest first, with the emoji, the amount and the share (SPEC.md §8.2). */
export const CategoryCard = ({ model, sub, patterns, table, onTable }: CategoryCardProps) => {
  const { t, lang } = useDevice();
  const { trip } = useTrip();
  const f = useChartFormat();
  const sel = useSelection<string>();
  const rows = model.categories;
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const total = model.progress.total;

  const nameOf = (id: string) => categoryName(resolveCategory(trip, id), lang);
  const emojiOf = (id: string) => resolveCategory(trip, id).emoji;
  const read = (id: string): ReadoutData | null => {
    const r = rows.find((x) => x.categoryId === id);
    if (!r) return null;
    const c = resolveCategory(trip, id);
    return {
      title: `${c.emoji} ${nameOf(id)}`,
      value: f.money(r.amount),
      rows: [
        { color: `var(--${c.color})`, label: t.charts.nExp(r.count), value: f.percent(r.share) },
        { color: `var(--${c.color})`, label: t.charts.perHeadDay, value: f.money(r.perPersonPerDay) },
      ],
      notes: [r.biggest ? t.charts.biggest(r.biggest.description) : "", r.refunds ? t.charts.netOfRefund(f.money(-r.refunds)) : ""].filter(Boolean),
    };
  };

  return (
    <ChartCard id="cat" title={t.charts.cCat} sub={sub} table={table} onTable={onTable}>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2">{t.charts.noData}</p>
      ) : table ? (
        <NumbersTable
          head={[t.charts.thCat, t.charts.thAmt, t.charts.thPct, t.charts.thHead]}
          rows={rows.map((r) => [`${emojiOf(r.categoryId)} ${nameOf(r.categoryId)}`, f.money(r.amount), f.percent(r.share), f.money(r.perPersonPerDay)])}
        />
      ) : (
        <div ref={sel.ref} className="grid gap-2.5">
          <div role="group" aria-label={t.charts.cCat} className="grid gap-1" onKeyDown={arrowNav}>
            {rows.map((r, k) => {
              const c = resolveCategory(trip, r.categoryId);
              const tx = textureOf(c, patterns);
              return (
                <button
                  key={r.categoryId}
                  type="button"
                  data-mark
                  data-selected={sel.active === r.categoryId || undefined}
                  aria-label={`${nameOf(r.categoryId)}: ${f.money(r.amount)}, ${f.percent(r.share)}`}
                  className="catrow"
                  style={{ "--c": `var(--${c.color})` } as React.CSSProperties}
                  {...sel.mark(r.categoryId)}
                >
                  <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2 text-[15px]">
                    <span aria-hidden="true" className="text-base">
                      {c.emoji}
                    </span>
                    <b className="truncate font-semibold">{nameOf(r.categoryId)}</b>
                    <span className="num font-bold">
                      {f.money(r.amount)}
                      <span className="ml-1.5 text-[13px] font-medium text-ink-2">{f.percent(total === 0 ? 0 : r.amount / total)}</span>
                    </span>
                  </span>
                  <span
                    className={`hbar gx ${tx ? `tx-${tx}` : ""}`}
                    style={{ width: `${Math.max(0.6, (Math.max(0, r.amount) / max) * 100).toFixed(2)}%`, animationDelay: `${k * 50}ms` }}
                  />
                </button>
              );
            })}
          </div>
          <ReadoutRow data={sel.active ? read(sel.active) : null} />
        </div>
      )}
    </ChartCard>
  );
};
