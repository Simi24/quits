/** An iPhone or iPad. Recent iPads report themselves as a Mac: only the touch screen tells them apart. */
export const isIos = (userAgent: string, maxTouchPoints: number): boolean =>
  /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

/** A web view inside a messaging or social app: its storage is separate and it cannot install (SPEC.md §5.7). */
export const isInAppBrowser = (userAgent: string): boolean => /FBAN|FBAV|Instagram|Line\/|Telegram|WhatsApp/.test(userAgent);

/** Running as the installed app: Chromium's display mode, or iOS's own flag. */
export const isStandalone = (): boolean =>
  ["standalone", "fullscreen", "minimal-ui"].some((mode) => matchMedia(`(display-mode: ${mode})`).matches) ||
  (navigator as { standalone?: boolean }).standalone === true;
