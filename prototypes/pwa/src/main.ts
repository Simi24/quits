import './styles.css';
import { runAction, openPasted } from './actions';
import { boot } from './boot';
import { collect } from './diagnostics';
import { listenInstall } from './install';
import { logEvent, onLogChange } from './log';
import { displayMode, iosStandalone } from './platform';
import { render } from './render';
import type { AppState } from './state';
import { registerSw } from './sw';

// Everything lives under /v/ so the Path=/v/ cookie is readable.
const outsideV = !location.pathname.startsWith('/v/');
if (outsideV) location.replace(`/v/${location.search}${location.hash}`);

const root = document.getElementById('app') as HTMLElement;
let state: AppState | null = null;
let flash = '';

async function refresh(): Promise<void> {
  if (!state) return;
  render(root, state, await collect(state), flash);
}

listenInstall(() => void refresh());

async function start(): Promise<void> {
  await logEvent('launch', `mode=${displayMode()} standalone=${iosStandalone()} href=${location.href}`);
  state = await boot();
  onLogChange(() => void refresh());
  await refresh();
  void registerSw();
}

root.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el || !state) return;
  void runAction(state, el.dataset['action'] ?? '', el).then((msg) => {
    flash = msg;
    return refresh();
  });
});

root.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = (e.target as HTMLFormElement).elements.namedItem('link') as HTMLInputElement;
  void openPasted(input.value).then((msg) => {
    flash = msg;
    return refresh();
  });
});

document.addEventListener('visibilitychange', () => void logEvent('visibilitychange', document.visibilityState));
window.addEventListener('online', () => void logEvent('online'));
window.addEventListener('offline', () => void logEvent('offline'));
window.addEventListener('pageshow', (e) => void logEvent('pageshow', `persisted=${e.persisted}`));
window.addEventListener('hashchange', () => {
  void logEvent('hashchange', location.href).then(() => location.reload());
});

if (!outsideV) void start();
