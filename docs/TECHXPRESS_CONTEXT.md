# TechXpress monorepo: project context and migration plan

> Hand-off context for a new session. It covers what exists, what has been decided, and what to do next.
> Written 24 Nov 2026. **Registration opens Fri 27 Nov 2026.**
> Contains no secrets. Secrets live in GCP Secret Manager or Cloudflare, or the user provides them.

---

## 1. Goal

Merge two separate projects into **one new GitHub repo** and **one website**:

- The **train experience** (an animated story-style landing site) is served at `/`.
- The **VORTEX hackathon platform** is served at **`/vortex`** on the same domain.
- The backend and database move from **AWS EC2 + Supabase** to **GCP (Cloud Run + Cloud SQL)**.
- Email moves from **Amazon SES** to **Cloudflare Email Service**.
- **No AWS and no Supabase** remain afterwards.
- The frontend stays on **Cloudflare Workers**: one Worker serves both apps.

---

## 2. Source repositories (local, read-only: do not modify them)

### 2.1 Train experience: `/Users/bhuvi/Documents/Projects/TECHEXPERSS2.0`
- GitHub: `M0h1tkumar/TECHEXPERSS2.0`. Import the **`bhuvi`** branch, which contains everything on `main`.
- It has an **uncommitted fix**:
  - What it does: a poster image (`src/assets/train_bg_poster.jpg`, untracked) shows behind the interior video until the video is ready, which prevents a black flash. The carriage image also falls back from WebP to PNG, and the next scene's preloading starts immediately.
  - Files: `InteriorScene.jsx/.css` and `TrainScene.jsx`.
  - **Ask the user whether to keep it** (as a separate commit) or drop it.
- Ignore the `orosmit-backend` branch (an SQLite registration service that VORTEX replaces).
- Stack: React 19, Vite 8, GSAP + ScrollTrigger, Lenis, react-router 7. Plain CSS (Tailwind is listed in `package.json` but **not used**).
- Routes:
  - `/` (`TrainScene`): a loading gate waits for 8 images. The train arrives, then the station master "Rajesh" speaks (`StationMaster`). Scrolling a 400vh spacer, or double-tapping, zooms through the door, then `onComplete` navigates to `/interior`.
  - `/interior` (`InteriorScene`): a looping video behind a masked interior image, then a hanging sign (`SeatNavigation`) with ABOUT, REGISTER and ASK PRICES.
  - `/about`: placeholder content. `/ask` (`AskRajesh`): a non-working chat mockup.
  - `/register` currently redirects **externally** to `https://vortex-app.bhuvism003.workers.dev/` (`TICKETING_URL` in `src/App.jsx`).
- **Global side effects:** Lenis smooth scroll runs app-wide, and `index.css` hides scrollbars and sets `body` overflow. Both must stay out of the portal.
- Known rough edges:
  - a `console.log('--- SYNC DEBUG ---')` in TrainScene;
  - "Do not show again" uses `window.SKIP_GUIDES`, which doesn't persist;
  - sign options aren't keyboard-operable;
  - a 10 MB PNG fallback, and `background2.png` loaded twice;
  - `source-assets/` (about 26 MB of originals) is committed.
- Deploy today: Worker `techexpress-site` (`wrangler.jsonc`, assets `./dist`, SPA fallback), plus `public/_headers` for caching `/assets/*`.

