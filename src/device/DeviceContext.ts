import { createContext, useContext } from "react";
import type { Dictionary, Lang } from "../i18n";
import type { ThemeChoice } from "../db";

export interface DeviceValue {
  deviceId: string;
  lang: Lang;
  t: Dictionary;
  theme: ThemeChoice;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeChoice) => void;
}

export const DeviceContext = createContext<DeviceValue | null>(null);

export const useDevice = (): DeviceValue => {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("useDevice needs a DeviceProvider");
  return value;
};
