// PROTOTYPE (issue #11). Imported by the generated service worker.
// Records Background Sync events (Chromium only) in the same IndexedDB log the page reads,
// so the author can see whether a sync fired while the app was closed.
self.addEventListener('sync', (event) => {
  event.waitUntil(appendLog('sw-sync', `tag=${event.tag}`));
});

function appendLog(type, detail) {
  return new Promise((resolve) => {
    const req = indexedDB.open('quits-proto', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('log', { autoIncrement: true });
    };
    req.onerror = () => resolve();
    req.onsuccess = () => {
      const tx = req.result.transaction('log', 'readwrite');
      tx.objectStore('log').add({ at: new Date().toISOString(), type, detail, ctx: 'service-worker' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };
  });
}
