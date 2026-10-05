import type { ReactNode } from "react";
import { Receipt } from "../../components";
import { useDevice } from "../../device";

interface ChartCardProps {
  id: string;
  title: string;
  sub?: string;
  /** Replaces the title block (the hero shows a big figure there). */
  heading?: ReactNode;
  /** The Numeri twin is showing instead of the chart; omit for charts without one. */
  table?: boolean;
  onTable?: () => void;
  /** Spans both columns on desktop. */
  wide?: boolean;
  children: ReactNode;
}

/** A chart on a receipt: title, a line saying what it shows, and the "Numeri" switch (SPEC.md §8.1). */
export const ChartCard = ({ id, title, sub, heading, table, onTable, wide = false, children }: ChartCardProps) => {
  const { t } = useDevice();
  return (
    <section aria-labelledby={`h-${id}`} className={wide ? "chart-wide" : ""} data-testid={`chart-${id}`}>
      <Receipt className="grid gap-3.5 px-[18px] pt-[22px] pb-6">
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            {heading ?? (
              <>
                <h2 id={`h-${id}`} className="display text-[calc(21px*var(--d-scale))]">
                  {title}
                </h2>
                {sub ? <p className="mt-1 text-[13.5px] text-ink-2">{sub}</p> : null}
              </>
            )}
          </div>
          {onTable ? (
            <button type="button" className="mini-btn" aria-pressed={!!table} onClick={onTable}>
              {table ? t.charts.backChart : t.charts.numbers}
            </button>
          ) : null}
        </div>
        {children}
      </Receipt>
    </section>
  );
};
