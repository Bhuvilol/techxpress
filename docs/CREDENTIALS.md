# Credentials

Where each account and secret lives. **No values are written in this repository.**

## Production

### Accounts

| Who | How they get in | Where the password is |
|---|---|---|
| Admin (seeded) | Email `ADMIN_SEED_EMAIL` (in `infra/gcp/config.env` and the `vortex-seed` job) | Secret Manager `ADMIN_SEED_PASSWORD`. Changing the secret later does **not** change an existing admin's password. |
| Jury, coordinators, extra admins | Created by the seed from the staff list (Secret Manager `STAFF_SEED_JSON`) | A random 6-digit code per person, shown to admins on **Portal → Admin → Staff**. Admins hand it over personally. Never emailed, never printed. |
| Students | Self-register, then a coordinator or admin verifies them | A 6-digit code emailed on approval (and shown once on screen to the approver). Lost? An admin uses **Reissue** on Admin → Verification. |

### Secrets (GCP Secret Manager, project `<PROJECT_ID>`, region asia-south1)

| Secret | Used by | Created by |
|---|---|---|
| `DATABASE_URL` | API, migrate/seed jobs | `setup.sh core` (generates the `vortex_app` password) |
| `ACCESS_TOKEN_SECRET` | API (signs login tokens; rotating it logs everyone out) | `setup.sh core` (48 random bytes) |
| `CF_EMAIL_API_TOKEN` | API (sends email) | Organizers: Cloudflare token with only **Email Sending Write** |
| `ADMIN_SEED_PASSWORD` | seed job | Organizers |
| `STAFF_SEED_JSON` | seed job | Organizers (real staff list) |

Read one (needs Secret Manager access on the project):
```sh
gcloud secrets versions access latest --secret ADMIN_SEED_PASSWORD
```
Add a new value: see `add_secret` in [infra/gcp/README.md](../infra/gcp/README.md). Cloud Run reads `:latest` when a new revision starts; re-run `setup.sh core` or redeploy after changing one.

### Other access
| What | Where |
|---|---|
| GCP project | Google Cloud Console; IAM lists who has access |
| CI → GCP | Workload Identity Federation; **no key files**. GitHub repository variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `DEPLOYER_SA` (not secret) |
| Cloudflare (domain, Worker, email) | Cloudflare dashboard, organizers' account |
| GitHub repository | Organizers' GitHub accounts |

## Local development

Everything below exists only on your machine.

| What | Value |
|---|---|
| Postgres (`docker compose up -d db`) | `vortex_user` / `vortex_password`, database `vortex_db`, `localhost:5432` |
| Admin (`npm run db:seed:dev`) | `admin@example.test` / `admin12345` |
| Staff (`npm run db:seed:dev`) | `jury.alpha@example.test`, `coordinator.iter@example.test`, …: codes on Admin → Staff |
| Real staff list for local tests | `services/api/prisma/staff.local.json` (git-ignored) |
| API secrets | `services/api/.env` (git-ignored; copy from `.env.example`) |
