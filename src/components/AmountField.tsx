import { useDevice } from "../device";

interface AmountFieldProps {
  id: string;
  label: string;
  value: string;
  currency: string;
  /** A refund is entered positive and shown with a minus (SPEC.md §3.8). */
  negative?: boolean;
  onChange: (value: string) => void;
}

/** The big amount input of the expense and settlement sheets, with the currency beside it. */
export const AmountField = ({ id, label, value, currency, negative = false, onChange }: AmountFieldProps) => {
  const { lang } = useDevice();
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex min-w-0 items-baseline gap-2 border-b-[2.5px] border-ink pb-1 focus-within:shadow-[0_1.5px_0_var(--ink)]">
        {negative ? (
          <span aria-hidden="true" className="text-[22px] font-bold text-ink-2">
            -
          </span>
        ) : null}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={lang === "it" ? "0,00" : "0.00"}
          className="display num min-w-0 flex-1 bg-transparent p-0 text-[calc(40px*var(--d-scale))] outline-none placeholder:text-ink-2 placeholder:opacity-60"
        />
        <span className="text-[22px] font-bold text-ink-2">{currency}</span>
      </div>
    </div>
  );
};
