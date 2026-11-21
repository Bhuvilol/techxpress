import { Router } from 'express';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

// Two probes:
//
//   GET /api/health       readiness — the API can actually serve requests.
//                         Runs SELECT 1 against the database with a short
//                         timeout. 200 { status:'ok', db:'ok' } or
//                         503 { status:'degraded', db:'down' }.
//                         Used by the deploy smoke test and uptime monitors.
//
//   GET /api/health/live  liveness — the Node process is up and the event
//                         loop answers. Never touches the database, so a
//                         database blip doesn't mark the container unhealthy.
//                         Used by the container healthcheck.
//
// Neither response includes error details.

const DB_TIMEOUT_MS = 2000;

const pingDatabase = () => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`database ping timed out after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS);
  });
  return Promise.race([prisma.$queryRaw`SELECT 1`, timeout]).finally(() => clearTimeout(timer));
};

const router = Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/live', (_req, res) => res.json({ status: 'ok' }));

router.get('/', async (_req, res) => {
  const started = Date.now();
  try {
    await pingDatabase();
    res.json({ status: 'ok', db: 'ok', dbMs: Date.now() - started });
  } catch (err) {
    logger.error('health.db_down', { err: err.message, ms: Date.now() - started });
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

export default router;
