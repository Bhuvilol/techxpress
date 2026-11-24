import { logger } from '../utils/logger.js';

// One log line per request, emitted on response finish. Keeps logs cheap and
// structured. Skips the noisy /api/health and /api/health/live probes.
export const requestLog = (req, res, next) => {
  if (req.path === '/api/health' || req.path.startsWith('/api/health/')) return next();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('http', {
      method: req.method,
      // originalUrl, not req.path: inside a mounted router req.path is
      // relative (e.g. "/login" for /api/auth/login).
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durMs: Math.round(durMs),
      // Client IP as Express sees it (depends on TRUST_PROXY_HOPS); used to
      // confirm rate limiting keys on real users, not on the proxy.
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
