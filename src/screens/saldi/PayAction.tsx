import { ArrowSquareOut, Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { formatIban } from "../../../domain";
import type { PaymentAction } from "../../../domain";

interface PayActionProps {
  action: PaymentAction;
}

/** One way to pay, as a full-width button: copy the value, or open the app in a new tab. */
export const PayAction = ({ action }: PayActionProps) => {
  const { t } = useDevice();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const label = { iban: t.payment.copyIban, paypal: t.payment.openPaypal, revolut: t.payment.openRevolut, satispay: t.payment.copySatispay }[action.method];
  const shown = action.kind === "copy" ? (action.method === "iban" ? formatIban(action.value) : action.value) : null;
  const note = action.kind === "open" ? (action.withAmount ? null : action.method === "revolut" ? t.payment.revolutNoAmount : t.payment.paypalNoAmount) : null;

  const run = async () => {
    if (action.kind === "open") {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await navigator.clipboard.writeText(action.value);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="grid gap-1.5" data-testid={`pay-${action.method}`}>
      <Button wide variant="ghost" onClick={() => void run()}>
        {action.kind === "open" ? <ArrowSquareOut size={20} weight="bold" aria-hidden="true" /> : state === "copied" ? <Check size={20} weight="bold" aria-hidden="true" /> : <Copy size={20} weight="bold" aria-hidden="true" />}
        {state === "copied" ? t.payment.copied : label}
      </Button>
      {shown ? <code className="num px-1 text-center text-[15px] break-all select-all">{shown}</code> : null}
      {note ? <small className="px-1 text-center text-[13.5px] text-ink-2">{note}</small> : null}
      <div aria-live="polite">{state === "failed" ? <small className="block px-1 text-center text-[13.5px] font-semibold text-neg">{t.payment.copyFailed}</small> : null}</div>
    </div>
  );
};
