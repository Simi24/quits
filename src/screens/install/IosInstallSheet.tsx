import { Export, PlusSquare } from "@phosphor-icons/react";
import { Button, Sheet } from "../../components";
import { useDevice } from "../../device";

/** iOS cannot be asked to install: this shows the steps, Share then Add to Home Screen (SPEC.md §5.6). */
export const IosInstallSheet = ({ onClose }: { onClose: () => void }) => {
  const { t } = useDevice();
  const steps = [
    { icon: Export, text: t.pwa.iosStep1 },
    { icon: PlusSquare, text: t.pwa.iosStep2 },
    { icon: null, text: t.pwa.iosStep3 },
  ];
  return (
    <Sheet
      title={t.pwa.iosSheetTitle}
      onClose={onClose}
      footer={
        <Button wide onClick={onClose}>
          {t.pwa.gotIt}
        </Button>
      }
    >
      <div className="grid gap-4 px-[18px] pt-1 pb-5">
        <ol className="grid gap-3.5">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span className="display grid size-8 place-items-center rounded-full bg-paper-2 text-[calc(16px*var(--d-scale))]" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pt-1 text-[15.5px]">
                {text}
                {Icon ? <Icon size={20} weight="bold" className="ml-1.5 inline-block align-text-bottom" aria-hidden="true" /> : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-[13.5px] text-ink-2">{t.pwa.iosNeedsNetwork}</p>
      </div>
    </Sheet>
  );
};
