import { useCallback, useState } from "react";

const KEY = "quits.motivi";

const read = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** The per-device "Motivi" switch (SPEC.md §8.5): textures on the standard categories too. Off by default. */
export function usePatterns(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(read);
  const set = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // Private mode: the switch still works until the page closes.
    }
  }, []);
  return [on, set];
}
