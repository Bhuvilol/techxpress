# Vortex — Frontend

A React 19 + Vite + Tailwind single-page app, deployed as a static
**Cloudflare Worker** (`vortex-app`). See the [root README](../README.md) for
the whole system.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api and /socket.io to http://127.0.0.1:3001
npm run build      # production bundle in dist/
npm run lint
```

## Configuration

| Variable | Where | Meaning |
|---|---|---|
| `VITE_API_URL` | `.env` locally; a **build variable** in Cloudflare | Backend base URL, e.g. `https://api.3-6-239-100.sslip.io`. Empty means same origin (Docker/nginx and the Vite dev proxy) |

`VITE_API_URL` is baked in at **build time**. After changing it in
Cloudflare, retry the build.

## Deploy

- **Cloudflare Workers Builds** watches `main` (root directory `frontend`),
  runs `npm ci && npm run build`, then `npx wrangler deploy`.
- `wrangler.jsonc` sets the Worker name (`vortex-app`) and the SPA fallback,
  so deep links like `/teams` load `index.html`.
- **Local Docker image:** `Dockerfile` builds the bundle into nginx
  (`nginx.conf` proxies `/api` and `/socket.io` to the backend container).

## Routes

| Path | Who | Page |
|---|---|---|
| `/` | everyone | Home |
| `/register`, `/login` | logged-out users | Registration (per-field validation), Login |
| `/leaderboard`, `/awards`, `/problem-statements` | everyone | Live leaderboard, awards, problem statements grouped by theme |
| `/directory` | any logged-in user | Verified-student directory |
| `/dashboard` | student | Profile, Explore (members/teams), Inbox, Broadcasts |
| `/teams` | student | My Team: create/join, members, "Action needed" alerts, leader queues, **team chat** |
| `/jury` | jury | Scoring board |
| `/coordinator` | coordinator | Institution verification queue |
| `/admin/*` | admin | Overview, Verification, Registry, Teams, Rules, Rounds, Taxonomy, Broadcast, Audit, Testing |

## Code layout

```
src/
  App.jsx            route table + role guards (components/layout/RouteGuards.jsx)
  lib/               api.js (fetch wrapper, 401 → logout), socket.js (Socket.IO singleton), storage.js
  contexts/          AuthContext, ToastContext, BroadcastContext (live announcements)
  hooks/             useApi (fetch + refetch-on-focus + optional polling), useSocketEvent
  components/ui/     shared UI (Modal, Badge, FormField, StatTile, …)
  components/layout/ TopAppBar, AdminShell, CoordinatorShell, AppLayout
  components/team/   TeamChat
  pages/             public · student · jury · coordinator · admin · shared
```

## Conventions

- **API calls:** every call goes through `lib/api.js`. Errors arrive as
  `ApiError { message, code, status, details }`; account-status codes are in
  `details.code`.
- **Live updates:**
  - Global events: `broadcast:new`, `leaderboard:changed`.
  - Per-user events: `invite:received`.
  - Team chat: `team:message` in the membership-checked `team:<id>` room.
- **Forms:** wrap inputs in `FormField` with `field="<key>"` and `error`. The
  red outline and jump-to-first-error rely on these.
- **Scroll panels:** long lists scroll inside `.scroll-panel` containers.
