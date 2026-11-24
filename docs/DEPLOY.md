# Deploying TechXpress

How the site and the VORTEX API are hosted, set up and released. Day-to-day operations and incidents are in [RUNBOOK.md](RUNBOOK.md); where secrets live is in [CREDENTIALS.md](CREDENTIALS.md).

## 1. Architecture

```
Browser
  │
  ▼
https://<domain>                      Cloudflare: DNS, Worker "techxpress", Email Service
  ├─ /, /interior, /about, /ask       train experience  (apps/site   → dist/)
  └─ /vortex/*                        VORTEX portal     (apps/portal → dist/vortex/)
        │  REST + Socket.IO over HTTPS
        ▼
https://vortex-api-….run.app          Cloud Run "vortex-api", asia-south1 (services/api)
        │  Cloud SQL connector (Unix socket /cloudsql/…)
        ▼
Cloud SQL PostgreSQL 16 "vortex-db"   asia-south1, backups + point-in-time recovery

Email    API → Cloudflare Email Service REST API → recipients
Secrets  GCP Secret Manager
CI/CD    GitHub Actions → Workload Identity Federation (no keys) → Cloud Run
         Cloudflare Workers Builds → Worker
```

| Piece | Where | Released by |
|---|---|---|
| Train site + portal (static) | Cloudflare Worker `techxpress` ([wrangler.jsonc](../wrangler.jsonc)) | Cloudflare **Workers Builds** on every push to `main` |
| API | Cloud Run service `vortex-api` | [.github/workflows/deploy-api.yml](../.github/workflows/deploy-api.yml) on pushes to `main` touching `services/api/**` |
| Database migrations | Cloud Run job `vortex-migrate` | the same workflow, **before** the service is updated |
| Seed | Cloud Run job `vortex-seed` | by hand |
| Infrastructure | [infra/gcp/setup.sh](../infra/gcp/setup.sh) | by hand, reviewed first |

### How the Worker routes requests
Cloudflare serves any file that exists in `dist/` directly. Only when nothing matches does [worker/index.js](../worker/index.js) run: page requests under `/vortex` get the portal's `index.html`, all other page requests get the site's, and missing files return 404. So refreshing `/interior` or `/vortex/teams` works, and the site's scripts never load on portal pages. Caching is set in [apps/site/public/_headers](../apps/site/public/_headers): hashed files under `/assets/` and `/vortex/assets/` are cached for a year, the page shells are `no-cache`.

