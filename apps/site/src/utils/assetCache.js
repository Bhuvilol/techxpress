const ASSET_CACHE_NAME = 'techxpress-assets-v1';

const memoryUrlMap = new Map();
const inflightMap = new Map();

async function fetchAndCacheAsset(url) {
  if (!url) return url;
  if (memoryUrlMap.has(url)) return memoryUrlMap.get(url);

  let response = null;
  const hasCacheApi = typeof window !== 'undefined' && 'caches' in window;

  if (hasCacheApi) {
    try {
      const cache = await window.caches.open(ASSET_CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        response = cached;
      } else {
        const fetched = await fetch(url, { cache: 'force-cache' });
        if (fetched.ok) {
          await cache.put(url, fetched.clone());
          response = fetched;
        }
      }
    } catch {
      /* Fallback to direct fetch below */
    }
  }

  if (!response) {
    const fetched = await fetch(url, { cache: 'force-cache' });
    if (!fetched.ok) return url;
    response = fetched;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  memoryUrlMap.set(url, objectUrl);
  return objectUrl;
}

export function warmAsset(url) {
  if (typeof window === 'undefined' || !url) return Promise.resolve(url);
  if (memoryUrlMap.has(url)) return Promise.resolve(memoryUrlMap.get(url));
  if (inflightMap.has(url)) return inflightMap.get(url);

  const task = fetchAndCacheAsset(url)
    .catch(() => url)
    .finally(() => {
      inflightMap.delete(url);
    });
  inflightMap.set(url, task);
  return task;
}

export function warmAssets(urls) {
  return Promise.all((urls ?? []).filter(Boolean).map(warmAsset));
}

export function getCachedAssetUrl(url) {
  return memoryUrlMap.get(url) || url;
}
