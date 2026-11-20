import { userService } from '../services/user.service.js';
import { registryService } from '../services/registry.service.js';
import { auditService } from '../services/audit.service.js';
import { disconnectUser } from '../realtime/emitter.js';
import {
  sendVerificationApprovedMail,
  sendVerificationRejectedMail,
  sendAccessRestoredMail,
  sendPasswordReissuedMail,
} from '../utils/mail.js';

// Admin-initiated credential operations (approve, restore, reissue) email the
// new password to the student AND return it once in the response, so the admin
// has a backup if the email doesn't arrive. `emailDelivered` tells the UI which
// case it is. The plaintext password is never stored — only its bcrypt hash.

// All handlers below require requireAuth + requireRole('ADMIN') at the route layer.

export const listPending = async (req, res) => {
  const users = await userService.listPending({ search: req.query.search });

  // Annotate each with registry-match info so the admin UI can highlight
  // exact matches vs. unknowns. Done in a loop to avoid an N+1 — registry
  // lookups are unique-key reads, very cheap.
  const annotated = await Promise.all(
    users.map(async (u) => ({
      ...u,
      registryMatch: await registryService.matchUser({
        registrationNo: u.registrationNo,
        email: u.email,
      }),
    })),
  );
  res.json({ count: annotated.length, users: annotated });
};

export const listStudents = async (req, res) => {
  const users = await userService.listStudents(req.query);
  res.json({ count: users.length, users });
};

// Resolve a registration number to its underlying User. Used by admin
// flows (force-add member, jury assignment) where we want admins to type
// the human-friendly reg# instead of a cuid.
export const lookupByRegistrationNo = async (req, res) => {
  const user = await userService.findByRegistrationNo(req.query.registrationNo);
  res.json({ user });
};

export const approve = async (req, res) => {
  const { user, plaintextPassword } = await userService.approveStudent(req.params.id);

  const mail = await sendVerificationApprovedMail({
    to: user.email,
    fullName: user.fullName,
    password: plaintextPassword,
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { email: user.email, emailDelivered: mail.delivered },
  });

  // One-shot reveal for the admin (ADMIN-gated route only). The database
  // stores only the bcrypt hash; after this the password can only be reissued.
  res.json({
    message: mail.delivered
      ? 'User verified — credentials emailed'
      : 'User verified — email not sent, share the password manually',
    user,
    password: plaintextPassword,
    emailDelivered: mail.delivered,
  });
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
  const { user } = await userService.revokeStudent(req.params.id);
  disconnectUser(user.id); // close their live sockets too

  auditService.record({
    actorId: req.user.id,
    action: 'USER_REVOKED',
    entityType: 'User',
    entityId: user.id,
  });

  res.json({ message: 'Access revoked', user });
};

export const restore = async (req, res) => {
  const { user, plaintextPassword } = await userService.restoreRevokedStudent(req.params.id);

  const mail = await sendAccessRestoredMail({
    to: user.email,
    fullName: user.fullName,
    password: plaintextPassword,
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { restored: true, emailDelivered: mail.delivered },
  });

  res.json({
    message: mail.delivered
      ? 'Access restored — credentials emailed'
      : 'Access restored — email not sent, share the password manually',
    user,
    password: plaintextPassword,
    emailDelivered: mail.delivered,
  });
};

export const reissue = async (req, res) => {
  const { user, plaintextPassword } = await userService.reissuePassword(req.params.id);

  const mail = await sendPasswordReissuedMail({
    to: user.email,
    fullName: user.fullName,
    password: plaintextPassword,
  });

  auditService.record({
    actorId: req.user.id,
    action: 'USER_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    details: { reissue: true, emailDelivered: mail.delivered },
  });

  res.json({
    message: mail.delivered
      ? 'New password issued — credentials emailed'
      : 'New password issued — email not sent, share it manually',
    password: plaintextPassword,
    user,
    emailDelivered: mail.delivered,
  });
};
