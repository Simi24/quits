import { useDevice } from "../device";
import { CORNER_BUTTON_CLASS } from "./cornerButton";

/** The compact language control of the landing's corner: shows the current language, one tap switches to the other (SPEC.md §7.8). */
export const LangButton = () => {
  const { t, lang, setLang } = useDevice();
  const next = lang === "it" ? "en" : "it";
  const { langSwitch, langNames } = t.settings;
  return (
    <button
      type="button"
      aria-label={langSwitch(langNames[lang], langNames[next])}
      onClick={() => setLang(next)}
      className={`${CORNER_BUTTON_CLASS} text-[13px] font-bold leading-none`}
    >
      {lang.toUpperCase()}
    </button>
  );
};
