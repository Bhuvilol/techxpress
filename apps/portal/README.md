# VORTEX portal (frontend)

A React 19 + Vite + Tailwind single-page app, served under **`/vortex`** on the TechXpress domain by the shared Cloudflare Worker (see the [root README](../../README.md) and [docs/DEPLOY.md](../../docs/DEPLOY.md)).

## Run

```bash
npm install
npm run dev        # http://localhost:5174/vortex/, proxies /api and /socket.io to http://127.0.0.1:3001
npm run build      # production bundle in dist/ (the root build copies it to dist/vortex/)
npm run lint
```

## Configuration

| Variable | Where | Meaning |
|---|---|---|
| `VITE_API_URL` | `.env` locally; a **build variable** in Cloudflare Workers Builds | API base URL (the Cloud Run URL). Empty means same origin, i.e. the Vite dev proxy |
| `VITE_ENABLE_TESTING` | `.env` locally only | `true` shows Admin → Testing (bulk test data). Leave unset in production |

Both are baked in at **build time**. After changing one in Cloudflare, trigger a new build.

## Base path

`vite.config.js` sets `base: '/vortex/'` and `main.jsx` uses `<BrowserRouter basename="/vortex">`, so routes and `<Link>`s are written without the prefix (`/teams`, not `/vortex/teams`). Links **out** of the portal (the "← TechXpress" link to the train site) must be plain `<a href>` tags, because the router would add the prefix.

## Routes

Paths below are relative to `/vortex`.

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
| `/admin/*` | admin | Overview, Verification, Registry, Staff (staff login codes), Teams, Rules, Rounds, Taxonomy, Broadcast, Audit, Testing (only with `VITE_ENABLE_TESTING=true`) |

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
