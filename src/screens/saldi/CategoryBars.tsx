import { useDevice } from "../../device";
import { categoryName, useTrip } from "../../trip";
import { resolveCategory } from "../../../domain";
import type { Totals } from "../../../domain";

/** "Per categoria": a bar per category, biggest first, the amount beside the name so colour is never the only cue. */
export const CategoryBars = ({ rows }: { rows: Totals["byCategory"] }) => {
  const { t, lang } = useDevice();
  const { trip, money } = useTrip();
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <section className="grid gap-3">
      <h2 className="display text-[calc(20px*var(--d-scale))]">{t.totals.byCategory}</h2>
      <ul className="grid gap-3">
        {rows.map((row) => {
          const category = resolveCategory(trip, row.categoryId);
          return (
            <li key={row.categoryId} data-testid="category-bar">
              <div className="flex items-center gap-2 text-[15px]">
                <span aria-hidden="true">{category.emoji}</span>
                <b className="grow">{categoryName(category, lang)}</b>
                <span className="num">{money(row.amount)}</span>
              </div>
              <div
                aria-hidden="true"
                className="mt-1.5 h-2.5 rounded-r-[4px]"
                style={{ width: `${Math.max(2, (Math.max(row.amount, 0) / max) * 100)}%`, backgroundColor: `var(--${category.color})` }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};
