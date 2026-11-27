// TechXpress Worker.
//
// Static files in ./dist are served by Cloudflare before this code runs
// (assets.not_found_handling = "none"), so this only sees requests that
// matched no static file. It sends all page navigations to the unified single-page app:
//
//   /                   ->  /  (TechXpress Station)
//   /vortex, /vortex/*  ->  /  (Horizontal camera pan to VORTEX Terminal)
//
// Requests for missing files (a .js, .png, ...) get a real 404 rather than
// an HTML page, so broken asset links fail loudly instead of silently.

const isPageRequest = (request, pathname) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (lastSegment.includes('.')) return false; // looks like a file
  const accept = request.headers.get('Accept') ?? '';
  return accept === '' || accept.includes('text/html') || accept.includes('*/*');
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (!isPageRequest(request, pathname)) {
      return new Response('Not found', { status: 404 });
    }

    // Serve the unified single frontend app shell
    const shell = new URL('/', url);
    return env.ASSETS.fetch(new Request(shell, request));
  },
};
