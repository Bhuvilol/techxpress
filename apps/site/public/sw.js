// Retired service worker.
//
// An earlier version of the site installed a cache-first service worker at
// this path. Browsers that still have it check this file for updates, so it
// must keep existing. This version deletes the old caches, unregisters
// itself and reloads the open pages, which then load normally from the
// network (with the usual HTTP caching from _headers).

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('techxpress-assets-')).map((key) => caches.delete(key)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.navigate(page.url);
  })());
});
