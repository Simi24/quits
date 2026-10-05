import { readCookie, readCookieExpiry } from './cookie';
import { installFlags } from './install';
import { recentLog } from './log';
import { displayMode, iosStandalone, platformGuess } from './platform';
import type { AppState } from './state';
import { storageInfo } from './storage';
import { backgroundSyncSupported, swInfo } from './sw';

export type Report = Awaited<ReturnType<typeof collect>>;

// Everything the author pastes back into issue #11.
export async function collect(state: AppState) {
  return {
    prototype: 'quits/prototypes/pwa (issue #11)',
    generatedAt: new Date().toISOString(),
    href: location.href,
    launchHref: state.launchHref,
    userAgent: navigator.userAgent,
    platformGuess: platformGuess(),
    displayMode: displayMode(),
    navigatorStandalone: iosStandalone(),
    online: navigator.onLine,
    boot: { source: state.bootSource, note: state.bootNote },
    idb: {
      instance: state.instance,
      deviceId: state.deviceId,
      deviceIdSource: state.deviceIdSource,
      trip: state.trip,
      outbox: state.outbox,
    },
    cookie: { value: readCookie(), expires: await readCookieExpiry() },
    storage: await storageInfo(),
    backgroundSyncSupported: backgroundSyncSupported(),
    install: { ...installFlags },
    serviceWorker: await swInfo(),
    log: await recentLog(),
  };
}
