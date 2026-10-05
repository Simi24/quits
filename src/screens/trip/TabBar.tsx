import { ChartBar, Receipt, Scales, SuitcaseRolling } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useDevice } from "../../device";

export type Tab = "spese" | "saldi" | "grafici" | "viaggio";

interface TabBarProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

/** The bottom tab bar (SPEC.md §7.5): the current tab sits on a sun-yellow pill. */
export const TabBar = ({ tab, onChange }: TabBarProps) => {
  const { t } = useDevice();
  const tabs: { id: Tab; icon: Icon; label: string }[] = [
    { id: "spese", icon: Receipt, label: t.shell.tabSpese },
    { id: "saldi", icon: Scales, label: t.shell.tabSaldi },
    { id: "grafici", icon: ChartBar, label: t.shell.tabGrafici },
    { id: "viaggio", icon: SuitcaseRolling, label: t.shell.tabViaggio },
  ];
  return (
    <nav aria-label="Quits" className="grid grid-cols-4 border-t-[1.5px] border-line bg-paper px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
      {tabs.map(({ id, icon: TabIcon, label }) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
          className={`grid min-h-11 justify-items-center gap-0.5 py-1 text-[12.5px] font-semibold ${tab === id ? "text-ink" : "text-ink-2"}`}
        >
          <span className={`grid h-[30px] w-14 place-items-center rounded-full transition-colors duration-200 ${tab === id ? "bg-hi text-on-hi" : ""}`}>
            <TabIcon size={22} weight="fill" aria-hidden="true" />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
};
