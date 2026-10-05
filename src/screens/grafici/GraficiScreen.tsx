import { ChartBar } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { chartModel, resolveCategory } from "../../../domain";
import { EmptyState } from "../../components";
import { useDevice } from "../../device";
import { todayIso } from "../../format";
import { useTrip } from "../../trip";
import { categoryName } from "../../trip/labels";
import { BankOverlay } from "./BankOverlay";
import { BankStamp } from "./BankStamp";
import { CategoryCard } from "./CategoryCard";
import { DaysCard } from "./DaysCard";
import type { DayMode } from "./DaysCard";
import { HeroCard } from "./HeroCard";
import { MatrixOverlay } from "./MatrixOverlay";
import { MatrixStamp } from "./MatrixStamp";
import { PaidDueCard } from "./PaidDueCard";
import { PatternsToggle } from "./PatternsToggle";
import { Postcard } from "./Postcard";
import { RankCard } from "./RankCard";
import { TexturePatterns } from "./TexturePatterns";
import { useChartFormat } from "./use-chart-format";
import { usePatterns } from "./use-patterns";
import { WhoFilter } from "./WhoFilter";

type TableId = "cum" | "cat" | "day" | "pvd" | "bank";

/** The Grafici tab: the "Di chi" filter, the five charts in view, and two more one tap away (SPEC.md §8). */
export const GraficiScreen = () => {
  const { t, lang } = useDevice();
  const { trip, nameOf } = useTrip();
  const f = useChartFormat();
  const [who, setWho] = useState<string | null>(null);
  const [dayMode, setDayMode] = useState<DayMode>("group");
  const [tables, setTables] = useState<Partial<Record<TableId, boolean>>>({});
  const [rankAll, setRankAll] = useState(false);
  const [overlay, setOverlay] = useState<"mat" | "bank" | null>(null);
  const [patterns, setPatterns] = usePatterns();
  const today = todayIso();
  const model = useMemo(() => chartModel(trip, { today, who }), [trip, today, who]);
  const toggle = (id: TableId) => () => setTables((current) => ({ ...current, [id]: !current[id] }));

  const dates = model.timeline.dates;
  const whoName = model.who ? nameOf(model.who) : null;
  const sub = whoName ? t.charts.subWho(whoName) : t.charts.subGroup(dates.length ? f.range(dates[0]!, dates.at(-1)!) : "");
  const { matrix, bank } = model;
  const best = matrix.best;
  const matTeaser = best ? t.charts.matTeaser(nameOf(best.participantId), categoryName(resolveCategory(trip, best.categoryId), lang), f.money(best.amount)) : t.charts.noData;

  if (trip.expenses.length === 0) {
    return (
      <div className="charts charts-screen" data-testid="grafici">
        <EmptyState icon={<ChartBar size={34} weight="fill" aria-hidden="true" />} title={t.onboarding.emptyCharts} help={t.onboarding.emptyChartsHelp} />
      </div>
    );
  }

  return (
    <div className="charts charts-screen" data-testid="grafici">
      <TexturePatterns />
      <WhoFilter who={who} onChange={setWho} />
      <div className="feed">
        <HeroCard model={model} table={!!tables.cum} onTable={toggle("cum")} />
        <div className="grid content-start gap-3">
          <CategoryCard model={model} sub={sub} patterns={patterns} table={!!tables.cat} onTable={toggle("cat")} />
          <Postcard
            title={t.charts.cMat}
            teaser={best ? matTeaser : t.charts.noData}
            stamp={<MatrixStamp model={model} />}
            onOpen={() => setOverlay("mat")}
          />
        </div>
        <DaysCard model={model} sub={sub} mode={dayMode} onMode={setDayMode} patterns={patterns} table={!!tables.day} onTable={toggle("day")} />
        <RankCard model={model} patterns={patterns} showAll={rankAll} onShowAll={() => setRankAll((v) => !v)} />
        <div className="grid content-start gap-3">
          <PaidDueCard model={model} table={!!tables.pvd} onTable={toggle("pvd")} />
          <Postcard
            title={t.charts.cBank}
            teaser={bank.peak ? t.charts.bankTeaser(nameOf(bank.peak.participantId), f.money(bank.peak.amount), f.dayMonth(bank.peak.date)) : t.charts.bankNone}
            stamp={<BankStamp model={model} />}
            onOpen={() => setOverlay("bank")}
          />
        </div>
        <PatternsToggle on={patterns} onChange={setPatterns} />
      </div>
      {overlay === "mat" ? <MatrixOverlay model={model} who={who} onWho={setWho} onClose={() => setOverlay(null)} /> : null}
      {overlay === "bank" ? (
        <BankOverlay model={model} who={who} onWho={setWho} table={!!tables.bank} onTable={toggle("bank")} onClose={() => setOverlay(null)} />
      ) : null}
    </div>
  );
};
