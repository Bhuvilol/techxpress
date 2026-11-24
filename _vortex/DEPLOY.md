# Deploying Vortex

How Vortex is hosted, how releases happen, where secrets live, and what's
left before production. For day-to-day server operations (logs, restarts),
see [deploy/README.md](deploy/README.md).

---

## Contents

1. [Stack overview](#1-stack-overview)
2. [Accounts and access](#2-accounts-and-access)
3. [What's already set up (staging)](#3-whats-already-set-up-staging)
4. [Releasing](#4-releasing)
5. [Secrets and configuration](#5-secrets-and-configuration)
6. [Database and migrations](#6-database-and-migrations)
7. [Switching to the real domain](#7-switching-to-the-real-domain)
8. [Production checklist](#8-production-checklist)
9. [Costs](#9-costs)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Stack overview

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Cloudflare Workers** (Workers Paid), Worker `vortex-app` | Static Vite build with SPA fallback (`frontend/wrangler.jsonc`). Workers Builds deploys `main` from `frontend/` |
| Backend | **AWS EC2** in **Mumbai `ap-south-1`**, Docker Compose: backend + **Caddy** | Caddy terminates HTTPS (Let's Encrypt) and proxies REST + WebSockets |
| Images | **AWS ECR** `vortex-backend` | Scanned on push; keeps the last 20 |
| Database | **Supabase Postgres**, Mumbai | Transaction pooler for the app, session pooler for migrations |
| Email | **Amazon SES** (Mumbai) via the EC2 IAM role | Sending is enabled only when `MAIL_FROM` is set |
| Secrets | **AWS SSM Parameter Store** `/vortex/<env>/*` | Rendered into `/opt/vortex/.env` at deploy time |
| CI/CD | **GitHub Actions** + GitHub **OIDC** → IAM role | No long-lived AWS keys |
| Logs | **CloudWatch Logs** `/vortex/<env>/backend` and `/caddy` | Docker `awslogs` driver |
| DNS / edge | **Cloudflare** (once the domain is bought) | Domain stays registered at Hostinger; nameservers point at Cloudflare |

```
push to main ─┬─► Cloudflare Workers Builds ─► frontend (vortex-app.*.workers.dev)
              └─► GitHub Actions (backend/ or deploy/ changed)
                    1. OIDC → assume vortex-github-deploy
                    2. docker build → ECR (:<sha>, :staging)
                    3. SSM Run Command on EC2:
                         write compose + Caddyfile, render .env from SSM,
                         docker compose pull,
                         prisma migrate deploy, (optional seed),
                         docker compose up -d --wait
                    4. smoke test GET https://<api>/api/health
```

---

## 2. Accounts and access

### AWS
AWS uses the "new AWS experience" with **advanced features** turned on, so it
runs as an AWS Organization.

| Account | ID | Purpose |
|---|---|---|
| Management | `674033097575` | Billing and the **$100 Free Tier credit** (expires 20 Nov 2027). Holds the org policies |
| **vortex** project | `820539072886` | **All Vortex resources** |
| Building Things | `162952062410` | Unrelated older project |

- The org-wide policy `AdvancedModeRegionRestrictionSecurityControlPolicy`
  allows only listed regions. **`ap-south-1` was added** to its `RegionFloor`
  list. If you see "explicit deny in a service control policy", check that
  list.
- A **budget alert** is set in the management account, with credits excluded.

### CLI login
```bash
aws login --profile vortex --region ap-southeast-2   # pick the "vortex" project in the browser
aws configure set region ap-southeast-2 --profile vortex
```
Login and token refresh **only work through Sydney** (`ap-southeast-2`), the
project's home region. Keep the profile default as Sydney, and pass
`--region ap-south-1` explicitly on every real command:
```bash
export AWS_PROFILE=vortex
aws sts get-caller-identity --region ap-southeast-2     # refresh the session
aws ec2 describe-instances --region ap-south-1 ...
```
In zsh, use `export AWS_PROFILE=vortex`; don't put `--profile vortex` inside a
shell variable, because zsh won't split it into separate arguments.

### Other services

| Service | Account / notes |
|---|---|
| GitHub | `Bhuvilol/VORTEX` (private) |
| Cloudflare | Worker `vortex-app` |
| Supabase | Project `vortex-staging` (free, Mumbai) |
| Domain registrar | Hostinger (domain not bought yet) |

---

## 3. What's already set up (staging)

All in account `820539072886`, region `ap-south-1`:

| Resource | Value |
|---|---|
| EC2 | `i-046ce4ff2d0e7bfe0` `vortex-staging`, `t3.small`, Amazon Linux 2023, 30 GB gp3 (encrypted), IMDSv2 with **hop limit 2** (so containers can use the instance role), 2 GB swap, Docker + Compose |
| Elastic IP | `3.6.239.100` → API host **`api.3-6-239-100.sslip.io`** |
| Security group | `sg-0c05f654006c25193`: inbound 80/443 only, **no SSH** |
| IAM role | `vortex-staging-ec2-role`: SSM core, ECR read, CloudWatch agent, `ses:SendEmail` (Mumbai), S3 put to `vortex-db-backups-…/staging/*`, SSM read `/vortex/staging/*` |
| ECR | `820539072886.dkr.ecr.ap-south-1.amazonaws.com/vortex-backend` |
| S3 | `vortex-db-backups-820539072886`: private, encrypted, 30-day expiry *(backup cron not set up yet)* |
| SSM params | `/vortex/staging/*`, 13 values (see [§5](#5-secrets-and-configuration)) |
| GitHub OIDC | provider `token.actions.githubusercontent.com` + role `vortex-github-deploy`. It can push to that ECR repo and run SSM commands on instances tagged `project=vortex` |
| Frontend | <https://vortex-app.bhuvism003.workers.dev>, build variable `VITE_API_URL=https://api.3-6-239-100.sslip.io` |

**OIDC gotcha:** this repo uses GitHub's **immutable subject** format. The role
trusts exactly:
```
repo:Bhuvilol@147243844/VORTEX@1465589032:ref:refs/heads/main
```
A trust policy written as `repo:Bhuvilol/VORTEX:...` fails with "Not
authorized to perform sts:AssumeRoleWithWebIdentity".

---

## 4. Releasing

### Automatic
Every push to `main`:
- **Frontend:** Cloudflare rebuilds and redeploys in about 1 minute (any change).
- **Backend:** runs `.github/workflows/deploy-backend.yml` when `backend/**`,
  `deploy/**` or the workflow file changes. It takes about 3 minutes and ends
  with a health check.

Watch a backend deploy:
```bash
gh run list --repo Bhuvilol/VORTEX --workflow deploy-backend.yml --limit 3
gh run watch <run-id> --repo Bhuvilol/VORTEX
```

### Manual
GitHub → **Actions** → *Deploy backend (staging)* → **Run workflow**:
- Leave **seed** unticked to simply redeploy.
- Tick **seed** only for a **fresh database**. The seed creates the
  rules/rounds/taxonomy/staff accounts, but it also prunes taxonomy rows it
  doesn't know about.

### Things to know
- **Each backend deploy restarts the single container.** That means a few
  seconds of 502 errors, and every live socket reconnects. Avoid deploying
  during live event moments: registration opening, judging rounds, results.
- **Frontend and backend deploy separately.** Keep API changes
  backward-compatible.
- **Open browser tabs** keep the old frontend until they're hard-refreshed.

### Rolling back
- **Backend:** re-run the workflow from an older commit (`git revert`, then
  push), or on the server set `BACKEND_IMAGE` to a previous `:<sha>` and run
  `docker compose up -d`.
- **Frontend:** Cloudflare dashboard → `vortex-app` → Deployments → roll back
  to a previous version.
- **Migrations aren't rolled back automatically.** Write a new migration that
  reverses the change.

---

## 5. Secrets and configuration

### Backend
The backend config lives in SSM Parameter Store and is written to
`/opt/vortex/.env` on every deploy. Never commit real values.

| Parameter (`/vortex/staging/…`) | Type | Purpose |
|---|---|---|
| `VORTEX_ENV` | String | `staging`, used for the log-group name |
| `API_DOMAIN` | String | Host Caddy serves and certifies (`api.3-6-239-100.sslip.io`) |
| `CORS_ORIGIN` | String | Allowed frontend origin(s), comma-separated |
| `LOG_LEVEL`, `ACCESS_TOKEN_EXPIRY`, `BCRYPT_ROUNDS` | String | Runtime settings (`info`, `8h`, `12`) |
| `ADMIN_SEED_EMAIL` | String | Seeded admin login |
| `DATABASE_URL` | SecureString | Supabase **transaction pooler** (port 6543) |
| `DIRECT_URL` | SecureString | Supabase **session pooler** (port 5432), used for migrations |
| `ACCESS_TOKEN_SECRET` | SecureString | JWT signing secret (64 random chars) |
| `ADMIN_SEED_PASSWORD`, `JURY_SEED_PASSWORD`, `COORDINATOR_SEED_PASSWORD` | SecureString | Seed passwords |

**Optional:**

| Parameter | Purpose |
|---|---|
| `MAIL_FROM` | Turns on email, e.g. `Vortex <noreply@yourdomain>` |
| `MAIL_REPLY_TO` | Reply-to address on outgoing email |
| `SES_REGION` | SES region (default `ap-south-1`) |
| `TRUST_PROXY_HOPS` | Proxies in front of the app: default `1`; set `2` behind Cloudflare |

The full list of server variables is in [`deploy/.env.example`](deploy/.env.example).

Read or change a value:
```bash
export AWS_PROFILE=vortex; aws sts get-caller-identity --region ap-southeast-2 >/dev/null
aws ssm get-parameter --region ap-south-1 --name /vortex/staging/CORS_ORIGIN --query Parameter.Value --output text
aws ssm put-parameter --region ap-south-1 --name /vortex/staging/CORS_ORIGIN \
  --type String --value "https://vortex-app.bhuvism003.workers.dev" --overwrite
```
Changes apply on the **next deploy**: re-run the workflow, or push.

### Frontend
The frontend has one **build** variable in Cloudflare (Worker → Settings →
Build → Variables): `VITE_API_URL`. It's baked into the bundle, so changing
it requires a **Retry build** in Cloudflare's Deployments tab.

---

## 6. Database and migrations

- **Migrations only.** Never run `prisma db push` against staging or
  production; it can drop columns.
- The deploy runs `npx prisma migrate deploy` **before** starting the new
  container, so migrations must work with the *previous* app version too
  (expand → migrate → contract).
- **New migration:** see [README → Changing the database schema](README.md#changing-the-database-schema).
- **Check status from the server:**
  ```bash
  docker compose run --rm backend npx prisma migrate status
  ```
- **Backups:**
  - Supabase **Pro** keeps daily backups for 7 days. The free staging plan has
    none.
  - A nightly `pg_dump` to S3 is **planned but not set up**
    ([KNOWN_ISSUES](KNOWN_ISSUES.md) A7).

---

## 7. Switching to the real domain

Until the domain is bought, the frontend uses `*.workers.dev` and the API uses
`sslip.io`. When the domain arrives, follow these steps.

### Step 1: DNS
1. Add the domain to **Cloudflare** (free plan).
2. At **Hostinger**, replace the nameservers with Cloudflare's. Propagation
   takes up to 24 hours.

### Step 2: Frontend
1. Worker `vortex-app` → **Domains** → add `<domain>` (or `app.<domain>`).
2. Add a redirect from the `workers.dev` URL to the new domain.

### Step 3: API
1. In Cloudflare DNS, add `api.<domain>` as an **A record** → `3.6.239.100`.
   **Proxied** (orange cloud) is recommended.
2. With the proxy on, set SSL/TLS mode to **Full (strict)** and use a
   Cloudflare **Origin Certificate** in Caddy. Alternatively, keep the record
   DNS-only and let Caddy get Let's Encrypt certificates.
3. Update SSM, then redeploy:
   - `API_DOMAIN` = `api.<domain>`
   - `CORS_ORIGIN` = `https://<domain>`
   - `TRUST_PROXY_HOPS` = `2`, only if the API record is proxied.
4. Change the Cloudflare build variable `VITE_API_URL` to
   `https://api.<domain>`, then **Retry build**.
5. Restrict the security group to Cloudflare's IP ranges (only if proxied).

### Step 4: Email (SES)
1. SES (Mumbai) → **Identities** → create the domain identity. Cloudflare can
   add the DKIM and custom MAIL FROM records automatically.
2. **Request production access.** It takes about a day. In sandbox mode, SES
   only sends to verified addresses, at most 200 a day.
3. Set `MAIL_FROM` = `Vortex <noreply@<domain>>` in SSM and redeploy.
4. Optional: Cloudflare **Email Routing** for `support@<domain>` → team
   inboxes.

### Step 5: Smoke test
Register → approve → the email arrives → log in.

---

## 8. Production checklist

Production doesn't exist yet. The plan is the same shape as staging:

**Infrastructure:**
- [ ] Supabase **Pro** project in Mumbai, with its pooler and direct URLs.
- [ ] Prod EC2 (`t3.medium`), its own Elastic IP and security group, and a
      role `vortex-production-ec2-role` scoped to `/vortex/production/*`.
- [ ] SSM `/vortex/production/*`, with **new** secrets: JWT secret and strong
      staff passwords. Never reuse staging values.
- [ ] A production deploy job: manual approval, or deploy-on-tag, so pushes to
      `main` don't hit production directly.
- [ ] A Cloudflare production frontend on the real domain, plus prod
      `CORS_ORIGIN` / `VITE_API_URL`.

**Before launch:**
- [ ] SES domain verified and production access granted; `MAIL_FROM` set.
- [ ] **Disable the Testing bulk import** in production (KNOWN_ISSUES A3).
- [ ] Real institutions, domains and problem statements loaded. Staff
      accounts with **individual** emails and passwords (A4).
- [ ] Backups (nightly `pg_dump` → S3), CloudWatch alarms (CPU, status
      check with auto-recover, disk), an uptime monitor, and log retention
      (A7).
- [ ] `npm audit fix` and a retest (A6).
- [ ] Load test and a full dry run with real staff (C3).

---

## 9. Costs

Approximate, per month:

| Item | Paid by | Cost |
|---|---|---|
| Cloudflare Workers Paid | card | $5 |
| Supabase Pro (production) | card | $25 |
| EC2 staging `t3.small` + Elastic IP | AWS credits | ~$21 |
| EC2 prod `t3.medium` + Elastic IP (planned) | AWS credits | ~$39 |
| ECR, S3, CloudWatch, SES | AWS credits | a few dollars |

**Totals:**
- **Card:** about $30/month.
- **AWS credits:** about $60/month once production exists. The $100 credit
  covers roughly the event period, and the staging server can be stopped
  after the event.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Unable to create or refresh login credentials … signin:CreateOAuth2Token` | The `vortex` profile's region isn't Sydney. Run `aws configure set region ap-southeast-2 --profile vortex` |
| `… explicit deny in a service control policy` | The region isn't in the org's `RegionFloor` list (management account → Organizations → Policies) |
| GitHub Actions: `Not authorized to perform sts:AssumeRoleWithWebIdentity` | Trust-policy `sub` mismatch; use the immutable subject from [§3](#3-whats-already-set-up-staging) |
| Browser: CORS error | `CORS_ORIGIN` in SSM must match the frontend origin exactly (scheme, no trailing slash), then redeploy |
| UI behaves like an old version | The tab has a stale bundle; hard-refresh (Cmd/Ctrl + Shift + R) |
| Deploy smoke test fails right after an `API_DOMAIN` change | Caddy is still obtaining the new certificate; retry in a minute and check `docker compose logs caddy` |
| Emails not arriving | `MAIL_FROM` unset, or SES still in sandbox. Backend logs show `mail.skipped` or `mail.failed` |
| `P1001` / database connection errors | Check `DATABASE_URL` / `DIRECT_URL`: use the pooler hosts (Supabase's direct host is IPv6-only) |