### Why exactly one API instance
Socket.IO rooms, rate-limit counters and the user-status cache live in the API's memory. Running two instances would split them. The service is pinned to min 1 / max 1 with session affinity. Each open WebSocket counts as one of the instance's 1,000 concurrent requests; see [RUNBOOK.md → Capacity](RUNBOOK.md#capacity) for what to do if that gets tight.

## 2. First-time setup (in order)

| # | Step | Who |
|---|---|---|
| 1 | Create the GitHub repository and push `main`. Protect `main`: pull requests with the **CI** check passing. | Organizers |
| 2 | GCP: follow [infra/gcp/README.md](../infra/gcp/README.md) steps 1–4 (`setup.sh core`, then add the secrets and GitHub variables). | Organizers |
| 3 | First API deploy: push to `main` or run **Actions → Deploy API**. Note the `run.app` URL. | Automatic |
| 4 | Seed: `gcloud run jobs execute vortex-seed --region asia-south1 --wait`. | Organizers |
| 5 | Cloudflare **Workers Builds**: Workers & Pages → Create → Import a repository → this repo. Root directory `/`, build command `npm ci && npm run build`, deploy command `npx wrangler deploy`, build variable `VITE_API_URL` = the `run.app` URL. | Organizers |
| 6 | Add `https://techxpress.<account>.workers.dev` to `CORS_ORIGIN` in `infra/gcp/config.env`, re-run `setup.sh core`, and test on the `workers.dev` URL. | Organizers |
| 7 | `setup.sh monitoring` and `setup.sh budget`. | Organizers |
| 8 | Domain and email (sections 4–5). | Organizers |

## 3. Releases

### Frontend
Merge to `main`. Workers Builds runs `npm ci && npm run build` ([scripts/build.mjs](../scripts/build.mjs) builds both apps into `dist/` and `dist/vortex/`) and `npx wrangler deploy`. About a minute. Users with the old page open keep the old bundle until they reload.

`VITE_API_URL` is baked in at build time. After changing it in the Workers Builds settings, trigger a new build.

### API
Merge to `main` (anything under `services/api/`). The **Deploy API** workflow:
1. signs in to GCP through Workload Identity Federation;
2. builds the image and pushes it as `asia-south1-docker.pkg.dev/<project>/techxpress/vortex-api:<commit>`;
3. updates and runs the `vortex-migrate` job, and **stops if migrations fail** (the running API is untouched);
4. points `vortex-seed` at the new image;
5. deploys the new revision of `vortex-api`;
6. requires `GET /api/health` to return `"status":"ok"` and `"db":"ok"`, otherwise fails and prints the rollback command.

It can also be run by hand from the Actions tab. Two deploys never run at once.

### Database migrations
Prisma migrations only (`services/api/prisma/migrations`); never `prisma db push`. Write them **backward-compatible** (add first, remove in a later release) so that rolling the API back never meets a schema it can't read. CI applies every migration to an empty Postgres and fails if `schema.prisma` has changes without a migration.

## 4. Domain (Cloudflare)

1. Add the domain to Cloudflare (Cloudflare Registrar if the TLD is supported; otherwise switch the registrar's nameservers to Cloudflare's).
2. SSL/TLS → **Full (strict)**; turn on **Always Use HTTPS**.
3. Worker `techxpress` → Settings → Domains & Routes → add `<domain>` and `www.<domain>` as **custom domains**. Add a redirect rule from `www` to the bare domain.
4. In `infra/gcp/config.env`: `CORS_ORIGIN=https://<domain>,https://techxpress.<account>.workers.dev`, `APP_URL=https://<domain>`. Re-run `./infra/gcp/setup.sh core`.
5. The API stays on its `run.app` URL for launch. A custom `api.<domain>` is optional later.

## 5. Email (Cloudflare Email Service)

1. Dashboard → Email Service → set up **sending** for `<domain>`. Cloudflare adds the SPF and DKIM records because it runs the DNS.
2. Add DMARC: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:<organizer inbox>`. Move to `p=quarantine` after the event.
3. **Email Routing**: forward `team@<domain>` to the organizers' inbox, so replies to `MAIL_REPLY_TO` reach a person.
4. Create an API token with only **Email Sending Write** on the account. Store it: `add_secret CF_EMAIL_API_TOKEN` (see [infra/gcp/README.md](../infra/gcp/README.md)).
5. In `config.env`: `MAIL_FROM="TechXpress <noreply@<domain>>"`, `MAIL_REPLY_TO=team@<domain>`, `CF_ACCOUNT_ID=<account id>`. Re-run `setup.sh core`.
6. **Sending limits:** new accounts start with a conservative daily quota that Cloudflare doesn't publish. Every verified student gets an email, so **request higher limits well before registration opens**. Over the quota the API gets HTTP 429; the business action still succeeds and admins see the password on screen.
7. **Deliverability test:** verify a test student and check the email at Gmail, Outlook and a college address. In "Show original", SPF, DKIM and DMARC must all say PASS, and the email must not be in spam.

## 6. API configuration

Set by `setup.sh core` from `config.env` (plain values) and Secret Manager (secrets).

| Variable | Source | Value |
|---|---|---|
| `NODE_ENV` | env | `production` |
| `PORT` | Cloud Run | `8080` |
| `TRUST_PROXY_HOPS` | env | `1` (Google's front end). Check the `ip` field of `http` log lines shows real client IPs. |
| `LOG_LEVEL` | env | `info` |
| `ACCESS_TOKEN_EXPIRY` | env | `8h` |
| `BCRYPT_ROUNDS` | env | `12` |
| `CORS_ORIGIN` | env | site origins, comma-separated |
| `APP_URL` | env | `https://<domain>` (login links in emails) |
| `MAIL_FROM`, `MAIL_REPLY_TO`, `CF_ACCOUNT_ID` | env | see section 5 |
| `ENABLE_TESTING_IMPORT` | env | `false` (never true in production) |
| `DATABASE_URL` | secret | `postgresql://vortex_app:…@localhost/vortex?host=/cloudsql/<project>:asia-south1:vortex-db` |
| `ACCESS_TOKEN_SECRET` | secret | 48 random bytes |
| `CF_EMAIL_API_TOKEN` | secret | Email Sending Write only |

Seed job only: `ADMIN_SEED_EMAIL` (env), `ADMIN_SEED_PASSWORD` and `STAFF_SEED_JSON` (secrets).

Portal build only (Workers Builds variables): `VITE_API_URL` (the API URL); `VITE_ENABLE_TESTING` stays unset in production.

## 7. Cost (event month, approximate)

| Item | Per month |
|---|---|
| Cloud SQL (1 vCPU / 3.75 GB, 10 GB SSD, backups) | $55–65 |
| Cloud Run (1 always-on instance, request-based billing) | $20–60 |
| Artifact Registry, Secret Manager, logging | < $5 |
| Cloudflare Workers Paid | $5 |
| Cloudflare Email | about $0 at this volume |

Scale down after the event: Cloud Run back to 1 vCPU, and consider a smaller Cloud SQL tier.
