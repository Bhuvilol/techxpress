import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL from this file (the `url` field was
// removed from schema.prisma). Keep the placeholder fallback so commands
// like `prisma generate` don't crash when DATABASE_URL is absent at
// build time (e.g. inside the Docker builder stage).
//
// Prefer DIRECT_URL for Prisma CLI operations in production. This lets the app
// keep using a pooled DATABASE_URL (e.g. Supabase transaction pooler) while
// `prisma migrate deploy` and other admin commands use a session-capable
// connection (e.g. Supabase session pooler, port 5432).

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/placeholder',
  },
});
