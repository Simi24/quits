import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  text: string;
  action?: { label: string; run: () => void };
}

/** One toast at a time; it goes away on its own, longer when it offers an action. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: ToastState) => {
    window.clearTimeout(timer.current);
    setToast(next);
    timer.current = window.setTimeout(() => setToast(null), next.action ? 6000 : 3600);
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show, hide };
}
