import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Rate limits for the public, abusable endpoints.
//
// Many students share one campus NAT IP, so per-IP limits are deliberately
// generous; the tight limit is per *account* (email) on login, which is what
// actually stops password guessing against 6-digit codes.
//
// In-memory store: correct for a single backend instance (our setup). If we
// ever run more than one instance, switch to a shared store (e.g. Redis).
//
// Client IPs come from req.ip, which relies on `trust proxy` being set to the
// number of proxies in front of the app (see TRUST_PROXY_HOPS in env.js).
// ─────────────────────────────────────────────────────────────────────────────

const MINUTE = 60 * 1000;

const limited = (name) => (req, res, _next, options) => {
  logger.warn('rate_limited', { limiter: name, ip: req.ip, path: req.path });
  res.status(options.statusCode).json({
    error: 'Too many attempts. Please wait a few minutes and try again.',
    code: 'RATE_LIMITED',
  });
};

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

// Failed logins per email: the real brute-force guard.
// 5 wrong passwords for one account → that account is paused for 15 minutes.
export const loginPerEmailLimiter = rateLimit({
  ...common,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  handler: limited('login_email'),
});

// Failed logins per IP: stops one machine spraying many accounts, while
// leaving room for a whole campus behind one NAT IP.
export const loginPerIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * MINUTE,
  limit: 50,
  skipSuccessfulRequests: true,
  handler: limited('login_ip'),
});

// Registrations per IP. Generous for shared campus networks, but stops a
// script from flooding the verification queue.
export const registrationLimiter = rateLimit({
  ...common,
  windowMs: 10 * MINUTE,
  limit: 60,
  handler: limited('registration_ip'),
});

// Team chat: per user, to stop message floods.
export const teamChatLimiter = rateLimit({
  ...common,
  windowMs: MINUTE,
  limit: 30,
  keyGenerator: (req) => `chat:${req.user?.id ?? req.ip}`,
  handler: (req, res, _next, options) => {
    logger.warn('rate_limited', { limiter: 'team_chat', userId: req.user?.id });
    res.status(options.statusCode).json({
      error: 'You are sending messages too quickly. Please slow down.',
      code: 'RATE_LIMITED',
    });
  },
});
