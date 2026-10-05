export type DisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';

export function displayMode(): DisplayMode {
  for (const mode of ['standalone', 'fullscreen', 'minimal-ui'] as const) {
    if (matchMedia(`(display-mode: ${mode})`).matches) return mode;
  }
  return 'browser';
}

export function iosStandalone(): boolean | null {
  const v = (navigator as { standalone?: boolean }).standalone;
  return typeof v === 'boolean' ? v : null;
}

export function isInstalledContext(): boolean {
  return displayMode() !== 'browser' || iosStandalone() === true;
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function platformGuess(): string {
  const ua = navigator.userAgent;
  const os = isIos() ? 'iOS' : /Android/.test(ua) ? 'Android' : 'desktop/altro';
  const browser =
    /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /FxiOS|Firefox/.test(ua) ? 'Firefox'
    : /EdgA|EdgiOS|Edg\//.test(ua) ? 'Edge'
    : /CriOS/.test(ua) ? 'Chrome (iOS)'
    : /Chrome/.test(ua) ? 'Chrome/Chromium'
    : /Safari/.test(ua) ? 'Safari'
    : 'sconosciuto';
  const inApp = /FBAN|FBAV|Instagram|Line\/|Telegram|WhatsApp/.test(ua) ? ' (browser in-app?)' : '';
  return `${os} / ${browser}${inApp}`;
}

export function context(): string {
  return isInstalledContext() ? 'app' : 'browser';
}
