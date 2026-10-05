interface ToastProps {
  text: string;
  /** An action offered with the message, like "Annulla" after a delete. */
  action?: { label: string; run: () => void };
}

export const Toast = ({ text, action }: ToastProps) => (
  <div
    role="status"
    className="anim-toast absolute right-4 bottom-[calc(164px+env(safe-area-inset-bottom,0px))] left-4 z-40 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-[15px] font-semibold text-paper"
  >
    <span>{text}</span>
    {action ? (
      <button type="button" onClick={action.run} className="ml-auto min-h-11 px-2 font-bold text-paper underline underline-offset-2">
        {action.label}
      </button>
    ) : null}
  </div>
);
