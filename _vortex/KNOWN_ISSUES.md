# Known Issues — status as of 21 Nov 2026

This list comes from a full re-audit of the code, staging infrastructure and
dependencies after the 20–21 Nov work. Open items are ordered by **when they
must be done**:
1. Before registration opens (**24 Nov**)
2. Before team formation
3. Before judging
4. Hardening / quality
5. Documentation

Each item has a severity:
- **High** — blocks a flow or exposes data
- **Medium** — wrong behaviour or operational risk
- **Low** — cosmetic or housekeeping

Fixed items are listed at the end for reference.

---

## A. Before registration opens (24 Nov)

### A1. No production environment yet — High
Only staging exists: EC2 `t3.small`, free Supabase, temporary URLs. Still needed:
- prod EC2 server
- Supabase Pro (Mumbai)
- prod secrets in SSM under `/vortex/production/*`
- a production deploy workflow or job, plus prod CORS / API domain
- a prod Cloudflare frontend or environment
- seeding the real data

### A2. Domain + email not live — High
Without a domain, SES can't verify a sender and stays in sandbox mode. Approval
emails can't reach students, so approvals must wait or be shared by hand.

Steps:
1. Buy the domain and move its DNS to Cloudflare.
2. Verify the domain in SES (DKIM / custom MAIL FROM).
3. Request SES production access.
4. Set `MAIL_FROM` in SSM.

### A3. Testing bulk import is always enabled — High
- **Where:** `routes/adminTesting.js`, `AdminTestingPage.jsx`
- **Problem:** Admin → Testing creates **VERIFIED** students with known
  passwords, skipping verification. Its results export also contains
  plaintext passwords.
- **Fix:** Disable it in production (an env flag such as `ENABLE_TESTING_IMPORT`,
  hiding the page) or remove it.

### A4. Staff accounts are hard-coded in the seed — High
- **Where:** `backend/prisma/seed.js`
- **Problem:** Jury and coordinator accounts are fixed `@vortex.com`
  addresses that all share one password. There's **no admin screen** to
  create, rename or disable staff accounts or reset their passwords: the
  verification page lists students only.
- **Effect:** Production can't run with shared passwords and placeholder
  emails for 10 coordinators and the jury.

### A5. Seed script is unsafe for production re-runs — Medium
- **Where:** `backend/prisma/seed.js`
- **Problems:**
  - It **prints** the jury and coordinator passwords to the deploy logs
    (lines 321, 354).
  - It **deletes** domains and problem statements that aren't in its
    hard-coded list, unless a team uses them. Re-running it on production
    after organizers have edited the taxonomy silently removes their work.

### A6. Vulnerable dependencies — High
`npm audit` (production dependencies):
- **Backend:** 2 critical, 15 high, 5 moderate.
  - **`proxy-addr` (critical):** IP spoofing via IPv4-mapped IPv6. It
    affects the client IP that rate limiting relies on.
  - **`body-parser`, `ws`, `engine.io` and `socket.io-parser` (high):**
    denial-of-service bugs.
  - `tar` (critical): only used at install time.
  - Prisma CLI transitive dependencies (hono, mysql2, effect…).
- **Frontend:** 5 high (react-router, socket.io-parser, ws).
- **Fix:** almost everything is fixable with `npm audit fix` (lockfile
  updates). Re-test after updating.
- **Exception:** `xlsx` 0.18.5 has **no npm fix** (prototype pollution,
  ReDoS). It's used for admin-only Excel import/export. Replace it with the
  SheetJS CDN build (0.20.x) or `exceljs`.

### A7. No backups, monitoring or alerts — Medium
Checked on 21 Nov:
- **Backups:** the S3 backup bucket is empty (no nightly `pg_dump` cron), and
  free Supabase has no backups.
- **Alarms:** no CloudWatch alarms (CPU, status check / auto-recover, disk).
- **Uptime:** no uptime monitor on `/api/health`.
- **Logs:** log groups `/vortex/staging/*` keep logs forever (no retention set).
- **Recovery:** no AMI snapshot or rebuild runbook.

---

## B. Before team formation opens

### B1. No team can qualify through the normal flow — High
- **Where:** `User.isDomainExpert`
- **Problem:** The default rules require 1 domain expert, but nothing a
  student or admin can do sets `isDomainExpert`. Registration doesn't ask
  for it and no admin screen edits it; only the Testing import sets it.
- **Effect:** Every team stays FORMING. Juries only see FINALIZED teams.
- **Decision needed:** a registration field, an admin toggle, or
  `minDomainExperts = 0`.

### B2. A team's problem statement can't be set or changed after creation — Medium
- **Problem:** The team-create form says the PS is "optional, can be set
  later by admins", but there's **no endpoint or UI** to set it later, for
  leaders or admins. The original spec also says teams can edit their PS
  within their domain.

### B3. Polling load at event scale — Medium
- **Where:** `TeamFormationPage.jsx`
- **Problem:** My Team polls **3 endpoints every 5 s** per open tab, plus a
  refetch on every window focus.
- **Effect:** With ~1,000 students on that page, that's up to ~600 requests
  per second on one `t3.small`.
- **Fix:** use the existing socket emit helpers (join requests, membership
  changes, member joined/left) and poll every 30–60 s as a fallback.

### B4. Team size can be exceeded under concurrency — Medium
- **Where:** `membership.service.js` → `loadTeamForUpdate`
- **Problem:** It doesn't lock the row (no `SELECT … FOR UPDATE`), so two
  simultaneous approvals or accepts into the last slot can both succeed.

### B5. Domain rule not enforced — Medium (decision)
- **Problem:** The original spec requires every member to share the team's
  domain. Nothing checks it.
- **Related:** a student may create a team in **any** domain. Experts only
  count when their primary domain matches the team's.

