import { useEffect, useRef } from "react";

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, innermost last: only the top one answers Escape and Tab. */
const open: object[] = [];

/**
 * Dialog behaviour: Escape closes, Tab stays inside, focus moves in on open and returns on close (SPEC.md §7.10).
 * Pass the dialog element's ref and the close handler.
 */
export function useModalFocus<E extends HTMLElement>(onClose: () => void) {
  const ref = useRef<E>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    const token = {};
    open.push(token);
    const before = document.activeElement as HTMLElement | null;
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (open.at(-1) !== token) return;
      if (event.key === "Escape") {
        close.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      open.splice(open.indexOf(token), 1);
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  return ref;
}
