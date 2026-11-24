import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Unauthorized, Forbidden } from '../utils/errors.js';
import { getUserStatus } from '../utils/userStatusCache.js';

// JWT payload shape: { sub: userId, role, email, institutionId? }
// `sub` is standard; we mirror it as `id` on req.user for ergonomic access.

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, email: user.email, institutionId: user.institution?.id ?? null },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY },
  );

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const verify = (token) => {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw Unauthorized('Token expired', { code: 'TOKEN_EXPIRED' });
    throw Unauthorized('Invalid token');
  }
};

const attachUser = (req, payload) => {
  req.user = {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
    institutionId: payload.institutionId ?? null,
  };
};

// A valid signature isn't enough: the account must still be VERIFIED, so a
// revoked (or deleted) user is locked out immediately rather than when their
// token expires. Status is cached briefly — see utils/userStatusCache.js.
const assertActive = async (userId) => {
  const status = await getUserStatus(userId);
  if (status !== 'VERIFIED') {
    throw Unauthorized('Account is no longer active', { code: 'ACCOUNT_INACTIVE' });
  }
};

// Hard requirement: 401 if missing, invalid, or the account is no longer active.
export const requireAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(Unauthorized('Authentication required'));
  try {
    const payload = verify(token);
    await assertActive(payload.sub);
    attachUser(req, payload);
    next();
  } catch (err) {
    next(err);
  }
};

// Best-effort: attach user if a valid token for an active account is present,
// otherwise continue anonymous.
export const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verify(token);
    await assertActive(payload.sub);
    attachUser(req, payload);
  } catch {
    // ignore — caller treats request as anonymous
  }
  next();
};

// Role gate. Compose AFTER requireAuth.
//   router.get('/admin/x', requireAuth, requireRole('ADMIN'), handler)
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(Unauthorized('Authentication required'));
  if (!roles.includes(req.user.role)) {
    return next(Forbidden('Insufficient role', { required: roles, actual: req.user.role }));
  }
  next();
};
