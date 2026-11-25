import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

// Audit writes have two forms:
//
//   record(...)         — fire-and-forget; failures logged not thrown.
//                         Use from controllers AFTER the business action
//                         has committed; an audit failure must not break
//                         a successful response.
//
//   log(tx, ...)        — transactional; throws on failure. Use from
//                         services when the audit row should land in
//                         the same transaction as the business write
//                         (e.g. role-changing operations where audit is
//                         a hard requirement).
//
// Reads:
//
//   list({...})         — admin browse with filters; capped at 200.

const SELECT_WITH_ACTOR = {
  actor: { select: { id: true, fullName: true, email: true, role: true } },
};

const matchesTextQuery = (entry, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.actor?.fullName,
    entry.actor?.email,
    entry.actor?.role,
    entry.details ? JSON.stringify(entry.details) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

const buildWhere = ({ action, entityType, entityId, actorId, actorRole, since, until } = {}) => ({
  ...(action && { action }),
  ...(entityType && { entityType }),
  ...(entityId && { entityId: { contains: entityId, mode: 'insensitive' } }),
  ...(actorId && { actorId }),
  ...(actorRole && { actor: { is: { role: actorRole } } }),
  ...((since || until) && {
    createdAt: {
      ...(since && { gte: since }),
      ...(until && { lte: until }),
    },
  }),
});

export const auditService = {
  async record({ actorId, action, entityType, entityId, details }) {
    try {
      await prisma.auditLog.create({
        data: { actorId, action, entityType, entityId, details },
      });
    } catch (err) {
      logger.warn('audit.write_failed', { action, entityId, err: err.message });
    }
  },

  log(tx, { actorId, action, entityType, entityId, details }) {
    return tx.auditLog.create({
      data: { actorId, action, entityType, entityId, details },
    });
  },

  // One page of entries, newest first: { entries, total, page, pageSize,
  // totalPages }. The free-text search (q) matches inside the JSON details,
  // which the database can't filter, so with q the newest 5000 matching rows
  // are filtered here and paged in memory.
  async list(filters = {}) {
    const { q } = filters;
    const pageSize = Math.min(filters.limit ?? 100, 500);
    const page = Math.max(1, filters.page ?? 1);
    const where = buildWhere(filters);

    let entries;
    let total;
    if (q) {
      const rows = await prisma.auditLog.findMany({
        where, include: SELECT_WITH_ACTOR, orderBy: { createdAt: 'desc' }, take: 5000,
      });
      const matched = rows.filter((entry) => matchesTextQuery(entry, q));
      total = matched.length;
      entries = matched.slice((page - 1) * pageSize, page * pageSize);
    } else {
      [total, entries] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: SELECT_WITH_ACTOR,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
    }
    return { entries, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async exportRows(filters = {}) {
    const { q, limit = 2000 } = filters;
    const take = Math.min(limit, 5000);
    const entries = await prisma.auditLog.findMany({
      where: buildWhere(filters),
      include: SELECT_WITH_ACTOR,
      orderBy: { createdAt: 'desc' },
      take: q ? 5000 : take,
    });
    return entries.filter((entry) => matchesTextQuery(entry, q)).slice(0, take);
  },
};
