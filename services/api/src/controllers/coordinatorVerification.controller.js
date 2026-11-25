import { userService } from '../services/user.service.js';
import { sendIdCard } from '../utils/sendIdCard.js';
import { auditService } from '../services/audit.service.js';
import {
  requireDelivered,
  sendVerificationApprovedMail,
  sendVerificationRejectedMail,
  sendReregisterRequestMail,
} from '../utils/mail.js';

// A coordinator assigned to an institution only sees and acts on students
// from it. One without an institution covers every institution (null means
// "no filter" in userService).
const requireCoordinatorInstitutionId = (req) => req.user.institutionId ?? null;

// For lists: a coordinator without an institution may narrow the list to one
// with ?institutionId=. A coordinator with one always sees only theirs.
const listInstitutionId = (req) => req.user.institutionId ?? req.query.institutionId ?? null;

export const listPending = async (req, res) => {
  const institutionId = listInstitutionId(req);
  const users = await userService.listPending({
    search: req.query.search,
    institutionId,
  });
  res.json({ count: users.length, users });
};

export const listStudents = async (req, res) => {
  const institutionId = listInstitutionId(req);
  const users = await userService.listStudents({
    status: req.query.status,
    search: req.query.search,
    institutionId,
  });
  res.json({ count: users.length, users });
};

export const approve = async (req, res) => {
  const institutionId = requireCoordinatorInstitutionId(req);
  // Approved only if the email goes out. Coordinators never see the password:
  // it is delivered to the student by email alone.
  const { user } = await userService.approveStudent(req.params.id, {
    institutionId,
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
    details: { email: user.email, via: 'COORDINATOR' },
  });

  res.json({ message: 'User verified and credentials emailed', user });
};

export const reject = async (req, res) => {
  const institutionId = requireCoordinatorInstitutionId(req);
  const { user, snapshot } = await userService.rejectStudent(req.params.id, { institutionId });

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
    details: { reason: req.body.reason ?? null, via: 'COORDINATOR' },
  });

  res.json({ message: 'User rejected', user });
};

// ID card photo of a student this coordinator may review.
export const idCard = async (req, res) => {
  const card = await userService.getIdCard(req.params.id, { institutionId: requireCoordinatorInstitutionId(req) });
  sendIdCard(res, card);
};

// The ID card (or other details) can't be verified: remove the pending
// registration and email the student to register again.
export const requestReregistration = async (req, res) => {
  const snapshot = await userService.removeForReregistration(req.params.id, { institutionId: requireCoordinatorInstitutionId(req) });
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
      via: 'COORDINATOR',
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
