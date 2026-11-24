import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, isDev } from './env.js';

// DATABASE_URL on Cloud Run uses the Cloud SQL Unix socket:
//   postgresql://vortex_app:<pw>@localhost/vortex?host=/cloudsql/<PROJECT>:asia-south1:vortex-db
// `max` caps this instance's pool; one Cloud Run instance x 10 stays far
// below Cloud SQL's connection limit.
const POOL_MAX = 10;

// Singleton — guarded against duplicate instantiation under `node --watch`
// or any other reload mechanism that re-evaluates this module.
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: POOL_MAX }),
    log: isDev ? ['warn', 'error'] : ['error'],
  });

export const prisma = globalThis.__prisma ?? createClient();

if (isDev) {
  globalThis.__prisma = prisma;
}
