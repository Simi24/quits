import { createContext, useContext } from "react";
import type { Dictionary, Lang } from "../i18n";
import type { ThemeChoice } from "../db";

export interface DeviceValue {
  deviceId: string;
  lang: Lang;
  t: Dictionary;
  theme: ThemeChoice;
  /** The creator code that worked on this device, so it is asked once (SPEC.md §4). */
  creatorCode: string | null;
  /** Null forgets it: a code the server refuses (revoked) must make room for another. */
  setCreatorCode: (code: string | null) => void;
  /** Whether the first-use tip beside "+" has been dealt with on this device. */
  tipSeen: boolean;
  markTipSeen: () => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeChoice) => void;
}

export const DeviceContext = createContext<DeviceValue | null>(null);

export const useDevice = (): DeviceValue => {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("useDevice needs a DeviceProvider");
  return value;
};
