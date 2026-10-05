import { useDevice } from "../device";
import { Segmented } from "./Segmented";

/** The per-device theme and language selectors: in Viaggio and in the landing footer (SPEC.md §7.8). */
export const DevicePreferences = () => {
  const { t, lang, setLang, theme, setTheme } = useDevice();
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">{t.settings.theme}</span>
        <Segmented
          label={t.settings.theme}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t.settings.system },
            { value: "light", label: t.settings.light },
            { value: "dark", label: t.settings.dark },
          ]}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">{t.settings.lang}</span>
        <Segmented
          label={t.settings.lang}
          value={lang}
          onChange={setLang}
          options={[
            { value: "it", label: "Italiano" },
            { value: "en", label: "English" },
          ]}
        />
      </div>
    </div>
  );
};
