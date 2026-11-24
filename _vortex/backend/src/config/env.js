import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  // Number of reverse proxies in front of the app, so req.ip is the real client
  // IP (used by rate limiting). 1 = Caddy only; 2 = Cloudflare → Caddy.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().min(1),

  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('2h'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:80,http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(7).optional(),
  JURY_SEED_PASSWORD: z.string().min(7).optional(),
  COORDINATOR_SEED_PASSWORD: z.string().min(7).optional(),

  // Amazon SES (transactional email). Optional — when MAIL_FROM is absent,
  // mail.js logs and skips. MAIL_FROM must be on an SES-verified domain, e.g.
  // "Vortex <noreply@yourdomain.com>". Credentials come from the AWS default
  // provider chain (EC2 instance role in staging/production).
  MAIL_FROM: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  SES_REGION: z.string().min(1).default('ap-south-1'),
  MAIL_REPLY_TO: z.string().email().optional().or(z.literal('').transform(() => undefined)),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
