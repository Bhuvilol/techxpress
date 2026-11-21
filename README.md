# Vortex

A hackathon management platform for one event: student registration and
verification, team formation, private team chat, multi-round jury scoring,
and a live leaderboard with awards.

> **Stack:** React 19 · Vite · Tailwind · Express 4 · Prisma 7 · PostgreSQL ·
> Socket.IO · Docker
> **Hosting:** Cloudflare Workers (frontend) · AWS EC2 Mumbai (backend) ·
> Supabase Postgres · Amazon SES · GitHub Actions

---

## Contents

1. [What it does](#1-what-it-does)
2. [Architecture](#2-architecture)
3. [Environments](#3-environments)
4. [Run it locally](#4-run-it-locally)
5. [Everyday development](#5-everyday-development)
6. [Project layout](#6-project-layout)
7. [Documentation index](#7-documentation-index)
8. [License](#8-license)

---

## 1. What it does

### Roles

| Role | What they do |
|---|---|
| **Student** | Registers, gets verified, browses the Directory, forms or joins a team, chats with teammates, sees results |
| **Coordinator** | Verifies students from **their own institution** (the password is emailed to the student) |
| **Jury** | Scores finalized teams per round (5 criteria × 0–10, plus feedback) |
| **Admin** | Everything else: verification, registry, teams (force add/remove, finalize, **disqualify/reinstate**, disband), rules, rounds, taxonomy, broadcasts, audit log |

### Flow

1. **Registration** (`/register`). Public; can be switched off in Admin → Rules.
   Per-field validation with clear messages. Protected by rate limiting and a
   honeypot field.
2. **Verification.**
   - A coordinator (own institution) or an admin approves the student.
   - Approval issues a **6-digit password** and emails it once email is
     configured (Amazon SES).
   - Admins also see the password once on screen, as a backup.
3. **Team formation** (`/teams`, "My Team"). Students create a team or join one,
   through invites and join requests.
   - **Leaving, dismissing or dissolving** needs approval from both sides; the
     person who must act sees an **"Action needed"** alert.
   - A **rules engine** (team size, female members, domain experts) moves a
     team between `FORMING` and `QUALIFIED`. The leader then **finalizes** it.
   - Admins can freeze all team changes (**team lockdown**) or close team
     formation separately from registration.
4. **Team chat.** A private chat on My Team. Only **current members** can read
   or post; leaving cuts access immediately.
5. **Directory** (`/directory`). Every verified student, grouped by college or
   domain, without contact details. Visible to all logged-in users.
6. **Judging** (`/jury`). An admin unlocks a round; jurors score any finalized
   team. The first juror to score a (team, round) owns that slot.
7. **Leaderboard and awards** (`/leaderboard`, `/awards`).
   - Live updates.
   - Only finalized, non-disqualified teams are ranked.
   - Admins control visibility ("Leaderboard visible") and whether numbers are
     shown ("Show marks").

### Security highlights

- **Login:** JWT, with the account's status re-checked on every request.
  **Revoking a student** logs them out instantly and removes them from their
  team.
- **Rate limiting:** login (per account and per IP), registration and team chat.
- **Least-privilege data:** Explore and Directory never expose
  email/phone/Discord; team emails, invites, requests and scores are visible
  only to the team (and admins/jury as appropriate).
- **Secrets:** in AWS SSM Parameter Store. AWS access uses IAM roles; there are
  no static keys anywhere.

---

## 2. Architecture

```
            Browser
               │
   ┌───────────┴────────────┐
   │                        │  REST + Socket.IO (HTTPS)
Cloudflare Workers          ▼
(static React SPA)   EC2 · Mumbai (ap-south-1)
                     ┌──────────────────────────┐
                     │ Caddy  ── auto HTTPS     │
                     │   └─► backend (Node)     │──► Supabase Postgres (Mumbai)
                     │       Express+Socket.IO  │──► Amazon SES (email)
                     └──────────────────────────┘──► CloudWatch Logs
                         ▲
GitHub Actions (OIDC) ───┘  build image → ECR → deploy over SSM
```

- **Frontend:** Cloudflare Worker `vortex-app`, built automatically from
  `main` (root `frontend/`). The API URL is baked in at build time via
  `VITE_API_URL`.
- **Backend:** Docker Compose on EC2 (backend + Caddy), deployed by
  `.github/workflows/deploy-backend.yml` on every push to `main` that touches
  `backend/` or `deploy/`.
- **Database:** Supabase Postgres.
  - The app connects through the transaction pooler (`DATABASE_URL`,
    port 6543).
  - Migrations run through the session pooler (`DIRECT_URL`, port 5432).
- **Schema changes:** **Prisma migrations only** (`backend/prisma/migrations`).
  Never `prisma db push`.

Details: [DEPLOY.md](DEPLOY.md) (infrastructure and releases) and
[deploy/README.md](deploy/README.md) (operating the server).

---

## 3. Environments

| | Frontend | API | Database |
|---|---|---|---|
| **Local** | <http://localhost> (Docker) or <http://localhost:5173> (Vite) | <http://localhost:3001> | Postgres container |
| **Staging** | <https://vortex-app.bhuvism003.workers.dev> | <https://api.3-6-239-100.sslip.io> | Supabase (free, Mumbai) |
| **Production** | *not created yet* | *on the event domain* | Supabase Pro (planned) |

The staging URLs are **temporary** until the event domain is bought; see
[DEPLOY.md → Switching to the real domain](DEPLOY.md#7-switching-to-the-real-domain).

Login details for each environment: [CREDENTIALS.md](CREDENTIALS.md).

---

## 4. Run it locally

You only need **Docker Desktop** and **Git**.

```bash
git clone https://github.com/Bhuvilol/VORTEX.git vortex
cd vortex

# 1. Build and start Postgres + backend + frontend
docker compose -p vortex up -d --build

# 2. Create the tables (versioned migrations)
docker compose -p vortex exec backend npx prisma migrate deploy

# 3. Seed rules, rounds, taxonomy, admin, jury, coordinators, sample registry
docker compose -p vortex exec backend npm run db:seed
```

Open <http://localhost>. Local accounts are listed in
[CREDENTIALS.md](CREDENTIALS.md#local-development).

| Service | URL | Notes |
|---|---|---|
| Frontend (nginx) | <http://localhost> | proxies `/api` and `/socket.io` to the backend |
| Backend | <http://localhost:3001> | `GET /api/health` → `{"status":"ok"}` |
| Postgres | `localhost:5432` | `vortex_user` / `vortex_password` / `vortex_db` |

Email isn't configured locally (`MAIL_FROM` unset). Emails are logged instead
of sent, and admins see issued passwords on screen.

### Hot-reload development (without Docker for the apps)

```bash
docker compose -p vortex up -d db          # keep only Postgres in Docker

cd backend
cp .env.example .env                        # defaults point at the local DB
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                                 # http://localhost:3001

cd ../frontend
npm install
npm run dev                                 # http://localhost:5173 (proxies /api)
```

> **Install note:** newer npm versions skip install scripts by default. If
> `bcrypt` fails to load, run `npm rebuild bcrypt` once in `backend/`.

---

## 5. Everyday development

### Branching and deploys
- Work happens on **`main`** (single-branch workflow for now).
- **Every push to `main`:**
  - redeploys the **frontend** (Cloudflare, about 1 minute);
  - redeploys the **staging backend** if `backend/` or `deploy/` changed
    (GitHub Actions, about 3 minutes, including migrations and a health check).
- After a deploy, **hard-refresh** open tabs (Cmd/Ctrl + Shift + R). Open tabs
  keep running the old bundle.

### Changing the database schema
1. Edit `backend/prisma/schema.prisma`.
2. Generate a migration. On the shared staging database, `migrate dev` can't
   create a shadow DB, so generate the SQL against the current schema:
   ```bash
   cd backend
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
     > prisma/migrations/<YYYYMMDD>_<change>/migration.sql
   ```
   With a local Postgres, `npx prisma migrate dev --name <change>` also works.
3. Review the SQL. Keep it backward-compatible: add first, remove in a later
   release.
4. Commit it with the schema change. The deploy pipeline runs
   `prisma migrate deploy`.

### Useful commands
```bash
make migrate          # apply migrations in the local Docker stack
make migrate-status   # show applied / pending migrations
make seed-full        # (re)run the idempotent seed
make db-shell         # psql into the local DB
docker compose -p vortex logs -f backend
```

### Re-seeding
The seed is **idempotent**: it upserts and never overwrites existing passwords
or admin-tuned rules. **However:**
- it deletes taxonomy rows that aren't in its list (unless a team uses them);
- it prints the default staff passwords.

Don't re-run it on production after organizers have edited the taxonomy (see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) A5).

---

## 6. Project layout

```
.
├── backend/                     Express + Prisma + Socket.IO API
│   ├── prisma/
│   │   ├── schema.prisma        data model (source of truth)
│   │   ├── migrations/          versioned SQL migrations
│   │   └── seed.js              idempotent seed
│   ├── src/
│   │   ├── config/              env validation, Prisma client
│   │   ├── middleware/          auth, rate limits, validation, errors, round guard
│   │   ├── routes/              Express routers (mounted in index.js)
│   │   ├── controllers/         thin request handlers
│   │   ├── services/            business logic (all DB writes live here)
│   │   ├── realtime/            Socket.IO server + emit helpers
│   │   ├── validators/          Zod schemas
│   │   └── utils/               logger, errors, crypto, SES mail, status cache
│   └── Dockerfile
├── frontend/                    React 19 + Vite + Tailwind SPA
│   ├── src/
│   │   ├── pages/               public · student · jury · coordinator · admin · shared
│   │   ├── components/          ui · layout · team (chat)
│   │   ├── contexts/            auth, toasts, broadcasts
│   │   ├── hooks/ lib/ utils/   data fetching, API + socket clients, helpers
│   │   └── App.jsx              routes
│   ├── wrangler.jsonc           Cloudflare Worker (static assets, SPA fallback)
│   ├── nginx.conf, Dockerfile   local Docker image
│   └── README.md
├── deploy/                      server stack: docker-compose.yml, Caddyfile, .env.example
├── .github/workflows/           deploy-backend.yml (staging deploy via OIDC + SSM)
├── docker-compose.yml           local stack (Postgres + backend + frontend)
├── Makefile                     local shortcuts
└── *.md                         documentation (see below)
```

---

## 7. Documentation index

| File | What's in it |
|---|---|
| [DEPLOY.md](DEPLOY.md) | Infrastructure, releases, secrets, switching to the real domain, production checklist |
| [deploy/README.md](deploy/README.md) | Operating the EC2 server: logs, restarts, migrations |
| [CREDENTIALS.md](CREDENTIALS.md) | Accounts per environment and where secrets live |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Open issues by launch phase, plus a fixed log |
| [GITHUB_ISSUES.md](GITHUB_ISSUES.md) | Deep-audit findings, formatted as GitHub issues |
| [frontend/README.md](frontend/README.md) | Frontend specifics (routes, env, build) |

---

## 8. License

GNU **AGPL-3.0**. See [LICENSE](LICENSE).
