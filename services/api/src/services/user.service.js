import { prisma } from '../config/db.js';
import { Conflict, NotFound, Forbidden } from '../utils/errors.js';
import { generateSixDigitCode, hashPassword } from '../utils/crypto.js';
import { rulesService } from './rules.service.js';
import { invalidateUserStatus } from '../utils/userStatusCache.js';
import { membershipService } from './membership.service.js';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';

// Sole owner of User table writes related to the verification lifecycle.
// Controllers must NOT touch prisma.user directly for these flows.

const PUBLIC_USER_FIELDS = {
  id: true,
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
      throw Forbidden('Registration is currently closed', { code: 'REGISTRATION_CLOSED' });
    }

    // Surface uniqueness conflicts as 409 with field hints so the UI can
    // mark the offending input. The DB constraint is still authoritative.
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.registrationNo ? [{ registrationNo: data.registrationNo }] : []),
        ],
      },
      select: { email: true, registrationNo: true },
    });
    if (conflict) {
      const field = conflict.email === data.email ? 'email' : 'registrationNo';
      throw Conflict(`A user with this ${field} already exists`, { field });
    }

    return prisma.user.create({
      data: {
        ...data,
        role: 'STUDENT',
        verificationStatus: 'PENDING',
        passwordHash: null,
        // Saved in the same statement as the user: no account without its card.
        ...(idCard && { idCard: { create: idCard } }),
      },
      select: PUBLIC_USER_FIELDS,
    });
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
  async approveStudent(userId, { institutionId } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, verificationStatus: true, fullName: true, email: true, institutionId: true },
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

    return { user: updated, plaintextPassword };
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