### B6. Invite search fires a request per keystroke — Low
- **Where:** `TeamFormationPage.jsx` → `InviteModal`
- **Problem:** The search has no debounce, so every keystroke queries the
  server.
- **Also:** Explore and Directory download every verified student in one
  response (fine at ~100; heavier at 1,000+).

---

## C. Before judging starts

*C1 (live leaderboard) and C2 (disqualified teams ranked) are fixed — see the Fixed section.*

### C3. Load test and dry run not done — Medium
- **Load test:** around 1,000 concurrent logins, team-page traffic and score
  submissions on staging.
- **Dry run:** a full rehearsal with the real jury and coordinators.

---

## D. Hardening / quality

| # | Issue | Severity |
|---|---|---|
| D1 | Approving a **DISBAND** request skips the team-lockdown check (`membershipChange.service.js`) | Low |
| D2 | Admin `setStatus → FINALIZED` doesn't cancel pending invites and requests, unlike leader and force finalize | Low |
| D3 | `reissue-password` works on any verified account (staff included) through the API; undocumented | Low |
| D4 | `express.json` limit is still 10 MB (`index.js:57`), but photo upload was removed; reduce to ~100 KB | Low |
| D5 | JWT stored in `localStorage` (readable by any XSS) | Low |
| D6 | Backend container runs as **root** (no `USER` in Dockerfile) | Low |
| D7 | Staging security group allows 80/443 from the whole internet; restrict to Cloudflare IPs once the domain is proxied. Then set `TRUST_PROXY_HOPS=2` | Medium (when domain arrives) |
| D8 | Open browser tabs keep running old code after a deploy; no "new version — refresh" banner | Medium |
| D9 | 24 frontend lint errors: unused imports, `Infinity` icon shadowing the global, setState-in-effect patterns, a global reassigned in `Confirm.jsx`. CI doesn't run lint or tests, and **there are no tests** | Low |
| D10 | GitHub Actions use Node-20-based action versions (deprecation warnings); bump to current majors | Low |
| D11 | Dead code: jury-assignment service and routes still mounted but unused (scoring is first-come) | Low |
| D12 | `matchActorDomains` uses `z.coerce.boolean()`, so the string `"false"` reads as true (unused by the UI today) | Low |
| D13 | `StatTile` builds a Tailwind class at runtime (`group-hover:${…}`), so the hover colour never applies | Low |
| D14 | `backend/pnpm-lock.yaml` is stale (still lists `resend`); npm is the real package manager | Low |
| D15 | A member with a pending dismissal can still click "Request to leave" (409) | Low |
| D16 | No self-service "forgot password"; students must ask an admin to reissue (emailed once SES is live) | Low |

---

## E. Documentation & housekeeping

- **`README.md`:** describes the old setup. It doesn't cover AWS, the
  Directory, team chat, coordinators or migrations-only workflow details,
  and says the license is MIT while `LICENSE` is **AGPL-3.0**.
- **`DEPLOY.md`:** still the Render / Neon / Resend guide. Rewrite it for
  Cloudflare Workers + EC2 + Supabase + SES + GitHub Actions (OIDC).
- **`CREDENTIALS.md`:** lists dev defaults that no longer match staging. Keep
  real staging and production passwords out of the repo.
- **`frontend/README.md`:** still the unmodified Vite template.
- **`react_vite_context.md`:** describes a design that isn't used.
- **The old public `Bhuvilol/TechExpress` repo:** still public, with older
  code and default credentials. Archive it or make it private.
- **Old deployments:** the old Cloudflare Worker `vortex` and any old Render
  or Neon services may still be running. Decommission them.

---

## Fixed (20–21 Nov)

Leaderboard & teams (latest round):
- Leaderboard and awards include only FINALIZED teams; ranks recompute on
  disqualify / reinstate / status change / disband (was C2).
- Live leaderboard: updates after each score and admin team change, and
  logged-out visitors poll every 30 s (was C1).
- Admin Disqualify / Reinstate (scores kept).
- Revoking a student removes them from their team, with leader handover.
- Registration form shows a clear per-field error and jumps to the first
  problem.


Registration & accounts:
- Registration switch now blocks sign-ups; team formation has its own switch.
- Revoked users lose API and socket access immediately (status check + cache
  invalidation + socket disconnect).
- Rate limiting on login (per account and per IP) and registration; honeypot
  field on the registration form.
- The public registration response no longer exposes registry matches.

Privacy:
- Explore shows only verified students, to students only, without
  email / phone / Discord / gender / resume / reg #.
- Team details hide emails from outsiders.
- Team invites / join requests are restricted to members and admins.
- Team scores are restricted (admin / jury; own team only after "Show marks";
  no juror identity).

Email:
- Sent through SES using the server's IAM role; user text escaped in email
  HTML.
- Admin approve / reissue / restore email the student and show the password
  once.

Admin & database:
- Admin lookup route restored (force add / remove).
- Registry page routed.
- Problem-statement editor loads its data.
- Toast background fixed.
- `prisma db push --accept-data-loss` replaced with versioned migrations.

UI:
- Login page error messages display.
- Open teams show "Request sent".
- Leader queues refresh after actions and appear only when something is
  pending.
- "Action needed" alert for leave and dismissal requests (dismissed members
  can now respond).
- Explore scroll panels; problem statements grouped by theme.

New features:
- Participant Directory.
- Private team chat (members only).

Infrastructure:
- AWS staging (EC2, ECR, SSM secrets, IAM least privilege).
- GitHub OIDC deploy pipeline.
- Cloudflare Workers frontend.
- Supabase staging.

---

Deeper production-level findings (flows, races, missing screens, ops) are
tracked separately in [GITHUB_ISSUES.md](GITHUB_ISSUES.md).
