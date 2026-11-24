# Vortex — Accounts & Credentials

Which accounts exist in each environment, and **where their passwords
live**. Real staging and production passwords are **never written in this
repo**. They're kept in AWS SSM Parameter Store; see below for how to read
them.

---

## Local development

Defaults from `docker-compose.yml` / `backend/.env.example`. They apply after
`npm run db:seed` on your machine. Change them before seeding if you like; the
seed never overwrites an existing password.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vortex.com` | `admin123` |
| Jury (3) | `jury.alpha@vortex.com`, `jury.bravo@vortex.com`, `jury.charlie@vortex.com` | `jury123` |
| Coordinators (10) | see [the list below](#coordinator-accounts) | `coord123` |

Local Postgres: `vortex_user` / `vortex_password` / database `vortex_db` on
`localhost:5432`.

---

## Staging

<https://vortex-app.bhuvism003.workers.dev>

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vortex.test` | SSM `/vortex/staging/ADMIN_SEED_PASSWORD` |
| Jury (3) | `jury.alpha@vortex.com`, `jury.bravo@vortex.com`, `jury.charlie@vortex.com` | SSM `/vortex/staging/JURY_SEED_PASSWORD` (shared) |
| Coordinators (10) | see [the list below](#coordinator-accounts) | SSM `/vortex/staging/COORDINATOR_SEED_PASSWORD` (shared) |

**How to read a staging password:**
- **Console:** AWS Console → switch to the **vortex** project account
  (`820539072886`), region **Mumbai** → **Systems Manager → Parameter Store**
  → open the parameter → **Show decrypted value**.
- **CLI:**
  ```bash
  export AWS_PROFILE=vortex
  aws sts get-caller-identity --region ap-southeast-2 >/dev/null   # refresh login
  aws ssm get-parameter --region ap-south-1 --with-decryption \
    --name /vortex/staging/ADMIN_SEED_PASSWORD --query Parameter.Value --output text
  ```

**Other staging secrets** in the same place: database URLs, JWT secret
(`/vortex/staging/*`). The Supabase connection strings are also in each
developer's local `backend/.env`, which git ignores.

> Staging passwords are deliberately simple for testing. The staging site is
> public, so **don't reuse them anywhere else**, and never use them for
> production.

---

## Production

Not created yet. When it is:
- **All secrets** go under `/vortex/production/*`, with **new, strong
  values**: a fresh JWT secret, plus individual staff passwords. Nothing is
  copied from staging.
- **Staff accounts** should have **real email addresses and individual
  passwords**. The seed currently creates shared-password placeholder
  accounts, and there's no admin screen for staff accounts yet
  ([KNOWN_ISSUES](KNOWN_ISSUES.md) A4).
- **Only people who run the event** should have access to the vortex AWS
  account.

---

## Students

Students are **never seeded**:
1. They register at `/register`.
2. A **coordinator** (own institution) or the **admin** approves them.
3. Approval issues a **6-digit password**.
   - **Coordinator approval:** the password is emailed to the student.
     Coordinators never see it.
   - **Admin approval / reissue / restore:** the password is emailed **and**
     shown once to the admin as a backup.
   - **Until email is configured** (`MAIL_FROM` unset), nothing is sent, and
     the admin's on-screen copy is the only way to hand it over.
4. **Lost password:** an admin uses **Verification → Verified → Reveal**, which
   issues a new password, emails it and shows it.

---

## Coordinator accounts

One per institution. A coordinator can only review students from their own
institution.

| Institution | Email |
|---|---|
| ITER \| SOA | `coordinator.iter@vortex.com` |
| SPS \| SOA | `coordinator.sps@vortex.com` |
| SNC \| SOA | `coordinator.snc@vortex.com` |
| IMS & SUM \| SOA | `coordinator.ims@vortex.com` |
| IDS \| SOA | `coordinator.ids@vortex.com` |
| SNIL \| SOA | `coordinator.snil@vortex.com` |
| IAS \| SOA | `coordinator.ias@vortex.com` |
| IVS & AH \| SOA | `coordinator.ivs@vortex.com` |
| IBCS \| SOA | `coordinator.ibcs@vortex.com` |
| SHM \| SOA | `coordinator.shm@vortex.com` |

These addresses are login IDs only; nothing is emailed to them.

---

## Sample registry rows (seeded)

Registering with one of these registration numbers **and** its email shows a
green **"Matched"** badge in the admin verification queue:

| Registration No | Name | Email | Institution |
|---|---|---|---|
| `2026-VRTX-100` | Alice Vance | `alice.vance@vortex.com` | ITER \| SOA |
| `2026-VRTX-101` | Bob Smith | `bob.smith@vortex.com` | SPS \| SOA |
| `2026-VRTX-102` | Carla Mendes | `carla.mendes@vortex.com` | SNC \| SOA |
| `2026-VRTX-103` | Devraj Patil | `devraj.patil@vortex.com` | IMS & SUM \| SOA |
| `2026-VRTX-104` | Esha Nair | `esha.nair@vortex.com` | IDS \| SOA |
| `2026-VRTX-105` | Farhan Iqbal | `farhan.iqbal@vortex.com` | SNIL \| SOA |
| `2026-VRTX-106` | Gita Roy | `gita.roy@vortex.com` | IAS \| SOA |
| `2026-VRTX-107` | Hari Menon | `hari.menon@vortex.com` | IVS & AH \| SOA |

The real college list is uploaded in **Admin → Registry**.

---

## Changing passwords

| Account | How |
|---|---|
| **Student** | Admin → Verification → **Reveal** (issues a new one) |
| **Staff (local)** | Change the seed env vars and re-seed. This only affects **new** accounts, since the seed never overwrites an existing password; delete the user row first if needed |
| **Staff (staging)** | Update the SSM parameter. For an **existing** account, the password hash must be reset in the database (no admin screen yet, A4) |
| **JWT secret** | Update `ACCESS_TOKEN_SECRET` in SSM and redeploy. **Everyone is logged out** |
