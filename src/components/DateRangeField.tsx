import { useDevice } from "../device";
import { TextField } from "./TextField";

interface DateRangeFieldProps {
  /** Prefix of the two input ids: `<idPrefix>-from` and `<idPrefix>-to`. */
  idPrefix: string;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}

/**
 * The optional "Dal"/"Al" dates of a trip. Side by side when both fit, stacked when they do not: native
 * date inputs have an intrinsic minimum width of their own (iOS and Android pickers), so the grid wraps
 * on the input's real width instead of squeezing two columns.
 */
export const DateRangeField = ({ idPrefix, from, to, onFrom, onTo }: DateRangeFieldProps) => {
  const { t } = useDevice();
  return (
    <fieldset className="grid min-w-0 gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold">
        {t.create.dates} <span className="font-normal text-ink-2">({t.create.optional})</span>
      </legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-2.5">
        <TextField id={`${idPrefix}-from`} type="date" label={t.create.from} value={from} onChange={(e) => onFrom(e.target.value)} />
        <TextField id={`${idPrefix}-to`} type="date" label={t.create.to} value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
    </fieldset>
  );
};
