import { Chip } from "../../components";
import { useDevice } from "../../device";
import { listCategories } from "../../../domain";
import { categoryName, useTrip } from "../../trip";

interface CategoryChipsProps {
  value: string;
  onChange: (categoryId: string) => void;
}

/** A scrolling row: standard categories, then the trip's own (SPEC.md §7.6 item 5). */
export const CategoryChips = ({ value, onChange }: CategoryChipsProps) => {
  const { t, lang } = useDevice();
  const { trip } = useTrip();
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">{t.expenses.category}</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {listCategories(trip).map((category) => (
          <Chip key={category.id} pressed={value === category.id} onClick={() => onChange(category.id)}>
            <span aria-hidden="true" className="text-[17px] leading-none">
              {category.emoji}
            </span>
            {categoryName(category, lang)}
          </Chip>
        ))}
      </div>
    </div>
  );
};
