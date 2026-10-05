import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { updateDevice } from "../db";
import type { DeviceRecord, ThemeChoice } from "../db";
import { detectLang, dictionaries } from "../i18n";
import type { Lang } from "../i18n";
import { DeviceContext } from "./DeviceContext";
import type { DeviceValue } from "./DeviceContext";

/** `data-theme` on the root overrides `prefers-color-scheme`; "system" leaves the attribute off (SPEC.md §7.8). */
const applyTheme = (theme: ThemeChoice) => {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
};

interface DeviceProviderProps {
  device: DeviceRecord;
  children: ReactNode;
}

/** Per-device preferences: language and theme, kept in IndexedDB (SPEC.md §5.2). */
export const DeviceProvider = ({ device, children }: DeviceProviderProps) => {
  const [lang, setLangState] = useState<Lang>(device.lang ?? detectLang(navigator.language));
  const [theme, setThemeState] = useState<ThemeChoice>(device.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<DeviceValue>(
    () => ({
      deviceId: device.deviceId,
      lang,
      t: dictionaries[lang],
      theme,
      setLang: (next) => {
        setLangState(next);
        void updateDevice({ lang: next });
      },
      setTheme: (next) => {
        setThemeState(next);
        void updateDevice({ theme: next });
      },
    }),
    [device.deviceId, lang, theme],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};
