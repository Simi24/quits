import { useState } from "react";
import { Button, Notice } from "../../components";
import { useDevice } from "../../device";
import { isInAppBrowser } from "../../pwa";
import { tripLinkOf, useTrip } from "../../trip";

/** In a messaging or social app's browser the storage is separate and installing is impossible: say so on trip open (SPEC.md §5.7). */
export const InAppBanner = () => {
  const { t } = useDevice();
  const { token } = useTrip();
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  if (!isInAppBrowser(navigator.userAgent) || !token) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tripLinkOf(token));
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };
  return (
    <div role="status" className="mx-4 mb-2" data-testid="in-app-banner">
      <Notice>
        <p>
          <b>{t.pwa.inAppTitle}.</b> {t.pwa.inAppBody}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm" onClick={() => void copy()}>
            {t.pwa.copyLink}
          </Button>
          {copied === "done" ? <span>{t.pwa.linkCopied}</span> : null}
          {copied === "failed" ? <span>{t.pwa.copyFailed}</span> : null}
        </div>
      </Notice>
    </div>
  );
};
