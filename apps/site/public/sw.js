const ASSET_CACHE = 'techxpress-assets-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('techxpress-assets-') && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

async function buildRangeResponse(request, fullResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return fullResponse;

  const buffer = await fullResponse.arrayBuffer();
  const total = buffer.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) return fullResponse;

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  if (start >= total || start > end) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const chunk = buffer.slice(start, end + 1);
  const headers = new Headers(fullResponse.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(chunk.byteLength));

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/assets/')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(url.pathname);
      if (cached) {
        return buildRangeResponse(request, cached.clone());
      }

      const networkResponse = await fetch(url.pathname);
      if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
        await cache.put(url.pathname, networkResponse.clone());
      }
      return buildRangeResponse(request, networkResponse);
    })(),
  );
});
