# VORTEX

The hackathon platform behind TechXpress: student registration and verification, team formation, private team chat, multi-round jury scoring, and a live leaderboard with awards. It is served at `/vortex` on the TechXpress domain.

> **Stack:** React 19 · Vite · Tailwind · Express 4 · Prisma 7 · PostgreSQL 16 · Socket.IO
> **Hosting:** Cloudflare Workers (frontend) · Google Cloud Run + Cloud SQL, Mumbai (API and database) · Cloudflare Email Service · GitHub Actions

---

## 1. What it does

### Roles

| Role | What they do |
|---|---|
| **Student** | Registers, gets verified, browses the Directory, forms or joins a team, chats with teammates, sees results |
| **Coordinator** | Verifies students from **their own institution** (the password is emailed to the student) |
| **Jury** | Scores finalized teams per round (5 criteria × 0–10, plus feedback) |
| **Admin** | Everything else: verification, registry, staff logins, teams (force add/remove, finalize, **disqualify/reinstate**, disband), rules, rounds, taxonomy, broadcasts, audit log |

### Flow

1. **Registration** (`/vortex/register`). Public; switched on and off in Admin → Rules (a fresh database starts with it **off**, showing "registration opens soon"). Per-field validation with clear messages. Protected by rate limiting and a honeypot field.
2. **Verification.**
   - A coordinator (own institution) or an admin approves the student.
   - Approval issues a **6-digit password** and emails it with a login link.
   - Admins also see the password once on screen, as a backup.
3. **Team formation** (`/vortex/teams`, "My Team"). Students create a team or join one, through invites and join requests.
   - **Leaving, dismissing or dissolving** needs approval from both sides; the person who must act sees an **"Action needed"** alert.
   - A **rules engine** (team size, female members, domain experts) moves a team between `FORMING` and `QUALIFIED`. The leader then **finalizes** it.
   - Admins can freeze all team changes (**team lockdown**) or close team formation separately from registration.
4. **Team chat.** A private chat on My Team. Only **current members** can read or post; leaving cuts access immediately.
5. **Directory** (`/vortex/directory`). Every verified student, grouped by college or domain, without contact details. Visible to all logged-in users.
6. **Judging** (`/vortex/jury`). An admin unlocks a round; jurors score any finalized team. The first juror to score a (team, round) owns that slot.
7. **Leaderboard and awards** (`/vortex/leaderboard`, `/vortex/awards`).
   - Live updates.
   - Only finalized, non-disqualified teams are ranked.
   - Admins control visibility ("Leaderboard visible") and whether numbers are shown ("Show marks").

### Staff accounts

Jury, coordinators and extra admins are created by the seed from the real staff list. Each gets a 6-digit login code, shown to admins on **Admin → Staff** (with copy buttons) so they can hand it over. Staff passwords are never emailed or printed. See [CREDENTIALS.md](CREDENTIALS.md).

### Security highlights

- **Login:** JWT, with the account's status re-checked on every request. **Revoking a student** logs them out instantly and removes them from their team.
- **Rate limiting:** login (per account and per IP), registration and team chat.
- **Least-privilege data:** Explore and Directory never expose email/phone/Discord; team emails, invites, requests and scores are visible only to the team (and admins/jury as appropriate).
- **Request size:** JSON bodies are capped at 100 kb.
- **Secrets:** in GCP Secret Manager. CI deploys through Workload Identity Federation; there are no key files anywhere.

---

## 2. Architecture

```
Browser
  │
  ▼
https://<domain>                        Cloudflare Worker "techxpress"
  ├─ /               train experience   (apps/site)
  └─ /vortex/*       VORTEX portal      (apps/portal)
        │  REST + Socket.IO (HTTPS)
        ▼
https://vortex-api-….run.app            Cloud Run "vortex-api" (services/api)
        │  Cloud SQL connector (Unix socket)
        ▼
Cloud SQL PostgreSQL 16 "vortex-db"     backups + point-in-time recovery

Email:  API → Cloudflare Email Service REST API → recipients
```

- **One API instance** (min 1, max 1, session affinity). Socket.IO rooms, rate-limit counters and the user-status cache live in memory, so the API must not scale out without a shared store first (see [RUNBOOK.md](RUNBOOK.md)).
- **Schema changes:** **Prisma migrations only** (`services/api/prisma/migrations`). Never `prisma db push`.

Deployment: [DEPLOY.md](DEPLOY.md). Operations: [RUNBOOK.md](RUNBOOK.md).

---

## 3. Everyday development

Local setup is in the [root README](../README.md).

### Deploys
- **Frontend:** every push to `main` rebuilds and deploys the Worker (Cloudflare Workers Builds, about 1 minute).
- **API:** every push to `main` that touches `services/api/**` runs `deploy-api.yml`: build, migrate, deploy, health check (a few minutes).
- After a deploy, **hard-refresh** open tabs (Cmd/Ctrl + Shift + R); open tabs keep running the old bundle.

### Changing the database schema
1. Edit `services/api/prisma/schema.prisma`.
2. With the local Postgres running (`npm run dev:db`), create the migration:
   ```bash
   cd services/api
   npx prisma migrate dev --create-only --name <change>
   ```
3. Review the SQL. Keep it **backward-compatible**: add first, remove in a later release, so a rollback of the API never meets a schema it can't read.
4. Commit it with the schema change. The deploy workflow runs `prisma migrate deploy` before the new API revision starts.

### Seeding
`npm run db:seed` (production mode) or `npm run db:seed:dev` (local sample data). The seed is **idempotent**: it upserts, never overwrites existing passwords or admin-edited rules, and never prints a password. Deleting taxonomy rows that are no longer in `prisma/data/taxonomy.json` needs `--prune`.

---

## 4. Code layout (services/api and apps/portal)

```
services/api/
├── prisma/
│   ├── schema.prisma        data model (source of truth)
│   ├── migrations/          versioned SQL migrations
│   ├── data/                taxonomy, default rules, dev-only staff and registry samples
│   └── seed.js              idempotent seed
├── src/
│   ├── config/              env validation, Prisma client
│   ├── middleware/          auth, rate limits, validation, errors, round guard
│   ├── routes/              Express routers (mounted in index.js)
│   ├── controllers/         thin request handlers
│   ├── services/            business logic (all DB writes live here)
│   ├── realtime/            Socket.IO server + emit helpers
│   ├── validators/          Zod schemas
│   └── utils/               logger, errors, crypto, Cloudflare mail, status cache
└── Dockerfile               image for the service and the migrate/seed jobs

apps/portal/src/
├── pages/                   public · student · jury · coordinator · admin · shared
├── components/              ui · layout · team (chat)
├── contexts/                auth, toasts, broadcasts
├── hooks/ lib/ utils/       data fetching, API + socket clients, helpers
└── App.jsx                  routes (BrowserRouter basename /vortex)
```

---

## 5. Documentation index

| File | What's in it |
|---|---|
| [DEPLOY.md](DEPLOY.md) | Infrastructure, first-time setup, releases, environment variables, domain and email |
| [RUNBOOK.md](RUNBOOK.md) | Health checks, logs, rollback, incidents, launch-day steps |
| [CREDENTIALS.md](CREDENTIALS.md) | Accounts and where each secret lives (no values) |
