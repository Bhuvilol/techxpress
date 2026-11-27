// "Log in to VORTEX" links: the portal is a separate app at /vortex/, so it
// is a full page load. A plain left click plays the slide first
// (DoorTransition listens for this event); modified clicks behave normally.
export const PORTAL_URL = '/vortex/login';
export const PORTAL_EVENT = 'txp:portal';
// Tells the portal to finish the slide on its first paint (read once there).
export const SLIDE_KEY = 'txp:slide';

export function goToPortal(event, url) {
  if (event && (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  event?.preventDefault();
  window.dispatchEvent(new CustomEvent(PORTAL_EVENT, { detail: { url: url || event?.currentTarget?.getAttribute?.('href') || PORTAL_URL } }));
}

// Prefetch the portal's page and its script/style files (low priority).
let prefetched = false;
export async function prefetchPortal() {
  if (prefetched || navigator.connection?.saveData) return;
  prefetched = true;
  const add = (href) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  };
  try {
    const res = await fetch('/vortex/', { credentials: 'same-origin' });
    const html = await res.text();
    for (const [, href] of html.matchAll(/(?:src|href)="(\/vortex\/assets\/[^"]+\.(?:js|css))"/g)) add(href);
  } catch { /* offline: the slide still works, just without the warm cache */ }
}
