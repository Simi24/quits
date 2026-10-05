import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, EqualMark, ErrorLine } from "../../components";
import { useDevice } from "../../device";
import { tripLinkOf } from "../../trip/trip-link";

interface ReadyScreenProps {
  token: string;
  onOpen: () => void;
}

/** "Il viaggio è pronto": the link to share, shown once after creation (SPEC.md §7.6 item 2). */
export const ReadyScreen = ({ token, onOpen }: ReadyScreenProps) => {
  const { t } = useDevice();
  const link = tripLinkOf(token);
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <main className="grid h-full content-start gap-5 overflow-y-auto px-4 pt-9 pb-8">
      <EqualMark width={56} barHeight={11} />
      <h1 className="display text-[calc(38px*var(--d-scale))] leading-[1.05]">{t.sync.ready}</h1>
      <p>{t.sync.readyHelp}</p>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">{t.sync.linkLabel}</span>
        <input
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-12 w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-3.5 py-2.5 text-ink focus:border-ink focus:outline-none"
        />
      </label>
      <div className="grid gap-2.5">
        <Button wide onClick={() => void copy()}>
          {copied === "yes" ? <Check size={20} weight="bold" aria-hidden="true" /> : <Copy size={20} weight="fill" aria-hidden="true" />}
          {copied === "yes" ? t.sync.copied : t.sync.copyLink}
        </Button>
        <Button wide variant="ghost" onClick={onOpen}>{t.sync.openTrip}</Button>
      </div>
      <p role="status" className="min-h-5">
        {copied === "failed" ? <ErrorLine>{t.sync.copyFailed}</ErrorLine> : null}
      </p>
    </main>
  );
};
