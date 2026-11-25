import { registryMismatches } from '../utils/registryMismatch.js';
import { requireDelivered } from '../utils/mail.js';
import { userService } from '../services/user.service.js';
import { sendIdCard } from '../utils/sendIdCard.js';
import { auditService } from '../services/audit.service.js';
import { disconnectUser, emitLeaderboardChanged } from '../realtime/emitter.js';
import { prisma } from '../config/db.js';
import {
  sendVerificationApprovedMail,
  sendVerificationRejectedMail,
  sendAccessRestoredMail,
  sendPasswordReissuedMail,
  sendReregisterRequestMail,
} from '../utils/mail.js';

// Admin-initiated credential operations (approve, restore, reissue) email the
// new password to the student AND return it once in the response, so the admin
// has a backup if the email doesn't arrive. `emailDelivered` tells the UI which
// case it is. The plaintext password is never stored — only its bcrypt hash.

// All handlers below require requireAuth + requireRole('ADMIN') at the route layer.

export const stats = async (_req, res) => {
  const data = await userService.getVerificationStats();
  res.json({ stats: data });
};

export const listPending = async (req, res) => {
  const result = await userService.listPending({
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  });

  const isPaginated = !Array.isArray(result);
  const users = isPaginated ? result.users : result;

  // Batch query college registry to eliminate N+1 database queries
  const regNos = users.map((u) => u.registrationNo).filter(Boolean);
  const matchedEntries = regNos.length
    ? await prisma.collegeRegistry.findMany({
        where: { registrationNo: { in: regNos } },
        include: { institution: { select: { id: true, name: true } } },
      })
    : [];

  const registryByRegNo = new Map(matchedEntries.map((e) => [e.registrationNo, e]));

  const annotated = users.map((u) => {
    const entry = u.registrationNo ? registryByRegNo.get(u.registrationNo) : null;
    return {
      ...u,
      // The admin UI reads registryMatch.mismatches for its badge.
      registryMatch: entry
        ? {
            matched: true,
            entry,
            mismatches: registryMismatches(u, entry),
          }
        : { matched: false },
    };
  });

  if (!isPaginated) {
    return res.json({ count: annotated.length, total: annotated.length, users: annotated });
  }

  res.json({
    count: annotated.length,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    users: annotated,
  });
};

export const listStudents = async (req, res) => {
  const result = await userService.listStudents(req.query);

  if (Array.isArray(result)) {
    return res.json({ count: result.length, total: result.length, users: result });
  }

  res.json({
    count: result.users.length,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    users: result.users,
  });
};

// Resolve a registration number to its underlying User. Used by admin
// flows (force-add member, jury assignment) where we want admins to type
// the human-friendly reg# instead of a cuid.
export const lookupByRegistrationNo = async (req, res) => {
  const user = await userService.findByRegistrationNo(req.query.registrationNo);
  res.json({ user });
};

export const approve = async (req, res) => {
  // An admin can approve past a registry mismatch, but only after the UI has
  // shown it and they have confirmed. The flag is recorded in the audit log.
  const allowRegistryMismatch = req.body?.allowRegistryMismatch === true;
  // The student is approved only if the email goes out (see userService.issueCredentials).
  const { user, overrodeRegistryMismatch } = await userService.approveStudent(req.params.id, {
    allowRegistryMismatch,
    deliver: async ({ user, plaintextPassword }) => requireDelivered(await sendVerificationApprovedMail({
      to: user.email,
      fullName: user.fullName,
      password: plaintextPassword,
    })),
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { email: user.email, registryMismatchOverride: overrodeRegistryMismatch },
  });

  res.json({ message: 'User verified — credentials emailed', user });
};

export const reject = async (req, res) => {
  const { user, snapshot } = await userService.rejectStudent(req.params.id);

  await sendVerificationRejectedMail({
    to: snapshot.email,
    fullName: snapshot.fullName,
    reason: req.body.reason,
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_REJECTED',
    entityType: 'User',
    entityId: user.id,
    details: { reason: req.body.reason ?? null },
  });

  res.json({ message: 'User rejected', user });
};

export const revoke = async (req, res) => {
  const { user, team } = await userService.revokeStudent(req.params.id);
  disconnectUser(user.id); // close their live sockets too
  if (team) emitLeaderboardChanged(); // team roster / leader may have changed

  auditService.record({
    actorId: req.user.id,
    action: 'USER_REVOKED',
    entityType: 'User',
    entityId: user.id,
    details: team ? { removedFromTeam: team.teamName, teamId: team.teamId, newLeaderId: team.newLeaderId, teamDeleted: team.teamDeleted } : undefined,
  });

  const teamNote = !team ? ''
    : team.teamDeleted ? ` Their team "${team.teamName}" had no other members and was removed.`
    : team.newLeaderId ? ` Removed from "${team.teamName}"; leadership passed to the longest-standing member.`
    : ` Removed from team "${team.teamName}".`;
  res.json({ message: `Access revoked.${teamNote}`, user, team });
};

export const restore = async (req, res) => {
  const { user } = await userService.restoreRevokedStudent(req.params.id, {
    deliver: async ({ user, plaintextPassword }) => requireDelivered(await sendAccessRestoredMail({
      to: user.email,
      fullName: user.fullName,
      password: plaintextPassword,
    })),
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { restored: true },
  });

  res.json({ message: 'Access restored — credentials emailed', user });
};

export const reissue = async (req, res) => {
  const { user } = await userService.reissuePassword(req.params.id, {
    deliver: async ({ user, plaintextPassword }) => requireDelivered(await sendPasswordReissuedMail({
      to: user.email,
      fullName: user.fullName,
      password: plaintextPassword,
    })),
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { reissue: true },
  });

  res.json({ message: 'New password issued — credentials emailed', user });
};

// ID card photo uploaded at registration.
export const idCard = async (req, res) => {
  const card = await userService.getIdCard(req.params.id);
  sendIdCard(res, card);
};

// The ID card (or other details) can't be verified: remove the pending
// registration and email the student to register again.
export const requestReregistration = async (req, res) => {
  const snapshot = await userService.removeForReregistration(req.params.id, { allowRejected: true });
  const mail = await sendReregisterRequestMail({
    to: snapshot.email,
    fullName: snapshot.fullName,
    note: req.body.note,
    previouslyRejected: snapshot.verificationStatus === 'REJECTED',
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_REJECTED',
    entityType: 'User',
    entityId: snapshot.id,
    details: {
      kind: 'REREGISTER_REQUESTED',
      email: snapshot.email,
      registrationNo: snapshot.registrationNo,
      note: req.body.note ?? null,
      previousStatus: snapshot.verificationStatus,
      via: 'ADMIN',
      emailDelivered: mail.delivered,
    },
  });

  res.json({
    message: mail.delivered
      ? 'Registration removed and the student was emailed to register again'
      : 'Registration removed, but the email could not be sent. Contact the student directly',
    emailDelivered: mail.delivered,
  });
};
