# VORTEX API image for Cloud Run. The same image runs:
#   - the service:          node src/index.js          (default CMD)
#   - the migration job:    npx prisma migrate deploy
#   - the seed job:         node prisma/seed.js
# Never run `prisma db push` against a database with real data — it can drop
# columns. Schema changes are migrations in prisma/migrations, reviewed in PRs.

FROM node:22-slim AS base
# OpenSSL for Prisma; CA certificates for outbound HTTPS (Cloudflare email).
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install production dependencies (the Prisma CLI is one, for the jobs) and
# generate the Prisma client.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY prisma ./prisma
COPY prisma.config.js ./
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production \
    PORT=8080
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json prisma.config.js ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

# Run as the image's unprivileged user, not root.
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
