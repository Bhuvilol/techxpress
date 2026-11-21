# Vortex server deployment

The backend runs on an EC2 host in **Mumbai (`ap-south-1`)**, in the `vortex`
AWS account. It runs as two Docker containers:
- **backend**: the image from ECR.
- **caddy**: provides HTTPS and proxies requests to the backend.

The frontend is a Cloudflare Worker and is deployed separately.

| Environment | Instance | API URL |
|---|---|---|
| staging | `i-046ce4ff2d0e7bfe0` (`t3.small`, EIP `3.6.239.100`) | `https://api.3-6-239-100.sslip.io` (temporary until the domain exists) |
| production | not created yet | `https://api.<event-domain>` |

## Files on the server (`/opt/vortex`)

| File | Source |
|---|---|
| `docker-compose.yml` | this folder |
| `Caddyfile` | this folder |
| `.env` | rendered from SSM Parameter Store `/vortex/<env>/*` at deploy time. Never committed. See [`.env.example`](.env.example) |

## Deploy sequence

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) runs these
steps on the server through SSM Run Command, on every push to `main` that
touches `backend/` or `deploy/`:

```bash
cd /opt/vortex
# docker-compose.yml + Caddyfile written from the repo; .env rendered from SSM
docker compose pull
docker compose run --rm --no-deps backend npx prisma migrate deploy   # schema changes first
# docker compose run --rm --no-deps backend npm run db:seed           # only when "seed" is ticked
docker compose up -d --remove-orphans --wait --wait-timeout 180       # then the new app
curl -fsS https://$API_DOMAIN/api/health                              # smoke check (from CI)
```

To redeploy manually, use GitHub → Actions → *Deploy backend (staging)* →
**Run workflow**. Rollback steps are in [DEPLOY.md → Releasing](../DEPLOY.md#4-releasing).

## Day-to-day operations

To get a shell on the server, there's **no SSH**. Use AWS Console → EC2 →
the instance → **Connect → Session Manager**, then run `sudo -iu ec2-user`.

```bash
cd /opt/vortex
docker compose ps                       # container status + health
docker compose logs -f backend          # follow backend logs (also in CloudWatch)
docker compose restart backend          # restart the API
docker compose run --rm backend npx prisma migrate status
```

**CloudWatch log groups:**
- `/vortex/<env>/backend`
- `/vortex/<env>/caddy`

## Notes
- **Socket.IO** works through Caddy without extra config. Run **one backend
  container per environment**: more than one would need a Redis adapter.
- **AWS credentials in the backend container.** The backend calls SES with the
  instance role, so the instance metadata hop limit must be **2**. The default
  of 1 blocks containers from reaching it.
- **TLS certificates** are stored in the `caddy_data` volume. Don't delete it,
  or Let's Encrypt rate limits may apply when Caddy re-requests them.
- **Each deploy restarts the backend container:** a few seconds of downtime,
  and live sockets reconnect. Avoid deploying during live event moments.
- **When the real domain is ready:** follow
  [DEPLOY.md → Switching to the real domain](../DEPLOY.md#7-switching-to-the-real-domain)
  (`API_DOMAIN`, `CORS_ORIGIN`, `TRUST_PROXY_HOPS`, DNS, SES).
