import { X } from "@phosphor-icons/react";
import { useDevice } from "../device";

/** The single hint beside "+", on the first trip opened on this device. Not a tour: one sentence and a close (SPEC.md §7.6). */
export const FirstTip = ({ onClose }: { onClose: () => void }) => {
  const { t } = useDevice();
  return (
    <aside
      data-testid="first-tip"
      className="absolute right-[92px] bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-10 grid max-w-[min(232px,calc(100%-112px))] grid-cols-[minmax(0,1fr)_auto] items-start gap-1 rounded-[14px] bg-[color-mix(in_srgb,var(--sun)_34%,var(--paper))] py-2.5 pr-1 pl-3.5 text-[14px] leading-[1.35] before:absolute before:top-1/2 before:-right-[7px] before:size-3.5 before:-translate-y-1/2 before:rotate-45 before:rounded-[3px] before:bg-[color-mix(in_srgb,var(--sun)_34%,var(--paper))] before:content-['']"
    >
      <p className="relative">{t.onboarding.tip}</p>
      <button type="button" aria-label={t.onboarding.tipClose} onClick={onClose} className="relative -mt-1 grid size-11 place-items-center rounded-full">
        <X size={18} weight="bold" aria-hidden="true" />
      </button>
    </aside>
  );
};
