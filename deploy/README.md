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

CI runs these steps on the server through SSM Run Command:

```bash
cd /opt/vortex
docker compose pull
docker compose run --rm backend npx prisma migrate deploy   # schema changes first
docker compose up -d --remove-orphans                       # then the new app
curl -fsS https://$API_DOMAIN/api/health                    # smoke check
```

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
- **When the real domain is ready:**
  1. Change `API_DOMAIN` and `CORS_ORIGIN` in SSM.
  2. Redeploy.
  3. Point `api.<domain>` at the instance in Cloudflare DNS.
