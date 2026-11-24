# Production-level issues — ready to raise on GitHub

Findings from the deep audit of 21 Nov 2026: flows, data integrity, missing
screens, sessions, navigation and operations. Each block is one GitHub issue:
copy the **title** and **labels**, and paste the body.

These are *in addition to* the open items in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Already verified OK (no issue needed):**
- all 113 frontend API calls match a backend route;
- all 58 in-app links and redirects point to real pages;
- deep links work on the deployed site;
- every protected page has a matching server-side role check.

**Label scheme:**
- **priority:** `P0-launch`, `P1-team-formation`, `P2-judging`, `P3-hardening`
- **area:** `data-integrity`, `admin`, `student`, `jury`, `accounts`, `ux`, `ops`

---

## Data integrity & race conditions

### 1. Simultaneous scoring silently overwrites another juror's score
**Labels:** `P2-judging`, `data-integrity`, `jury`

- **Where:** `backend/src/services/evaluation.service.js` (check at ~L87, upsert at ~L95)
- **Problem:** The service checks whether a score exists, then upserts. If two
  jurors submit the same team and round at the same moment, both pass the
  check. The second upsert then *updates* the first juror's row and takes
  ownership (`juryId`).
- **Fix:** Create with a unique-constraint catch (P2002 → 409 "already scored
  by X"). Update only `WHERE teamId, round AND juryId = me`.
- **Acceptance:** In a concurrency test (two parallel submits), exactly one
  succeeds and the other gets 409.

### 2. Re-ranking the whole leaderboard inside every score transaction
**Labels:** `P2-judging`, `data-integrity`, `ops`

- **Where:** `leaderboard.service.js` → `applyScore` → `reRankAll`
- **Problem:** Each submission runs an UPDATE across *all* leaderboard rows
  inside its transaction. Simultaneous submissions fight over the same rows,
  which can cause lock waits or deadlocks, and the juror sees a 500 error.
- **Fix:** Re-rank after commit, or debounce it. Alternatively compute rank at
  read time (`DENSE_RANK` in the list query) and drop the stored rank.
- **Acceptance:** 20 parallel submissions complete without errors.

### 3. A team disbanded mid-judging loses its scores permanently
**Labels:** `P2-judging`, `data-integrity`, `admin`

- **Where:** `Team` → `Evaluation` / `LeaderboardEntry` (`onDelete: Cascade`)
- **Problem:** Admin **Disband** deletes all evaluations, and the leaderboard
  entry goes with them. **Disqualify** (now available) keeps scores, but
  Disband gives no warning that scores will be lost.
- **Fix:** Block Disband for teams with scores (point admins to Disqualify),
  or require an explicit "delete scores too" confirmation.

### 4. Registration numbers are case-sensitive
**Labels:** `P0-launch`, `data-integrity`, `accounts`

- **Where:** `User.registrationNo @unique`; `user.service.createPendingStudent`
- **Problem:** `2024ps01` and `2024PS01` register as two different students.
- **Fix:** Normalize case (uppercase and trim) on registration, import and
  lookup. Backfill existing rows.

### 5. Admin and coordinator approving at the same moment issue two passwords
**Labels:** `P3-hardening`, `data-integrity`, `accounts`

- **Where:** `user.service.approveStudent` (read status, then update)
- **Problem:** Both pass the PENDING check. Two passwords are generated and
  emailed, and only the last one works.
- **Fix:** Conditional update (`WHERE verificationStatus = 'PENDING'`); the
  loser gets 409.

### 6. Rejected students can never re-apply
**Labels:** `P3-hardening`, `accounts`, `admin`

- **Problem:** After rejection, the email and registration number stay taken,
  so a corrected re-registration fails with "already exists". There's no admin
  "reset to pending".
- **Fix:** Add an admin "Reopen" action (REJECTED → PENDING), or let
  re-registration overwrite a REJECTED record.

---

## Missing screens (the backend supports it, the UI doesn't)

### 7. Students can never see their own scores or jury feedback
**Labels:** `P2-judging`, `student`

- **Where:** `GET /api/teams/:id/scores` exists and is restricted correctly
  (own team, after "Show marks"); no page calls it.
- **Fix:** A "Results" card on My Team that shows per-round scores and
  feedback once marks are released.

### 8. Admins can't preview the leaderboard or awards while they're hidden
**Labels:** `P2-judging`, `admin`

- **Where:** `leaderboard.controller.js` and `awards.controller.js` return 403
  to everyone, admins included, when the leaderboard is hidden.
- **Fix:** Let admins see it (with a "hidden from public" banner), or add an
  admin preview page.

### 9. No "Recompute leaderboard" button
**Labels:** `P3-hardening`, `admin`

- **Where:** `POST /api/leaderboard/recompute` exists; there's no UI.
- **Fix:** A button on Admin → Rounds or Rules.

### 10. Admin → Teams → Manage doesn't list the team's members
**Labels:** `P1-team-formation`, `admin`

- **Problem:** Only counts are shown. To force-remove someone, the admin must
  already know their registration number.
- **Fix:** Show the roster (name, role, gender / expert badges) with
  per-member Remove / Make leader actions.

### 11. Verification screens lack a full profile view and bulk approve
**Labels:** `P0-launch`, `admin`

- **Where:** `AdminVerificationPage.jsx`, `CoordinatorVerificationPage.jsx`
- **Problem:** Reviewers see only table columns: no bio, skills, links or
  preferred domains. With 1,000+ registrations, there's no multi-select bulk
  approve.
- **Fix:** A row → profile drawer; checkboxes with "Approve selected"
  (respecting coordinator institution scope).

### 12. The jury sees only the team name and problem statement
**Labels:** `P2-judging`, `jury`

- **Problem:** No members and no project, repo, demo or slides links. This
  depends on the deferred "project submission" feature.
- **Fix:** Add project submission fields on the team and show them in the
  score modal.

### 13. No exports for organizers
**Labels:** `P3-hardening`, `admin`

- **Problem:** Only the audit log exports. Organizers need students (by
  status / institution), teams with members, and final scores as Excel.

### 14. Institutions and domains can't be renamed
**Labels:** `P3-hardening`, `admin`

- **Where:** `PUT /api/admin/taxonomy/{institutions,domains}/:id` exist; the UI
  only offers add and delete.

---

## Accounts & sessions

### 15. Students can't change their password, and there's no "forgot password"
**Labels:** `P1-team-formation`, `accounts`

- **Problem:** Login is a 6-digit code chosen by the system. Students can't
  change it. If it's lost, an admin must reissue it.
- **Fix:** "Change password" in Profile (current + new, minimum length). An
  optional "Forgot password" that emails a reset link once SES is live.

### 16. Approval emails contain no link to the website
**Labels:** `P0-launch`, `accounts`

- **Where:** `backend/src/utils/mail.js`
- **Problem:** Credentials arrive with no URL telling students where to log in.
- **Fix:** Add an `APP_URL` env var and a "Log in to Vortex" button or link
  in every credential email.

### 17. Sessions hard-expire after 8 hours with no refresh
**Labels:** `P2-judging`, `accounts`, `ux`

- **Problem:** Students and jurors get logged out mid-event. A socket stays
  connected past token expiry, but the next API call returns 401.
- **Fix:** Refresh tokens (short access + rotating refresh), or a longer
  expiry during event days plus a "session expiring" prompt.

---

## Navigation & error handling

### 18. No 404 page; mistyped admin URLs leave the admin panel
**Labels:** `P3-hardening`, `ux`

- **Where:** `App.jsx` (`path="*"` → `Navigate to="/"`)
- **Fix:** A proper 404 page. Unknown `/admin/*` should stay inside the admin
  panel with a "page not found" message.

### 19. The Directory link in the admin and coordinator sidebars leaves their panel
**Labels:** `P3-hardening`, `ux`

- **Problem:** `/directory` renders in the public layout, so there's no
  sidebar and no direct way back.
- **Fix:** Render the Directory inside the active panel's layout, or add a
  "Back to admin" link.

### 20. Load failures show misleading screens
**Labels:** `P1-team-formation`, `ux`

- **Where:** `TeamFormationPage.jsx`, plus many pages using `useApi`
- **Problem:** If `/api/teams/mine` fails (network or 5xx), My Team shows
  **"Create a team"** to a student who's already in one. Many pages ignore
  `error` entirely.
- **Fix:** Show an error state with a Retry button wherever the main data
  fails to load.

### 21. Open tabs keep running old code after a deploy
**Labels:** `P1-team-formation`, `ux`, `ops`

- **Problem:** A SPA tab never reloads its bundle, which caused repeated
  "it's not working" reports during testing.
- **Fix:** Poll a `version.json` (or compare the build hash) and show a
  "New version available — Refresh" banner.

---

## Operations & deploys

### 22. `/api/health` doesn't check the database
**Labels:** `P0-launch`, `ops`

- **Where:** `backend/src/index.js:62`
- **Problem:** It returns `{status:"ok"}` even when the database is
  unreachable, so uptime monitoring and the deploy smoke test give false
  positives.
- **Fix:** Add `SELECT 1` with a short timeout (keep a separate, cheap
  liveness endpoint if needed).

### 23. Every deploy restarts the only backend
**Labels:** `P0-launch`, `ops`

- **Problem:** `docker compose up -d` recreates the container: a few seconds
  of 502s, and every Socket.IO connection drops. Each push to `main` deploys.
- **Fix:** A deploy freeze during live event windows, plus manual approval
  for production deploys. Optionally run a second container and switch
  traffic over in Caddy for zero-downtime deploys.

### 24. Frontend and backend deploy independently
**Labels:** `P3-hardening`, `ops`

- **Problem:** A push triggers Cloudflare (about 40 s) and the backend
  workflow (about 3 min) separately, so a new UI can call an old API for a
  few minutes.
- **Fix:** Keep API changes backward-compatible (add before you remove), or
  deploy the frontend after the backend from the same workflow.

### 25. Migrations run while the old app is still serving
**Labels:** `P3-hardening`, `ops`, `data-integrity`

- **Problem:** `prisma migrate deploy` runs before the new container starts,
  while the old one still serves traffic. A destructive change (drop or
  rename a column) would break the running version.
- **Fix:** Document an expand → migrate → contract rule. Check new
  migrations for `DROP`/`RENAME` in CI.

---

## Fixed in this round (no issue needed)

- **Leaderboard and awards** now include only FINALIZED teams. Ranks
  recompute when an admin disqualifies, reinstates, changes status or
  disbands a team.
- **The leaderboard is live:** updates are sent after each score and each
  admin team change, and logged-out visitors poll every 30 s.
- **Admin Disqualify / Reinstate** (scores are kept). Disqualified teams
  disappear from the leaderboard, awards and the jury board, and members see
  a "disqualified" banner.
- **Revoking a student removes them from their team.** A revoked leader hands
  over to the longest-standing member. A sole-member team is removed. The
  team keeps its standing.
- **Registration form:** a clear message per field, a red outline, a jump and
  focus to the first invalid field, `https://` added automatically to links,
  friendly duplicate-email / registration-number messages, and the same
  friendly messages from the server.
