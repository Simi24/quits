import { useDevice } from "../device";
import { acceptUpdate, dismissUpdate, useUpdateWaiting } from "../pwa";
import { Button } from "./Button";

/** "Nuova versione disponibile": a new build is installed and waits (SPEC.md §5.4). Queued operations of the old one stay valid. */
export const UpdateBanner = () => {
  const { t } = useDevice();
  const waiting = useUpdateWaiting();
  if (!waiting) return null;
  return (
    <div role="status" className="anim-toast absolute inset-x-3 top-3 z-50 flex items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-[15px] font-semibold text-paper">
      <span className="grow">{t.pwa.updateAvailable}</span>
      <Button size="sm" onClick={acceptUpdate}>
        {t.pwa.updateNow}
      </Button>
      <button type="button" onClick={dismissUpdate} className="min-h-11 px-2 font-bold text-paper underline underline-offset-2">
        {t.pwa.later}
      </button>
    </div>
  );
};
