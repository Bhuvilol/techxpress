import { prisma } from '../config/db.js';

// Participant directory: every VERIFIED student, visible to any logged-in user.
//
// Privacy: this is an explicit allow-list of profile fields. Contact details
// (email, phone, Discord), gender, registration number and free-text essays
// are deliberately NOT exposed — students connect through the invite /
// join-request flow instead.

const DIRECTORY_FIELDS = {
  id: true,
  fullName: true,
  degree: true,
  yearSemester: true,
  preferredTeamRole: true,
  contributionAreas: true,
  technicalSkills: true,
  preferredDomains: true,
  isDomainExpert: true,
  institution: { select: { id: true, name: true } },
  domain: { select: { id: true, name: true } },
  membership: {
    select: {
      role: true,
      team: { select: { id: true, name: true, status: true } },
    },
  },
};

export const directoryService = {
  async list() {
    const [students, domains] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT', verificationStatus: 'VERIFIED' },
        select: DIRECTORY_FIELDS,
        orderBy: { fullName: 'asc' },
      }),
      prisma.domain.findMany({ select: { id: true, name: true } }),
    ]);

    const domainById = new Map(domains.map((d) => [d.id, d]));

    return students.map(({ preferredDomains, membership, ...s }) => ({
      ...s,
      preferredDomains: (preferredDomains ?? [])
        .map((id) => domainById.get(id))
        .filter(Boolean),
      team: membership?.team
        ? { ...membership.team, role: membership.role }
        : null,
    }));
  },
};
