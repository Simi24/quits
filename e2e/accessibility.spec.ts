import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { applyTheme, THEMES } from "./themes.ts";

// SPEC.md §12.1: axe runs on the main screens in both themes and blocks on any violation.
const SCREENS = [{ name: "empty app", path: "/" }];

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    for (const via of ["system", "attribute"] as const) {
      test(`${screen.name} has no axe violations, ${theme} theme via ${via}`, async ({ page }) => {
        await page.goto(screen.path);
        await applyTheme(page, theme, via);

        const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
        expect(scheme).toBe(theme);

        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations).toEqual([]);
      });
    }
  }
}
