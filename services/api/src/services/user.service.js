import { prisma } from '../config/db.js';
import { AppError, Conflict, NotFound, Forbidden, BadRequest } from '../utils/errors.js';
import { generateSixDigitCode, hashPassword } from '../utils/crypto.js';
import { rulesService } from './rules.service.js';
import { invalidateUserStatus } from '../utils/userStatusCache.js';
import { membershipService } from './membership.service.js';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { registryMismatches } from '../utils/registryMismatch.js';
import { generatePublicId, USER_PUBLIC_PREFIX } from '../utils/publicId.js';

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

export const userService = {
  publicFields: PUBLIC_USER_FIELDS,

  async createPendingStudent(input) {
    // The validator already normalizes; do it again so no caller can bypass it.
    const { idCard, ...fields } = input;
    const data = { ...fields, registrationNo: normalizeRegistrationNo(fields.registrationNo) };
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
      prisma.institution.findUnique({ where: { id: data.institutionId }, select: { id: true } }),
      prisma.domain.count({ where: { id: { in: domainIds } } }),
    ]);
    if (!institution) throw BadRequest('Select your institution from the list.');
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
  async approveStudent(userId, { institutionId, allowRegistryMismatch = false } = {}) {
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

    const plaintextPassword = generateSixDigitCode();
    const passwordHash = await hashPassword(plaintextPassword);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: 'VERIFIED',
        passwordHash,
        passwordIssuedAt: new Date(),
      },
      select: PUBLIC_USER_FIELDS,
    });

    return { user: updated, plaintextPassword, overrodeRegistryMismatch };
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

  async restoreRevokedStudent(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.role !== 'STUDENT') throw Forbidden('Only student accounts can be restored');
    if (user.verificationStatus !== 'REVOKED') {
      throw Conflict('Only REVOKED users can be restored');
    }

    const plaintextPassword = generateSixDigitCode();
    const passwordHash = await hashPassword(plaintextPassword);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: 'VERIFIED',
        passwordHash,
        passwordIssuedAt: new Date(),
      },
      select: PUBLIC_USER_FIELDS,
    });

    invalidateUserStatus(userId);
    return { user: updated, plaintextPassword, snapshot: user };
  },

  // Issue a fresh 6-digit code for an already-VERIFIED user (lost-password).
  async reissuePassword(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true },
    });
    if (!user) throw NotFound('User not found');
    if (user.verificationStatus !== 'VERIFIED') {
      throw Forbidden('Cannot reissue password for a non-verified account');
    }

    const plaintextPassword = generateSixDigitCode();
    const passwordHash = await hashPassword(plaintextPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordIssuedAt: new Date() },
    });
    return { user, plaintextPassword };
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
