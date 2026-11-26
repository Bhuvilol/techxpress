# Runbook

What to check, what to do when something breaks, and the steps for the launch days. Commands assume `gcloud config set project <PROJECT_ID>` and region `asia-south1`.

## Health at a glance

| Check | Expect |
|---|---|
| `curl https://<api>/api/health` | `{"status":"ok","db":"ok",...}`; `503 {"db":"down"}` means the API is up but can't reach the database |
| `curl https://<api>/api/health/live` | `{"status":"ok"}` (process alive; never touches the database) |
| `https://<domain>/` and `https://<domain>/vortex/` | Train site / portal load; a hard refresh of `/vortex/teams` still shows the portal |
| Cloud Console → Cloud Run → `vortex-api` → Metrics | Request latency, 5xx count, concurrent requests, CPU |
| Cloud Console → SQL → `vortex-db` | CPU, connections, storage |
| Alert emails | Uptime, Cloud SQL CPU/disk > 80 %, API 5xx > 2 %, concurrency > 800 |

## Logs

```sh
# Recent API errors
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="vortex-api" AND severity>=ERROR' --limit 50 --freshness 1h

# Request lines for one path (each has method, path, status, durMs, ip, userId)
gcloud logging read 'resource.labels.service_name="vortex-api" AND jsonPayload.message="http" AND jsonPayload.path="/api/auth/login"' --limit 20

# Email failures
gcloud logging read 'resource.labels.service_name="vortex-api" AND jsonPayload.message="mail.failed"' --limit 20

# Last migration run
gcloud run jobs executions list --job vortex-migrate --limit 3
```
In the Console: Logging → Logs Explorer, filter `resource.labels.service_name="vortex-api"`.

**Client IPs:** the `ip` field on `http` lines must show users' real addresses, not Google's (`35.191.x`, `130.211.x`) or a single repeating value. If it doesn't, rate limiting is keyed on the proxy and every user shares one limit: adjust `TRUST_PROXY_HOPS`.

## Rollback

### API (seconds)
```sh
gcloud run revisions list --service vortex-api --limit 5          # find the previous good revision
gcloud run services update-traffic vortex-api --to-revisions <revision>=100
```
Traffic stays pinned to that revision until the next deploy or `--to-latest`. Migrations are backward-compatible, so the old revision works with the new schema.

### Frontend (seconds)
Cloudflare dashboard → Workers & Pages → `techxpress` → Deployments → pick the previous one → Rollback. Or `npx wrangler rollback`.

### Database (restore, ~10–20 minutes)
Point-in-time recovery creates a **new** instance; the old one is left as it was.
```sh
gcloud sql instances clone vortex-db vortex-db-restore --point-in-time "2026-11-27T10:15:00Z"
```
Then update the `DATABASE_URL` secret to point at `vortex-db-restore` (same user and password, new connection name), add `--add-cloudsql-instances <project>:asia-south1:vortex-db-restore` to the service and jobs, and redeploy. Do this only for data loss or corruption; an outage alone is not a reason to restore.

## Incidents

| Symptom | Likely cause | Do |
|---|---|---|
| `/api/health` 503, `db: down` | Cloud SQL restarting, maintenance, or out of connections | Cloud SQL page: state and connections. Pool is capped at 10 per API instance. Wait for maintenance; restart the instance only as a last resort. |
| Students say "Too many attempts" | Rate limits; a campus shares one NAT IP | Check `rate_limited` warnings and their `ip`. Per-IP limits are generous; per-account login limit is 5 wrong passwords / 15 min. If one IP is a whole campus, raise the per-IP limit in `services/api/src/middleware/rateLimit.js` and deploy. |
| Approval emails not arriving | Not configured, Cloudflare quota (429), or spam filtering | `mail.failed` logs show the code. Meanwhile admins and coordinators share the password shown on screen after approval, or an admin uses **Reissue**. |
| Live updates / chat stop for everyone | Instance restarted, or concurrency limit reached | Clients reconnect on their own. Check "concurrent requests" in metrics; see Capacity. |
| A deploy failed at "Run migrations" | Migration SQL error | Nothing was deployed; the old API keeps running. Read the job execution logs, fix the migration, push again. |
| A deploy failed at "Smoke test" | New revision unhealthy | Roll back the API (above) with the revision the log printed. |
| A user is stuck after being revoked or restored | Status cache (30 s) | Wait 30 seconds; status is re-checked on every request after that. |

## Capacity

- One instance, **concurrency 1,000**: each open Socket.IO connection holds one slot, plus in-flight HTTP requests. Alert at 800.
- Login bursts are CPU-bound (bcrypt, 12 rounds). On event days run with 2 vCPU:
  ```sh
  gcloud run services update vortex-api --cpu 2 --memory 2Gi
  ```
- If concurrency stays near the limit: the next step is a Redis adapter for Socket.IO and a shared rate-limit store (Memorystore + VPC egress), then 2–3 instances. That is a code change, not a setting; plan it before team formation if the load test shows it's needed.
- Known load: the team page polls 3 endpoints every 5 s per open tab. Fix before team formation.

## Launch days

### Rehearsal (26 Nov)
Run this checklist on the real domain: train flow, Timeline, and Register → `/vortex/`; deep-link refreshes; registration validation, ID card upload, honeypot and "opens soon"; coordinator and admin verification (ID card view, approve, reject, ask to re-register) with the emails arriving; revoke logs out instantly; student team flow and chat; jury scoring; leaderboard toggles; broadcasts; **real client IPs in logs**. Then the k6 load test (raise per-IP limits for the test; all traffic comes from one IP; restore afterwards).

### Wipe and re-seed (26 Nov evening) — confirm with the organizers first
This deletes **all** data in the production database. Only before real registrations exist.
```sh
IMAGE=$(gcloud run services describe vortex-api --format 'value(spec.template.spec.containers[0].image)')
gcloud run jobs create vortex-reset --image "$IMAGE" \
  --service-account vortex-api@<PROJECT_ID>.iam.gserviceaccount.com \
  --set-cloudsql-instances <PROJECT_ID>:asia-south1:vortex-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --command npx --args prisma,migrate,reset,--force --max-retries 0
gcloud run jobs execute vortex-reset --wait
gcloud run jobs delete vortex-reset
```
Then:
1. Update `STAFF_SEED_JSON` with the final staff list if it changed, and `services/api/prisma/data/taxonomy.json` with the final institutions, domains and problem statements (merge → deploy first).
2. `gcloud run jobs execute vortex-seed --wait`
3. Portal → Admin → **Staff**: share each person's login details with them directly.
4. Admin → Rules: confirm **Registration open** is off (a fresh database starts with it off).
5. Spot-check: site loads, admin and one staff login work, a test email arrives.
6. Code freeze: urgent fixes only.

### Launch (27 Nov)
1. Admin → Rules → **Registration open** on.
2. One person watches: Cloud Run metrics, Cloud SQL, alert emails, Cloudflare email stats, `mail.failed` and `rate_limited` logs.
3. Coordinators start verifying.

## After the event
- Scale down: `gcloud run services update vortex-api --cpu 1 --memory 1Gi`.
- Remove or rotate staff codes: re-seeding never changes them, so to retire staff access delete the staff users (their codes are deleted with them) or revoke them.
- Tighten DMARC to `p=quarantine`.
