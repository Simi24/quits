import { Check } from "@phosphor-icons/react";
import { useDevice } from "../../device";

interface PatternsToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

/** "Motivi": textures on the standard categories too, per device, off by default (SPEC.md §8.5). */
export const PatternsToggle = ({ on, onChange }: PatternsToggleProps) => {
  const { t } = useDevice();
  return (
    <div className="grid gap-1.5 px-1 chart-wide">
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 items-center gap-2.5 text-left text-sm font-semibold">
        <span aria-hidden="true" className={`grid size-[26px] place-items-center rounded-lg border-[1.5px] ${on ? "border-ink bg-ink text-receipt" : "border-line bg-receipt"}`}>
          {on ? <Check size={16} weight="bold" /> : null}
        </span>
        {t.charts.patterns}
      </button>
      <p className="text-[13px] text-ink-2">{t.charts.patternsHelp}</p>
    </div>
  );
};
