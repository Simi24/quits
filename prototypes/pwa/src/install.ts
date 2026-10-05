import { logEvent } from './log';

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
export const installFlags = { promptFired: false, appInstalled: false };

// Registered synchronously at startup: beforeinstallprompt can fire before boot finishes.
export function listenInstall(onChange: () => void): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    installFlags.promptFired = true;
    void logEvent('beforeinstallprompt').then(onChange);
  });
  window.addEventListener('appinstalled', () => {
    installFlags.appInstalled = true;
    deferred = null;
    void logEvent('appinstalled').then(onChange);
  });
}

export function canPrompt(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  await logEvent('install-choice', choice.outcome);
}
