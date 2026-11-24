import { prisma } from '../config/db.js';

// Staff accounts (jury, coordinators, admins) with their readable login code.
// This is the ONLY place that reads StaffCredential; keep it that way.

const STAFF_ROLES = ['ADMIN', 'JURY', 'COORDINATOR'];
const ROLE_ORDER = { ADMIN: 0, COORDINATOR: 1, JURY: 2 };

export const staffService = {
  async list() {
    const users = await prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        verificationStatus: true,
        lastLoginAt: true,
        institution: { select: { id: true, name: true } },
        staffCredential: { select: { password: true, updatedAt: true } },
      },
      orderBy: [{ fullName: 'asc' }],
    });

    return users
      .map(({ staffCredential, ...user }) => ({
        ...user,
        password: staffCredential?.password ?? null,
        passwordSetAt: staffCredential?.updatedAt ?? null,
      }))
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  },
};
