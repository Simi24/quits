import type { Page } from "@playwright/test";

export type Theme = "light" | "dark";

export const THEMES: Theme[] = ["light", "dark"];

/** Dark through the system preference (the default path) or through `data-theme`. */
export const applyTheme = async (page: Page, theme: Theme, via: "system" | "attribute") => {
  if (via === "system") {
    await page.emulateMedia({ colorScheme: theme });
    return;
  }
  await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
};
