import { useEffect, useRef } from "react";
import { Sheet } from "../../components";
import { useDevice } from "../../device";

interface RecapSheetProps {
  text: string;
  onClose: () => void;
}

/** The recap as selectable text, for when neither sharing nor the clipboard is available. */
export const RecapSheet = ({ text, onClose }: RecapSheetProps) => {
  const { t } = useDevice();
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.select(), []);
  return (
    <Sheet title={t.balances.summaryTitle} onClose={onClose}>
      <div className="grid gap-2.5 px-4 pt-1 pb-4">
        <p className="text-[13.5px] text-ink-2">{t.balances.summaryHelp}</p>
        <textarea
          ref={field}
          readOnly
          aria-label={t.balances.summaryLabel}
          value={text}
          rows={Math.min(12, text.split("\n").length + 3)}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-3.5 py-2.5 text-ink focus:border-ink focus:outline-none"
        />
      </div>
    </Sheet>
  );
};
