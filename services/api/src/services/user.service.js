import { prisma } from '../config/db.js';
import { AppError, Conflict, NotFound, Forbidden, BadRequest } from '../utils/errors.js';
import { generateSixDigitCode, hashPassword } from '../utils/crypto.js';
import { rulesService } from './rules.service.js';
import { invalidateUserStatus } from '../utils/userStatusCache.js';
import { membershipService } from './membership.service.js';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { registryMismatches } from '../utils/registryMismatch.js';
import { generatePublicId, USER_PUBLIC_PREFIX } from '../utils/publicId.js';
import { OPEN_DOMAIN } from './taxonomy.service.js';
import { BRANCH_INSTITUTION_NAME } from '../validators/registration.schema.js';

// Sole owner of User table writes related to the verification lifecycle.
// Controllers must NOT touch prisma.user directly for these flows.

const PUBLIC_USER_FIELDS = {
  id: true,
  publicId: true,
  role: true,
  fullName: true,
  email: true,
  registrationNo: true,
  phone: true,
  discordId: true,
  gender: true,
  tshirtSize: true,
  profilePicUrl: true,
  preferredDomains: true,
  linkedinUrl: true,
  githubUrl: true,
  portfolioUrl: true,
  resumeDriveLink: true,
  researchPublicationUrl: true,
  bio: true,
  certificationsAchievements: true,
  projectInitiative: true,
  participationExperience: true,
  achievements: true,
  hackathonExperience: true,
  isDomainExpert: true,
  track: true,
  degree: true,
  branch: true,
  yearSemester: true,
  contributionAreas: true,
  preferredTeamRole: true,
  technicalSkills: true,
  nonTechnicalSkills: true,
  verificationStatus: true,
  passwordIssuedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  institution: { select: { id: true, name: true } },
  domain: { select: { id: true, name: true } },
};

// One message for every duplicate, with no field name in it (see createPendingStudent).
const DUPLICATE_REGISTRATION = () => Conflict(
  'This email or registration number is already registered. If you registered before, wait for verification or contact the organizers.',
);

const attachPreferredDomainDetails = async (user) => {
  if (!user) return user;
  const preferredDomainIds = [...new Set((user.preferredDomains ?? []).filter(Boolean))];
  if (!preferredDomainIds.length) {
    return { ...user, preferredDomainDetails: [] };
  }
  const domains = await prisma.domain.findMany({
    where: { id: { in: preferredDomainIds } },
    select: { id: true, name: true },
  });
  const domainMap = new Map(domains.map((domain) => [domain.id, domain]));
  return {
    ...user,
    preferredDomainDetails: preferredDomainIds.map((id) => domainMap.get(id)).filter(Boolean),
  };
};

const assertInstitutionScope = (user, institutionId) => {
  if (!institutionId) return;
  if (!user.institutionId || user.institutionId !== institutionId) {
    throw Forbidden('Cannot act on a student from another institution');
  }
};

