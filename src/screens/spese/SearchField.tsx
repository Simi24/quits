import { MagnifyingGlass } from "@phosphor-icons/react";
import { useDevice } from "../../device";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Local search over description and category name, offline too (SPEC.md §7.6 item 4). */
export const SearchField = ({ value, onChange }: SearchFieldProps) => {
  const { t } = useDevice();
  return (
    <div className="relative">
      <MagnifyingGlass size={18} aria-hidden="true" className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2" />
      <label htmlFor="expense-search" className="sr-only">
        {t.expenses.searchPh}
      </label>
      <input
        id="expense-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t.expenses.searchPh}
        autoComplete="off"
        className="min-h-11 w-full rounded-full border-[1.5px] border-line bg-receipt py-2.5 pr-3.5 pl-10 text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none"
      />
    </div>
  );
};
