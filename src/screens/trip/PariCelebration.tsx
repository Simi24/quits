import { useEffect, useRef } from "react";
import { Button, Stamp, useModalFocus } from "../../components";
import { useDevice } from "../../device";
import { throwConfetti } from "./confetti";

/** Everyone is even: the stamp lands on a receipt, confetti once (SPEC.md §7.6 item 10, §7.9). */
export const PariCelebration = ({ onClose }: { onClose: () => void }) => {
  const { t } = useDevice();
  const ref = useModalFocus<HTMLDivElement>(onClose);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) throwConfetti(canvas.current);
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t.history.evenTitle}
      data-testid="pari-celebration"
      className="anim-fade absolute inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--paper)_86%,transparent)]"
    >
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div className="edge">
        <div className="zz relative grid w-[300px] max-w-[calc(100vw-32px)] justify-items-center gap-3.5 px-6 pt-[34px] pb-[30px] text-center">
          <Stamp big>{t.balances.evenStamp}</Stamp>
          <h2 className="display mt-2.5 text-[calc(28px*var(--d-scale))]">{t.history.evenTitle}</h2>
          <p className="text-ink-2">{t.history.evenHelp}</p>
          <Button onClick={onClose}>{t.history.nice}</Button>
        </div>
      </div>
    </div>
  );
};
