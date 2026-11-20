import { prisma } from '../config/db.js';

// Short-lived cache of each user's verificationStatus, so the auth middleware
// can reject revoked accounts on every request without a DB query each time.
//
// Revoke/restore call invalidateUserStatus() so those changes apply
// immediately; anything else becomes visible within TTL_MS. Single-instance
// in-memory cache — matches our one-backend-per-environment setup.

const TTL_MS = 30_000;
const MAX_ENTRIES = 20_000;
const cache = new Map(); // userId -> { status, at }

export const getUserStatus = async (userId) => {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });
  const status = user?.verificationStatus ?? null; // null = user deleted

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(userId, { status, at: Date.now() });
  return status;
};

export const invalidateUserStatus = (userId) => {
  cache.delete(userId);
};
