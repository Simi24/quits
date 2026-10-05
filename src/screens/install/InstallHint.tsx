import { useEffect, useState } from "react";
import { Toast } from "../../components";
import { useDevice } from "../../device";
import { promptInstall, shouldHintInstall, useInstallOffer } from "../../pwa";
import { useTrip } from "../../trip";
import { IosInstallSheet } from "./IosInstallSheet";

const SHOWN_MS = 8000;

/** The one-time hint after the third expense this device wrote (SPEC.md §5.6). Shown once per device, then never again. */
export const InstallHint = () => {
  const { t, deviceId, installHintShown, setInstallFlag } = useDevice();
  const { operations, sync } = useTrip();
  const offer = useInstallOffer(sync.pending === 0);
  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState(false);

  const createdHere = operations.filter((o) => o.type === "ExpenseCreated" && o.device === deviceId).length;
  const due = shouldHintInstall({ offer, createdHere, hintShown: installHintShown });

  useEffect(() => {
    if (!due) return;
    setVisible(true);
    setInstallFlag("installHintShown");
  }, [due, setInstallFlag]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const act = () => {
    setVisible(false);
    if (offer === "prompt") void promptInstall();
    else setSteps(true);
  };
  return (
    <>
      {visible ? <Toast text={t.pwa.installHint} action={{ label: offer === "prompt" ? t.pwa.install : t.pwa.installHow, run: act }} /> : null}
      {steps ? <IosInstallSheet onClose={() => setSteps(false)} /> : null}
    </>
  );
};
