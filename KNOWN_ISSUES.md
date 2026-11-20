# Known Issues

Findings from a full read-through of the codebase (2026-11-20). Each item
says what is wrong, where, and what goes wrong for the user. Nothing here has
been fixed yet.

Severity: **High** = a core flow is broken or data is exposed ·
**Medium** = wrong behaviour in a secondary flow · **Low** = cosmetic or housekeeping.

---

## 1. Functional bugs

### 1.1 No team can qualify through the normal flow — High
- **Where:** `isDomainExpert` in [backend/prisma/schema.prisma](backend/prisma/schema.prisma);
  counted in [backend/src/services/membership.service.js:61](backend/src/services/membership.service.js#L61)
- **Problem:** The default rules require `minDomainExperts = 1`, but nothing a
  student or admin can do sets `User.isDomainExpert`. Registration doesn't ask
  for it, and no admin screen edits it. Only the Testing bulk import
  ([testingImport.service.js](backend/src/services/testingImport.service.js)) sets it.
- **Effect:** Every team made of normally registered students stays `FORMING`
  forever and can't be finalized, so juries never see it. The only ways out are
  setting `minDomainExperts` to 0 or using admin force-finalize.
- **Also:** A member only counts as an expert if their *primary* domain matches
  the team's domain, but team creation lets the leader pick any domain.

### 1.2 Admin "Force add / Force remove member" always fails — High
- **Where:** [frontend/src/pages/admin/AdminTeamsPage.jsx:162](frontend/src/pages/admin/AdminTeamsPage.jsx#L162)
  calls `GET /api/admin/verification/lookup`. That route is not registered in
  [backend/src/routes/adminVerification.js](backend/src/routes/adminVerification.js).
- **Problem:** The handler `lookupByRegistrationNo` exists in
  [adminVerification.controller.js:39](backend/src/controllers/adminVerification.controller.js#L39)
  and its validator `lookupByRegistrationNoQuerySchema` exists in
  [admin.schema.js](backend/src/validators/admin.schema.js), but the route was never added.
- **Effect:** Both buttons show "Route not found". Admins can't add or remove
  members by hand.

### 1.3 The leaderboard doesn't update in real time — Medium
- **Where:** `emitLeaderboardChanged` in [backend/src/realtime/emitter.js](backend/src/realtime/emitter.js)
  is never called. [LeaderboardPage.jsx](frontend/src/pages/public/LeaderboardPage.jsx)
  listens for `leaderboard:changed`.
- **Effect:** New scores only appear after a manual refresh or when the window
  regains focus. The README and the page text both promise real-time updates.
- **Also:** Only 2 of the 10 emit helpers are used (broadcasts and
  invite-received). Join requests, membership changes, member joined/left and
  team finalized all have helpers but are never emitted, so the student pages
  rely on 5-second polling instead.
- **Also:** The leaderboard socket only connects for logged-in users, because
  sockets require a JWT. Anonymous visitors can never get live updates.

### 1.4 Editing a problem statement opens an empty form — Medium
- **Where:** [frontend/src/pages/admin/AdminTaxonomyPage.jsx:157](frontend/src/pages/admin/AdminTaxonomyPage.jsx#L157)
- **Problem:** `useState(() => {...}, [target?.id])` is used where a `useEffect`
  was intended. `PSEditor` stays mounted, so its state is set only once (to
  empty, when nothing is being edited) and never resets.
- **Effect:** Clicking Edit shows blank fields. Saving sends an empty title and
  domain, which the server rejects.

### 1.5 The "Registration open" switch doesn't stop registration — Medium
- **Where:** checked only in [backend/src/services/team.service.js:115](backend/src/services/team.service.js#L115);
  `createPendingStudent` in [user.service.js:74](backend/src/services/user.service.js#L74) ignores it.
- **Effect:** Turning it off blocks *team creation* but still lets new students
  register. The admin label doesn't match what the switch does.

### 1.6 The Registry page can't be reached — Medium
- **Where:** [frontend/src/pages/admin/AdminRegistryPage.jsx](frontend/src/pages/admin/AdminRegistryPage.jsx)
  is not in [App.jsx](frontend/src/App.jsx) or the [AdminShell](frontend/src/components/layout/AdminShell.jsx) sidebar.
- **Effect:** Admins can't upload or manage the college registry, so the
  "Matched / No match" badges on the verification queue only work for the 8
  seeded rows. The README tells admins to use this tab.

### 1.7 Explore "match my domains" filter can't be turned off — Low
- **Where:** [backend/src/validators/team.schema.js:27](backend/src/validators/team.schema.js#L27)
- **Problem:** `z.coerce.boolean()` turns the string `"false"` into `true`.
- **Effect:** `?matchActorDomains=false` still filters. No UI sends `false`
  today, so this is latent.

### 1.8 Toasts have a transparent background — Low
- **Where:** [frontend/src/contexts/ToastContext.jsx:62](frontend/src/contexts/ToastContext.jsx#L62)
  uses `bg-bg-surface`, which isn't defined in [tailwind.config.js](frontend/tailwind.config.js)
  (only `bg-surface-1/2/3` exist).
- **Effect:** Toast text sits directly on top of the page content.

### 1.9 Smaller frontend issues — Low
- [StatTile.jsx](frontend/src/components/ui/StatTile.jsx) builds `group-hover:${iconTone}`
  at runtime. Tailwind can't detect dynamic class names, so the hover colour never applies.
- [LoginPage.jsx:12](frontend/src/pages/public/LoginPage.jsx#L12) destructures
  `bypassLogin`, which `AuthContext` doesn't provide. Harmless, but dead code.
- The AdminVerificationPage revoke dialog says the user "will be signed out".
  They aren't (see 2.1).

### 1.10 Dead code: jury assignments — Low
- **Where:** [juryAssignment.service.js](backend/src/services/juryAssignment.service.js),
  `/api/admin/jury-assignments`, `/api/jury/assignments`
- **Problem:** Scoring moved to "first jury owns the slot", so assignments no
  longer gate anything and no UI uses them. `assertAssigned` is never called.

---

## 2. Security and privacy

### 2.1 Revoking a user doesn't end their session — High
- **Where:** [backend/src/middleware/auth.js:42](backend/src/middleware/auth.js#L42) (`requireAuth`),
  and the socket handshake in [realtime/io.js](backend/src/realtime/io.js)
- **Problem:** The JWT is checked by signature only. The user's current
  `verificationStatus` is never re-read, and `/api/auth/me` returns the user
  even when they're revoked.
- **Effect:** A revoked student keeps full API and socket access until the
  token expires (`ACCESS_TOKEN_EXPIRY`, 2h by default; DEPLOY.md suggests 8h).

### 2.2 Every student's personal data is visible to any logged-in user — High
- **Where:** [backend/src/routes/teams.js:34](backend/src/routes/teams.js#L34) → `listAvailableMembers`
  in [team.service.js](backend/src/services/team.service.js) (`EXPLORE_MEMBER_FIELDS`)
- **Problem:** The route only requires a login, not a role, and the query has
  no verification-status filter.
- **Effect:** Any account — jury and coordinators included — can download every
  student's email, phone, Discord ID, registration number, bio and links.
  That includes `PENDING`, `REJECTED` and `REVOKED` students.

### 2.3 Team invites, join requests and scores have no ownership check — Medium
- **Where:** [backend/src/routes/teams.js](backend/src/routes/teams.js):
  `GET /:id/invites` (line 81), `GET /:id/join-requests` (line 92), `GET /:id/scores` (line 52)
- **Effect:** Any logged-in user can list another team's invitees and
  requesters (with emails). They can also read that team's full scores and
  jury feedback, even when the admin has hidden marks (`showMarks = false`) or
  the leaderboard.

### 2.4 Teams can go over the maximum size — Medium
- **Where:** `loadTeamForUpdate` in [membership.service.js:27](backend/src/services/membership.service.js#L27);
  capacity check at [line 132](backend/src/services/membership.service.js#L132)
- **Problem:** The code comment admits the row isn't actually locked
  (`SELECT … FOR UPDATE` isn't used). Under Postgres's default READ COMMITTED
  isolation, two accepts or approvals running at the same moment both see the
  old `memberCount`.
- **Effect:** Two members can join when only one slot is left.

### 2.5 User text is inserted into email HTML without escaping — Medium
- **Where:** [backend/src/utils/mail.js](backend/src/utils/mail.js) (`wrapHtml`, rejection `reason`)
- **Problem:** `fullName` (chosen by the student at registration) and the
  rejection reason are placed into the HTML as-is.
- **Effect:** A crafted name can inject HTML or links into official-looking
  emails sent from the organizer's domain.

### 2.6 Registration reveals registry data to anonymous visitors — Low
- **Where:** [registration.controller.js](backend/src/controllers/registration.controller.js)
- **Effect:** When a registration number matches, the public response includes
  the matched registry row (real name, email, institution). Someone guessing
  registration numbers can collect this data.

### 2.7 Missing hardening — Medium
- No rate limiting on `/api/auth/login`. Passwords are 6 digits (900,000
  combinations), so brute force is feasible without it.
- No rate limiting or CAPTCHA on public `/api/registration`.
- The JWT is stored in `localStorage`, where any XSS can read it.
- `express.json` accepts 10 MB bodies "for base64 photos", but photo upload
  was removed, so the limit is unnecessarily large.

---

## 3. Data and rule integrity

- **Domain rule isn't enforced.** The spec in [react_vite_context.md](react_vite_context.md)
  says all members must share a domain. Nothing checks this.
- **Disqualified teams stay ranked.** `reRankAll` in
  [leaderboard.service.js:47](backend/src/services/leaderboard.service.js#L47)
  ranks every leaderboard row regardless of team status. Admin `setStatus → DISQUALIFIED`
  leaves the team on the leaderboard and eligible for awards.
- **Rankings aren't refreshed after a disband.** Deleting a team cascades its
  leaderboard row but doesn't re-rank, which can leave gaps until the next score.
- **Lockdown has gaps.** Approving a `DISBAND` request isn't blocked by
  `teamLockdown`, so a team can still dissolve while teams are locked.
- **Admin `setStatus` skips cleanup.** Setting `FINALIZED` doesn't cancel
  pending invites and requests the way leader-finalize and force-finalize do.
- **`reissuePassword` doesn't check role.** It works on admin, jury or
  coordinator accounts too. This may be intended, but it isn't documented.

---

## 4. Operations

- **Schema push on every boot.** [backend/Dockerfile:40](backend/Dockerfile#L40)
  runs `prisma db push --accept-data-loss`. Any schema change that drops a
  column silently deletes production data. The Makefile `migrate` / `launch`
  targets do the same.
- **The Makefile is out of sync.** `.PHONY` lists `seed`, but the target is
  named `seed-full`. The Makefile also omits `-p vortex`, so its container
  names differ from the README's.
- **Secrets are committed.** [docker-compose.yml](docker-compose.yml) hard-codes
  the JWT secret and default passwords. That's fine for local dev only.
- **No tests** anywhere in the repo.
- **Not a git repository**, so there's no history or rollback.

---

## 5. Documentation drift

- [README.md](README.md) says admin approval emails the password. It doesn't —
  admins see the password on screen, and only coordinator approvals send email.
- The README lists a "Registry" admin tab that isn't reachable (see 1.6) and
  doesn't mention the Coordinator role, the Testing page or team lockdown.
- The README says the license is **MIT**, but [LICENSE](LICENSE) is **AGPL-3.0**.
- [frontend/README.md](frontend/README.md) is the unmodified Vite template.
- [react_vite_context.md](react_vite_context.md) describes a light "Tech Xpress /
  Vande Bharat" design. The shipped UI is a black/cyan "Vortex" theme.
- [DEPLOY.md](DEPLOY.md) step 4 says to replace the mail stub. Resend is
  already integrated in [mail.js](backend/src/utils/mail.js).
- The root [.gitignore](.gitignore) ignores `*.md` except README, DEPLOY and
  CREDENTIALS. Add `!KNOWN_ISSUES.md` if this file should be committed once
  the repo is under git.
