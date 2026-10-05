import { ChartBar } from "@phosphor-icons/react";
import { Receipt } from "../../components";
import { useDevice } from "../../device";

/** Grafici arrives with S7; until then the tab says so, in the prototypes' tone. */
export const ChartsPlaceholder = () => {
  const { t } = useDevice();
  return (
    <div className="px-4 pt-1.5">
      <Receipt className="grid gap-3 px-[22px] py-[30px]">
        <ChartBar size={28} weight="fill" aria-hidden="true" />
        <h2 className="display text-[calc(26px*var(--d-scale))]">{t.shell.chartsSoon}</h2>
        <p className="text-ink-2">{t.shell.chartsSoonHelp}</p>
      </Receipt>
    </div>
  );
};
