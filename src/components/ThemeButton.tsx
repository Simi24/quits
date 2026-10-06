import { Moon, Sun, SunHorizon } from "@phosphor-icons/react";
import { useDevice } from "../device";
import { CORNER_BUTTON_CLASS } from "./cornerButton";
import type { ThemeChoice } from "../db";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };

/** The compact theme control of the landing's corner: one tap cycles system, light, dark (SPEC.md §7.8). */
export const ThemeButton = () => {
  const { t, theme, setTheme } = useDevice();
  const names: Record<ThemeChoice, string> = { system: t.settings.system, light: t.settings.light, dark: t.settings.dark };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : SunHorizon;
  return (
    <button
      type="button"
      aria-label={`${t.settings.theme}: ${names[theme].toLowerCase()}`}
      onClick={() => setTheme(NEXT[theme])}
      className={CORNER_BUTTON_CLASS}
    >
      <Icon size={18} weight="bold" aria-hidden="true" />
    </button>
  );
};
