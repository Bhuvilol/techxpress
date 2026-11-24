# Build stage
FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./

RUN npm install
RUN npx prisma generate

COPY . .

# Final stage
FROM node:20-slim AS runner

# Install OpenSSL for Prisma in the final stage too
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# The container only starts the app. Schema changes are applied as a separate
# deploy step BEFORE the new container starts:
#   docker compose run --rm backend npx prisma migrate deploy
# Never run `prisma db push` against a database with real data — it can drop
# columns. Migrations live in prisma/migrations and are reviewed in PRs.
CMD ["node", "src/index.js"]
