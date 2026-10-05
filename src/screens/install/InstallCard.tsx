import { useState } from "react";
import { Button, EqualMark, Receipt } from "../../components";
import { useDevice } from "../../device";
import { promptInstall, useInstallOffer } from "../../pwa";
import { useTrip } from "../../trip";
import { IosInstallSheet } from "./IosInstallSheet";

/** The dismissible receipt-style card in Viaggio that offers installing (SPEC.md §5.6). */
export const InstallCard = () => {
  const { t, setInstallFlag } = useDevice();
  const { sync } = useTrip();
  const offer = useInstallOffer(sync.pending);
  const [steps, setSteps] = useState(false);
  if (offer === "none") return null;

  const body = offer === "prompt" ? t.pwa.installBodyPrompt : offer === "ios-steps" ? t.pwa.installBodyIos : t.pwa.installWait;
  return (
    <section aria-labelledby="install-title" className="pt-[18px] pb-1">
      <Receipt className="grid gap-3 px-[18px] py-[18px]">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 flex-none place-items-center rounded-[14px] bg-lead">
            <EqualMark width={26} barHeight={6} mono />
          </div>
          <h2 id="install-title" className="display text-[calc(19px*var(--d-scale))] leading-[1.1]">
            {t.pwa.installTitle}
          </h2>
        </div>
        <p className="text-[14.5px]">{body}</p>
        <div className="flex flex-wrap gap-2.5">
          {offer === "prompt" ? <Button size="sm" onClick={() => void promptInstall()}>{t.pwa.install}</Button> : null}
          {offer === "ios-steps" ? <Button size="sm" onClick={() => setSteps(true)}>{t.pwa.installHow}</Button> : null}
          <Button size="sm" variant="ghost" onClick={() => setInstallFlag("installDismissed")}>
            {t.pwa.notNow}
          </Button>
        </div>
      </Receipt>
      {steps ? <IosInstallSheet onClose={() => setSteps(false)} /> : null}
    </section>
  );
};