// A new password is saved and emailed as one step. `deliver` sends the email
// inside the transaction; if it throws (email not sent), the change is rolled
// back, so a student never ends up with a password nobody received.
// Gives the student the next free seat number, unless they already have one
// (a restored student keeps theirs). The advisory lock makes concurrent
// approvals take turns, so two students never get the same number; the
// unique index on seatNo is the final guard. Seats are never reused.
const SEAT_LOCK = 2026_1127;
export const assignSeat = async (tx, userId) => {
  const current = await tx.user.findUnique({ where: { id: userId }, select: { seatNo: true } });
  if (current?.seatNo) return current.seatNo;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEAT_LOCK})`;
  const { _max: max } = await tx.user.aggregate({ _max: { seatNo: true } });
  const seatNo = (max?.seatNo ?? 0) + 1;
  await tx.user.update({ where: { id: userId }, data: { seatNo }, select: { id: true } });
  return seatNo;
};

const issueCredentials = (userId, data, plaintextPassword, deliver) => prisma.$transaction(async (tx) => {
  if (data.verificationStatus === 'VERIFIED') await assignSeat(tx, userId);
  const passwordHash = await hashPassword(plaintextPassword);
  const updated = await tx.user.update({
    where: { id: userId },
    data: { ...data, passwordHash, passwordIssuedAt: new Date() },
    select: PUBLIC_USER_FIELDS,
  });
  await deliver({ user: updated, plaintextPassword });
  return updated;
}, { timeout: 20_000 }); // the email call can take up to ~10 s

export const userService = {
  publicFields: PUBLIC_USER_FIELDS,

  async createPendingStudent(input) {
    // The validator already normalizes; do it again so no caller can bypass it.
    const { idCard, ...fields } = input;
    const data = { ...fields, registrationNo: normalizeRegistrationNo(fields.registrationNo) };
    // The first of the 4 picks is the main domain.
    if (data.preferredDomains?.length) data.domainId = data.preferredDomains[0];
    const rules = await rulesService.get();
    if (!rules.registrationOpen) {
      // Top-level code, like REGISTRY_MISMATCH: clients read `code`, not `details`.
      throw new AppError(403, 'REGISTRATION_CLOSED', 'Registration is currently closed');
    }

    // Institution and domains come from the taxonomy tables. Check them here:
    // without it an unknown id fails as a raw foreign-key error, and an
    // unknown preferred domain would be stored with no check at all.
    const domainIds = [...new Set([data.domainId, ...(data.preferredDomains ?? [])].filter(Boolean))];
    const [institution, domainCount] = await Promise.all([
      prisma.institution.findUnique({ where: { id: data.institutionId }, select: { id: true, name: true } }),
      prisma.domain.count({ where: { id: { in: domainIds }, ...OPEN_DOMAIN } }),
    ]);
    if (!institution) throw BadRequest('Select your institution from the list.');
    // Branch belongs to one institution only: required there, dropped elsewhere.
    if (institution.name === BRANCH_INSTITUTION_NAME) {
      if (!data.branch) throw BadRequest('Select your branch.');
    } else {
      delete data.branch;
    }
    if (domainCount !== domainIds.length) {
      throw BadRequest('Pick your domains from the list.');
    }

    // Duplicate check. The response names no field: a field name would tell
    // anyone who submits a stranger's email that the account exists. The
    // unique constraints are still the final word (see the P2002 handler).
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.registrationNo ? [{ registrationNo: data.registrationNo }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw DUPLICATE_REGISTRATION();
    }

    try {
      return await prisma.user.create({
        data: {
          ...data,
          publicId: generatePublicId(USER_PUBLIC_PREFIX),
          role: 'STUDENT',
          verificationStatus: 'PENDING',
          passwordHash: null,
          // Saved in the same statement as the user: no account without its card.
          ...(idCard && { idCard: { create: idCard } }),
        },
        select: PUBLIC_USER_FIELDS,
      });
    } catch (err) {
      // Two identical submissions can both pass the check above; the unique
      // index then rejects the second. Answer it the same way as the check.
      if (err.code === 'P2002') throw DUPLICATE_REGISTRATION();
      throw err;
    }
  },

  // A student's ID card image, for admins and coordinators during
  // verification. Coordinators tied to an institution only see their own.
  async getIdCard(userId, { institutionId } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        institutionId: true,
        idCard: { select: { mimeType: true, sizeBytes: true, data: true, createdAt: true } },
      },
    });
    if (!user || user.role !== 'STUDENT') throw NotFound('User not found');
    assertInstitutionScope(user, institutionId);
    if (!user.idCard) throw NotFound('No ID card uploaded for this student');
    return user.idCard;
  },

  // Approve a PENDING student: generate a 6-digit code, hash it, store it.
  // Returns { user, plaintextPassword } so the caller can email the password.
  // The plaintext NEVER persists past this function's return value.
  async approveStudent(userId, { institutionId, allowRegistryMismatch = false, deliver } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, role: true, verificationStatus: true, fullName: true, email: true, institutionId: true,
        registrationNo: true, institution: { select: { name: true } },
      },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student accounts can be verified');
    assertInstitutionScope(user, institutionId);
    if (user.verificationStatus === 'VERIFIED') {
      throw Conflict('User is already verified');
    }
    if (user.verificationStatus === 'REVOKED') {
      throw Conflict('Cannot verify a revoked account');
    }

    // Registry check. Only an institution mismatch blocks approval: a student
    // who typed a personal email should not need an override each time (the
    // email difference still shows in the admin list). Coordinators cannot
    // override; an admin can, once they have seen it (allowRegistryMismatch).
    let blocking = [];
    if (user.registrationNo) {
      const entry = await prisma.collegeRegistry.findUnique({
        where: { registrationNo: user.registrationNo },
        select: { email: true, institutionId: true, institution: { select: { name: true } } },
      });
      blocking = registryMismatches(user, entry).filter((m) => m.field === 'institution');
    }
    if (blocking.length && !allowRegistryMismatch) {
      // Top-level code, so the client can branch on it (the API client reads `code`).
      throw new AppError(409, 'REGISTRY_MISMATCH',
        'The college registry does not match this registration. An organizer must check it before approval.',
        { mismatches: blocking });
    }
    const overrodeRegistryMismatch = blocking.length > 0;

    const updated = await issueCredentials(userId, { verificationStatus: 'VERIFIED' }, generateSixDigitCode(), deliver);
    return { user: updated, overrodeRegistryMismatch };
  },

  async rejectStudent(userId, { institutionId } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true, institutionId: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student accounts can be rejected');
    assertInstitutionScope(user, institutionId);
    if (user.verificationStatus === 'VERIFIED') {
      throw Conflict('Cannot reject an already-verified user — use revoke instead');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'REJECTED' },
      select: PUBLIC_USER_FIELDS,
    });
    return { user: updated, snapshot: user };
  },

  // Remove a registration entirely so the student can register again with the
  // same email and registration number; the ID card is deleted with it
  // (cascade). Used for PENDING students whose ID card can't be verified and,
  // by admins only (allowRejected), to give a REJECTED student a second try.
  // Returns a snapshot for the email and audit log.
  async removeForReregistration(userId, { institutionId, allowRejected = false } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true, registrationNo: true, institutionId: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student registrations can be sent back');
    assertInstitutionScope(user, institutionId);
    const allowed = user.verificationStatus === 'PENDING' || (allowRejected && user.verificationStatus === 'REJECTED');
    if (!allowed) {
      throw Conflict(allowRejected
        ? 'Only pending or rejected registrations can be cleared for re-registration'
        : 'Only pending registrations can be sent back for re-registration');
    }
    await prisma.user.delete({ where: { id: userId } });
    return user;
  },

  async revokeStudent(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student accounts can be revoked');
    if (user.verificationStatus !== 'VERIFIED') {
      throw Conflict('Only VERIFIED users can be revoked');
    }

    // Wipe credentials and take them out of their team, atomically. The user
    // row stays for audit/history; the team (and its scores) stays too.
    const { updated, team } = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          verificationStatus: 'REVOKED',
          passwordHash: null,
          passwordIssuedAt: null,
        },
        select: PUBLIC_USER_FIELDS,
      });
      const team = await membershipService.removeRevokedUser(tx, userId);
      return { updated, team };
    });
    invalidateUserStatus(userId); // existing tokens stop working immediately
    return { user: updated, snapshot: user, team };
  },

  async restoreRevokedStudent(userId, { deliver } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student accounts can be restored');
    if (user.verificationStatus !== 'REVOKED') {
      throw Conflict('Only REVOKED users can be restored');
    }

    const updated = await issueCredentials(userId, { verificationStatus: 'VERIFIED' }, generateSixDigitCode(), deliver);
    invalidateUserStatus(userId);
    return { user: updated, snapshot: user };
  },

  // Issue a fresh 6-digit code for an already-VERIFIED user (lost-password).
  async reissuePassword(userId, { deliver } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.verificationStatus !== 'VERIFIED') {
      throw Forbidden('Cannot reissue password for a non-verified account');
    }

    const updated = await issueCredentials(userId, {}, generateSixDigitCode(), deliver);
    return { user: updated };
  },

  // Public PNR status check. The registration number and the email must
  // belong to the same student; anything else (no such number, wrong email,
  // a staff account) looks exactly like "no reservation", so the endpoint
  // can't be used to find out which registration numbers exist.
  // Returns { status, user? }: `user` only for a VERIFIED student.
  async lookupPnr({ registrationNo, email }) {
    const user = await prisma.user.findUnique({
      where: { registrationNo: normalizeRegistrationNo(registrationNo) },
      select: {
        id: true,
        role: true,
        email: true,
        verificationStatus: true,
        fullName: true,
        publicId: true,
        seatNo: true,
        institution: { select: { name: true } },
        domain: { select: { name: true } },
      },
    });
    const matches = Boolean(user)
      && user.role === 'STUDENT'
      && typeof user.email === 'string'
      && user.email.toLowerCase() === String(email).toLowerCase();
    if (!matches) return { status: 'NO_RESERVATION' };
    if (user.verificationStatus !== 'VERIFIED') return { status: user.verificationStatus };
    // Confirmed without a seat (e.g. created by the testing import): give one now.
    if (!user.seatNo) user.seatNo = await prisma.$transaction((tx) => assignSeat(tx, user.id));
    return { status: 'VERIFIED', user };
  },

  // Auth lookup — returns the row including the hash. ONLY the auth controller
  // should call this; everywhere else uses findById which strips secrets.
  findForAuth(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        email: true,
        fullName: true,
        passwordHash: true,
        verificationStatus: true,
        institution: { select: { id: true, name: true } },
      },
    });
  },

  // A student changes their 4 domain picks (first = main domain). Every id
  // must be a current domain.
  async updateDomains(userId, preferredDomains) {
    const found = await prisma.domain.count({ where: { id: { in: preferredDomains }, ...OPEN_DOMAIN } });
    if (found !== preferredDomains.length) throw BadRequest('Pick your domains from the list.');
    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferredDomains, domainId: preferredDomains[0] },
      select: PUBLIC_USER_FIELDS,
    });
    return attachPreferredDomainDetails(user);
  },

  // Set once only (older accounts registered before the size was asked).
  // After that it is fixed: T-shirts are ordered from these sizes.
  async updateTshirtSize(userId, tshirtSize) {
    const { count } = await prisma.user.updateMany({ where: { id: userId, tshirtSize: null }, data: { tshirtSize } });
    if (count === 0) throw Conflict('Your T-shirt size is already set and cannot be changed. Contact the organisers if it is wrong.');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
    return attachPreferredDomainDetails(user);
  },

  async updateBranch(userId, branch) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { institution: { select: { name: true } } } });
    if (current?.institution?.name !== BRANCH_INSTITUTION_NAME) {
      throw BadRequest(`Branch is only asked of ${BRANCH_INSTITUTION_NAME} students.`);
    }
    // A branch change can make or break the team's cross-branch rule, so
    // re-check the team in the same transaction.
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: { branch }, select: PUBLIC_USER_FIELDS });
      const membership = await tx.teamMember.findUnique({ where: { userId }, select: { teamId: true } });
      if (membership) await rulesService.recomputeTeamStatus(tx, membership.teamId);
      return updated;
    });
    return attachPreferredDomainDetails(user);
  },

  async findById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_FIELDS,
    });
    return attachPreferredDomainDetails(user);
  },

  findByRegistrationNo(registrationNo) {
    return prisma.user.findUnique({
      where: { registrationNo: normalizeRegistrationNo(registrationNo) },
      select: PUBLIC_USER_FIELDS,
    });
  },

  recordLogin(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });
  },

  async listPending({ search, institutionId, page, limit } = {}) {
    const where = {
      role: 'STUDENT',
      verificationStatus: 'PENDING',
      ...(institutionId && { institutionId }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { registrationNo: { contains: search, mode: 'insensitive' } },
          { publicId: { contains: search, mode: 'insensitive' } }, // passenger reference, TXP-XXXX-XXXX
        ],
      }),
    };

    if (!page) {
      return prisma.user.findMany({
        where,
        select: PUBLIC_USER_FIELDS,
        orderBy: { createdAt: 'asc' },
      });
    }

    const take = limit ? Math.min(Math.max(limit, 1), 100) : 25;
    const skip = (Math.max(page, 1) - 1) * take;

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: PUBLIC_USER_FIELDS,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
      users,
    };
  },

  async listStudents({ status, search, institutionId, page, limit } = {}) {
    const where = {
      role: 'STUDENT',
      ...(status && { verificationStatus: status }),
      ...(institutionId && { institutionId }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { registrationNo: { contains: search, mode: 'insensitive' } },
          { publicId: { contains: search, mode: 'insensitive' } }, // passenger reference, TXP-XXXX-XXXX
        ],
      }),
    };

    if (!page) {
      return prisma.user.findMany({
        where,
        select: PUBLIC_USER_FIELDS,
        orderBy: { createdAt: 'desc' },
      });
    }

    const take = limit ? Math.min(Math.max(limit, 1), 100) : 25;
    const skip = (Math.max(page, 1) - 1) * take;

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: PUBLIC_USER_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      total,
      page: Math.max(page, 1),
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
      users,
    };
  },

  async getVerificationStats({ institutionId } = {}) {
    const where = {
      role: 'STUDENT',
      ...(institutionId && { institutionId }),
    };

    const [counts, total] = await Promise.all([
      prisma.user.groupBy({
        by: ['verificationStatus'],
        where,
        _count: { _all: true },
      }),
      prisma.user.count({ where }),
    ]);

    const acc = { total, PENDING: 0, VERIFIED: 0, REJECTED: 0, REVOKED: 0 };
    for (const c of counts) {
      if (c.verificationStatus && c._count?._all != null) {
        acc[c.verificationStatus] = c._count._all;
      }
    }
    return acc;
  },
};