### 2.2 VORTEX platform: `/Users/bhuvi/Documents/Projects/TechExpress`
- GitHub: `Bhuvilol/VORTEX` (private). Import **`main`** (same commit as `dev`, `4d80b46`).
- License: **AGPL-3.0**. The user has agreed to AGPL for the whole new repo.
- Docs worth reading: `README.md`, `DEPLOY.md` (AWS-era), `KNOWN_ISSUES.md`, `GITHUB_ISSUES.md`, `ADDITIONAL_ISSUES.md`, `CREDENTIALS.md` (no real secrets inside; they're in AWS SSM).
- **`frontend/`:** React 19, Vite 8, Tailwind 3, Framer Motion, socket.io-client, react-router 7.
  - Uses `@cloudflare/vite-plugin` and its own `wrangler.jsonc` (Worker `vortex-app`). **Both get removed.**
  - All API calls go through `src/lib/api.js` (`BASE = import.meta.env.VITE_API_URL`). Socket in `src/lib/socket.js`.
  - Login token stored in `localStorage` (`vortex.token`, `vortex.user`).
  - Routes: `/`, `/login`, `/register`, `/leaderboard`, `/awards`, `/problem-statements`, `/dashboard`, `/teams`, `/jury`, `/directory`, `/admin/*` (verification, registry, teams, rules, rounds, taxonomy, broadcast, audit, testing), `/coordinator`.
  - No hard-coded absolute `window.location` or `href="/…"` paths were found, so adding a `basename` is enough.
- **`backend/`:** Express 4, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, Socket.IO 4, Zod, bcrypt, JWT.
  - Layers: routes → controllers → services. Validation in `src/validators`. Config in `src/config/env.js`.
  - **Supabase is used only as plain Postgres.** There's no Supabase auth, storage or realtime, so migrating means a new connection string with no code rewrite.
  - **The only AWS code is `src/utils/mail.js`** (`@aws-sdk/client-sesv2`).
  - **In-memory state:** Socket.IO rooms and `utils/userStatusCache.js` (30 s cache of each user's status). Assumes a **single instance**.
  - `prisma.config.js` reads `DIRECT_URL || DATABASE_URL` (`DIRECT_URL` exists only because of Supabase's pooler).
  - Health: `GET /api/health` (checks the database; 503 if it's down) and `GET /api/health/live`.
  - `express.json` limit is 10 MB (should be about 100 kb).
  - The Dockerfile uses node:20-slim and runs as root.
  - The seed (`prisma/seed.js`) creates placeholder `@vortex.com` jury and coordinator accounts with shared passwords, **prints passwords**, and **prunes** taxonomy rows that aren't in its list.
  - Migrations only (`prisma/migrations`). **Never use `prisma db push`.**
- Roles: STUDENT, COORDINATOR (verifies students from their own institution), JURY (scores 3 rounds, 5 criteria × 0–10), ADMIN.
- Today's (old) infrastructure:
  - Worker `vortex-app`;
  - EC2 `i-046ce4ff2d0e7bfe0` in `ap-south-1` running Docker Compose with Caddy, Elastic IP `3.6.239.100`, API at `api.3-6-239-100.sslip.io`;
  - ECR, SSM `/vortex/staging/*`, CloudWatch, GitHub OIDC deploys;
  - Supabase `vortex-staging`;
  - AWS account `820539072886`.
- **There is no real user data.** Registration hasn't started, so the database will be **rebuilt fresh** (migrations + seed). Nothing is copied from Supabase.

---

## 3. Confirmed decisions

| Area | Decision |
|---|---|
| Repo | **New repo** (URL to be provided by the user). Import both histories with `git subtree` (`git-filter-repo` isn't installed) |
| URL layout | Train site at `/`; VORTEX portal at **`/vortex`** |
| Frontend hosting | **One Cloudflare Worker** `techxpress`; account is on Workers Paid |
| Backend | **Cloud Run** `vortex-api`, region **`asia-south1`** |
| Database | **Cloud SQL PostgreSQL 16, one production instance** (no staging for now) |
| Email | **Cloudflare Email Service via REST API**, with a token that can only send email, stored in Secret Manager |
| Secrets | GCP Secret Manager |
| CI auth | GitHub Actions → **Workload Identity Federation** (no key files) |
| AWS / Supabase | **Removed completely** after launch |
| Before launch | Rehearse on production, then **wipe and re-seed on 26 Nov** |
| License | AGPL-3.0, whole repo |
| API URL at launch | The `*.run.app` URL (a custom `api.` subdomain is optional later) |

---

## 4. Target layout of the new repo

```
techxpress/
├─ apps/site/          train experience (from TECHEXPERSS2.0)
├─ apps/portal/        VORTEX frontend, Vite base '/vortex/', BrowserRouter basename '/vortex'
├─ services/api/       VORTEX backend + prisma
├─ worker/index.js     runs only when no file matches: /vortex/* → /vortex/index.html, else → /index.html
├─ scripts/build.mjs   builds both apps → dist/ (site) and dist/vortex/ (portal)
├─ infra/gcp/setup.sh  one-time gcloud setup (the user reviews it before it runs)
├─ docs/               DEPLOY.md, RUNBOOK.md, CREDENTIALS.md (locations only), issue docs
├─ .github/workflows/  ci.yml, deploy-api.yml
├─ docker-compose.yml  local postgres:16 + api
├─ wrangler.jsonc      name techxpress, main worker/index.js,
│                      assets { directory ./dist, binding ASSETS, not_found_handling "none" }
├─ package.json        dev:site, dev:portal, dev:api, build, lint
├─ .nvmrc (22), LICENSE (AGPL-3.0), README.md
```

**Delete:**
- `deploy/` (Caddy, EC2 Compose file) and the AWS workflow `deploy-backend.yml`;
- both old `wrangler.jsonc` files and the portal's Cloudflare Vite plugin;
- `react_vite_context.md`, `backend/pnpm-lock.yaml`, the Makefile;
- unused Tailwind and PostCSS packages in the site;
- the old CREDENTIALS content.

---

## 5. Code changes required

### Site (`apps/site`)
- Remove the external `TICKETING_URL`. "Register" does a **full page load** to `/vortex/register`, and the `/register` route redirects there too.
- Remove the debug `console.log`. Make the sign options work with Enter and Space.
- `public/_headers`: cache `/assets/*` **and** `/vortex/assets/*` as immutable.

### Portal (`apps/portal`)
- `vite.config.js`: `base: '/vortex/'`, remove the Cloudflare plugin, keep the dev proxy (`/api` and `/socket.io` → :3001).
- `main.jsx`: `<BrowserRouter basename="/vortex">`. Add a "← TechXpress" link back to `/`.
- Hide the Admin → Testing page when testing import is turned off.
- `npm audit fix`. Replace `xlsx` 0.18.5 with the SheetJS CDN build 0.20.x. There are 24 lint errors (D9): fix them or make lint a warning in CI at first.
- **STU-03:** show a "registration opens soon" state when registration is switched off.

### API (`services/api`)
- **`mail.js`:**
  - Send with `fetch` to `POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/email/sending/send`, with `Authorization: Bearer {CF_EMAIL_API_TOKEN}`.
  - Keep the same `sendMail()` interface. If `MAIL_FROM` isn't set, log instead of sending.
  - Remove `@aws-sdk/client-sesv2`.
  - Approval emails include a login link `${APP_URL}/vortex/login`.
- **`env.js`:**
  - Remove `SES_REGION` and `DIRECT_URL`.
  - Add `APP_URL`, `CF_ACCOUNT_ID`, `CF_EMAIL_API_TOKEN` and `ENABLE_TESTING_IMPORT` (default false).
  - Remove `JURY_SEED_PASSWORD` and `COORDINATOR_SEED_PASSWORD`.
- **`db.js`:** `new PrismaPg({ connectionString, max: 10 })`.
  - `DATABASE_URL` = `postgresql://vortex_app:<pw>@localhost/vortex?host=/cloudsql/<PROJECT>:asia-south1:vortex-db`.
  - **Verify** that adapter-pg accepts the socket host. If not, use `@google-cloud/cloud-sql-connector`.
- **`index.js`:** JSON limit `100kb`. Mount `/api/admin/testing` only when `ENABLE_TESTING_IMPORT=true`.
- **`logger.js`:** add a `severity` field so Cloud Logging reads levels correctly.
- **Dockerfile:** node:22-slim, `npm ci`, Prisma CLI kept for the migration job, `USER node`, listens on `$PORT`.
- **Seed:**
  - read staff from `STAFF_SEED_JSON` (or a local file git ignores), creating staff **without passwords**;
  - an admin reissues each staff password, which is emailed;
  - never print passwords;
  - taxonomy and rules come from data files;
  - pruning only with an explicit `--prune` flag.
- `TRUST_PROXY_HOPS=1` behind Google's front end. **Check the logged client IPs** during the rehearsal.

### Final API environment variables
| Variable | Where | Notes |
|---|---|---|
| `NODE_ENV` | env | `production` |
| `PORT` | Cloud Run | 8080 |
| `TRUST_PROXY_HOPS` | env | 1 |
| `LOG_LEVEL` | env | info |
| `DATABASE_URL` | Secret | Cloud SQL socket URL |
| `ACCESS_TOKEN_SECRET` | Secret | new, 48 random bytes |
| `ACCESS_TOKEN_EXPIRY` | env | 8h |
| `BCRYPT_ROUNDS` | env | 12 |
| `CORS_ORIGIN` | env | `https://<domain>,https://techxpress.<acct>.workers.dev,http://localhost:5174` |
| `APP_URL` | env | `https://<domain>` |
| `MAIL_FROM` | env | `TechXpress <noreply@<domain>>` |
| `MAIL_REPLY_TO` | env | organizer inbox |
| `CF_ACCOUNT_ID` | env | |
| `CF_EMAIL_API_TOKEN` | Secret | Email Sending permission only |
| `ENABLE_TESTING_IMPORT` | env | false |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | env / Secret | |
| `STAFF_SEED_JSON` | Secret | real staff list |

---

## 6. GCP resources (all in `asia-south1`)

- **APIs:** run, sqladmin, artifactregistry, secretmanager, iamcredentials, sts, cloudresourcemanager, monitoring, logging. Plus a **budget alert** at 50%, 90% and 100%.
- **Cloud SQL `vortex-db`:**
  - PostgreSQL 16, Enterprise edition, `db-custom-1-3840` (1 vCPU / 3.75 GB);
  - 10 GB SSD with automatic increase, single zone;
  - daily backups at 21:30 UTC, keeping 7, plus point-in-time recovery for 7 days;
  - maintenance on Sundays at 21:30 UTC, with a maintenance freeze over the event dates;
  - deletion protection on;
  - public IP with **no allowed IP addresses** (access only through the Cloud SQL connector);
  - database `vortex`, user `vortex_app`.
- **Artifact Registry:** Docker repository `techxpress`, keeping the last 20 images.
- **Secret Manager:** `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `CF_EMAIL_API_TOKEN`, `ADMIN_SEED_PASSWORD`, `STAFF_SEED_JSON`.
- **Service accounts:**
  - `vortex-api@`: cloudsql.client, plus secretAccessor on just those secrets.
  - `github-deployer@`: run.developer, artifactregistry.writer (on that repository only), iam.serviceAccountUser on `vortex-api@` only.
- **Workload Identity Federation:**
  - identity pool `github`, OIDC provider for `https://token.actions.githubusercontent.com`;
  - only accepts tokens whose `repository_id` is the **new repo's ID** and whose ref is `refs/heads/main`;
  - grants `workloadIdentityUser` on `github-deployer@`.
- **Cloud Run `vortex-api`:**
  - min 1 / max 1 instances, **session affinity on**, timeout 3600 s;
  - 1 vCPU / 1 GiB normally, **2 vCPU on event days**;
  - concurrency 1000, request-based billing;
  - Cloud SQL attached, service account `vortex-api@`;
  - startup and liveness checks on `/api/health/live`;
  - public (unauthenticated access allowed).
- **Cloud Run jobs (same image):**
  - `vortex-migrate`: `npx prisma migrate deploy`, run by CI before each deploy.
  - `vortex-seed`: run by hand.
  - `vortex-reset`: `prisma migrate reset --force --skip-seed`, **used once on 26 Nov, then deleted**.
- **Monitoring:**
  - uptime check on `/api/health` every minute, alerting by email;
  - alerts for Cloud SQL CPU or storage above 80%, Cloud Run 5xx above 2%, and concurrency close to the limit.
- **GitHub repo variables:** `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `DEPLOYER_SA`. Protect `main` (PRs with CI passing).

### Workflows
- **`ci.yml`** (PRs and pushes): install, lint both frontends, build both and assemble `dist/`, `prisma validate`, test Docker build.
- **`deploy-api.yml`** (push to `main` touching `services/api/**`, or run by hand):
  1. sign in through Workload Identity Federation;
  2. build and push the image tagged with the commit hash;
  3. update and run `vortex-migrate` and wait (**stop on failure**);
  4. `gcloud run deploy`;
  5. smoke test `/api/health` expecting `{"status":"ok","db":"ok"}`.
- **Frontend:** Cloudflare **Workers Builds** connected to the new repo. Root `/`, build `npm ci && npm run build`, deploy `npx wrangler deploy`, build variable `VITE_API_URL=<Cloud Run URL>`.

---

## 7. Cloudflare: domain and email (domain arriving ~25 Nov)

1. Add the domain to Cloudflare (Cloudflare Registrar is preferred). SSL **Full (strict)**, Always Use HTTPS.
2. Attach `<domain>` and `www.<domain>` to the `techxpress` Worker as custom domains, and redirect `www` to the bare domain.
3. **Email Service:** set up sending for the domain (Cloudflare adds SPF and DKIM automatically). Add DMARC: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<organizer inbox>`.
4. **Email Routing:** forward `team@<domain>` to the organizers' Gmail.
5. Create an API token with only the Email Sending permission and store it in Secret Manager. Set `MAIL_FROM` and `CF_ACCOUNT_ID`, then redeploy.
6. Email Service has been in **public beta since 16 Apr 2026**. It needs Workers Paid, which includes about 3,000 emails a month, then about $0.35 per 1,000. **Confirm limits and pricing on the official pages.**
7. **Deliverability test:** Gmail, Outlook and a college address. SPF, DKIM and DMARC must all pass, and the email must not land in spam.

---

## 8. Phases and timeline

| Phase | What | When |
|---|---|---|
| 0 | Gather inputs (section 10) | 24–25 Nov |
| 1 | Build the repo: import histories, restructure, delete AWS/Supabase leftovers, root scripts, README | 24 Nov |
| 2 | Portal at `/vortex`, Worker routing, site changes | 24 Nov |
| 3 | API changes: Cloudflare email, Cloud SQL, environment variables, Dockerfile, seed, security, audit | 24–25 Nov |
| 4 | GCP setup (`infra/gcp/setup.sh`, reviewed first) | 25 Nov |
| 5 | Workflows, first deploy, Workers Builds, domain, email | 25 Nov |
| 6 | Rehearsal and load test, then **wipe and re-seed with real data, registration OFF, freeze** | 26 Nov |
| 7 | 🚀 Registration ON, with monitoring | **27 Nov** |
| 8 | Shut down the old setup | 28–30 Nov |
| 9 | Fixes before team formation and before judging | after launch |

### Rehearsal checklist (Phase 6)
- **Train site:** the full flow; the Register sign option goes to `/vortex/register`; refreshing `/interior`, `/vortex/teams` and `/vortex/admin` works.
- **Registration:** validation, honeypot, rate limiting, and the "opens soon" state.
- **Verification:** a coordinator verifies a student from their college; the email arrives with password and login link.
- **Admin:** verify, reject, revoke (instant logout), reissue (students and staff).
- **Student:** Directory; create a team; invite and join request; leave or dismiss with approval from both sides; team chat; finalize.
- **Jury, leaderboard and broadcasts:** a jury member scores in an unlocked round; leaderboard visibility and "Show marks"; broadcasts.
- **Real client IPs** in the logs.
- **Load test (k6):** 200 sign-ups in 5 minutes, 500 logins in 2 minutes, 1,000 virtual users browsing, **800 concurrent sockets**. Raise rate limits temporarily, because all test traffic comes from one IP.

### Rollback (goes in `docs/RUNBOOK.md`)
- **API:** `gcloud run services update-traffic vortex-api --to-revisions=<prev>=100`
- **Frontend:** roll back in the Cloudflare dashboard, or `wrangler rollback`.
- **Database:** restore to a point in time as a new instance, then repoint `DATABASE_URL`. Migrations are always backward-compatible.
- **Email outage:** admins share the password shown on screen. The provider is a single-file swap.

### Shutting down the old setup (Phase 8)
- **AWS:**
  - terminate EC2 `i-046ce4ff2d0e7bfe0` and **release the Elastic IP `3.6.239.100`**;
  - delete ECR `vortex-backend`, the S3 bucket `vortex-db-backups-820539072886`, and SSM `/vortex/staging/*`;
  - delete the IAM roles `vortex-staging-ec2-role` and `vortex-github-deploy`, plus the GitHub OIDC provider;
  - delete the CloudWatch log groups `/vortex/staging/*` and security group `sg-0c05f654006c25193`;
  - optionally close the account.
- **Supabase:** one final `pg_dump`, then delete `vortex-staging`.
- **Cloudflare:** delete the old Workers `vortex-app`, `techexpress-site` and `vortex`.
- **GitHub:** archive both old repos with a pointer README. **Make the old public `Bhuvilol/TechExpress` private or archive it** (it contains default credentials).

---

## 9. Risks
| # | Risk | Mitigation |
|---|---|---|
| R1 | Domain is late | Launch on `workers.dev`; admins share passwords from the screen |
| R2 | Cloudflare Email beta: deliverability or limits | Test on 26 Nov; the email code is swappable |
| R3 | **Cloud Run allows at most 1,000 concurrent requests per instance, and each WebSocket uses one** | Load test. If tight: Socket.IO Redis adapter (Memorystore plus VPC egress) and 2–3 instances |
| R4 | Team-page polling (3 endpoints every 5 s per tab, B3) | Fix before team formation |
| R5 | adapter-pg rejects the Cloud SQL socket URL | Use `@google-cloud/cloud-sql-connector` |
| R6 | Wrong proxy-hop count breaks rate limiting | Check logged IPs |
| R7 | Dependency or lint fixes break builds | CI gate; lint as a warning at first |

**Cost estimate:** about $85–135 per month during the event month. Cloud SQL about $55–65, Cloud Run about $20–60, Cloudflare $5, email about $0.

---

## 10. Still needed from the user
- [ ] New GitHub repo URL, plus push access (`gh auth`)
- [ ] GCP project ID, billing or credits, and `gcloud` installed and signed in (Owner, or Editor + Security Admin + Service Account Admin)
- [ ] Cloudflare: confirm Workers Paid; dashboard or API token access
- [ ] Domain name (expected 25 Nov)
- [ ] Staff list: admins, jury, coordinators (name, email, institution)
- [ ] Event data: institutions, domains, problem statements, team rules, round dates
- [ ] Organizer reply-to inbox
- [ ] Keep or drop the uncommitted poster fix
- [ ] **Decision before team formation:** the domain-expert rule (B1). Options: a registration field, an admin toggle, or `minDomainExperts = 0`

## 11. Fixes after launch (from VORTEX's KNOWN_ISSUES and GITHUB_ISSUES)
- **Before team formation:** B1–B5 and CONF-01 (team-lockdown switch in the admin UI).
- **Before judging:** GITHUB_ISSUES 1–3 (scoring races, scores lost on disband), CONC-01, C3 (load test and jury dry run).
- **Hardening:** remaining D items, AUTH-03, SEC-01/02 (spreadsheet formula injection), RATE-01 (shared campus NAT IP).

---

## 12. How to work with this user
- **Plan before acting.** Don't create resources or run anything with outside effects (GitHub repo creation, pushes, GCP/Cloudflare/AWS changes, deletions) without explicit approval.
- Local code edits are fine once the user says go. Show `infra/gcp/setup.sh` for review before running it.
- Never commit secrets. `CREDENTIALS.md` only says where secrets are stored.
- Keep commits small and well described, and keep both imported histories intact.
