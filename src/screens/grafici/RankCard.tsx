import { resolveCategory } from "../../../domain";
import type { ChartModel } from "../../../domain";
import { CategoryDot } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { ChartCard } from "./ChartCard";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { textureOf } from "./textures";
import { useChartFormat } from "./use-chart-format";
import { arrowNav } from "./use-arrow-nav";
import { useSelection } from "./use-selection";

interface RankCardProps {
  model: ChartModel;
  patterns: boolean;
  showAll: boolean;
  onShowAll: () => void;
}

/** Chart 7: a long receipt of the biggest expenses, top 5 and "Mostra tutte e N" (SPEC.md §8.2). */
export const RankCard = ({ model, patterns, showAll, onShowAll }: RankCardProps) => {
  const { t } = useDevice();
  const { trip, meId, nameOf } = useTrip();
  const f = useChartFormat();
  const sel = useSelection<string>();
  const all = model.ranking;
  const list = showAll ? all : all.slice(0, 5);
  const max = all[0]?.amount ?? 1;
  const who = model.who ?? meId;
  const whoName = trip.participants.find((p) => p.id === model.who)?.name;

  const read = (id: string): ReadoutData | null => {
    const e = all.find((x) => x.expenseId === id);
    if (!e) return null;
    const mine = e.shares[who];
    return {
      title: f.day(e.date),
      value: f.money(e.fullAmount),
      rows: e.payers.map((p) => ({ color: "var(--hi)", label: t.charts.paidBy(nameOf(p.participantId)), value: f.money(p.amount) })),
      notes: mine !== undefined ? [t.charts.partOfMe(nameOf(who), f.money(mine))] : [],
    };
  };

  return (
    <ChartCard id="rank" title={t.charts.cRank} sub={whoName ? t.charts.rankSub(whoName) : t.charts.rankSubG}>
      {all.length === 0 ? (
        <p className="text-sm text-ink-2">{t.charts.noData}</p>
      ) : (
        <div ref={sel.ref} className="grid gap-2.5">
          <ol aria-label={t.charts.cRank} className="grid" onKeyDown={arrowNav}>
            {list.map((e, k) => {
              const c = resolveCategory(trip, e.categoryId);
              const tx = textureOf(c, patterns);
              return (
                <li key={e.expenseId} className="rk-item">
                  <button
                    type="button"
                    data-mark
                    data-selected={sel.active === e.expenseId || undefined}
                    aria-label={`${k + 1}. ${e.description}: ${f.money(e.amount)}`}
                    className="rk"
                    style={{ "--c": `var(--${c.color})` } as React.CSSProperties}
                    {...sel.mark(e.expenseId)}
                  >
                    <span className="rk-pos display num" aria-hidden="true">
                      {k + 1}
                    </span>
                    <CategoryDot color={c.color}>{c.emoji}</CategoryDot>
                    <span className="min-w-0">
                      <span className="rk-d">{e.description}</span>
                      <span className="rk-m">
                        {f.dayMonthShort(e.date)}, {f.list(e.payers.map((p) => nameOf(p.participantId)))}
                      </span>
                    </span>
                    <span className="num rk-a">
                      {f.money(e.amount)}
                      {model.who ? <small>{t.charts.of(f.money(e.fullAmount))}</small> : null}
                    </span>
                    <span className={`hbar gx ${tx ? `tx-${tx}` : ""}`} style={{ width: `${((e.amount / max) * 100).toFixed(2)}%`, animationDelay: `${k * 50}ms`, gridColumn: "3 / -1", height: 6 }} />
                  </button>
                </li>
              );
            })}
          </ol>
          {all.length > 5 ? (
            <button type="button" className="mini-btn justify-self-start" onClick={onShowAll} aria-expanded={showAll}>
              {showAll ? t.charts.rankLess : t.charts.rankMore(all.length)}
            </button>
          ) : null}
          <ReadoutRow data={sel.active ? read(sel.active) : null} />
        </div>
      )}
    </ChartCard>
  );
};
