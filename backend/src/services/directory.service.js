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
  async list(query = {}) {
    const {
      page,
      limit = 24,
      search,
      institutionId,
      domainId,
      teamFilter = 'all',
    } = query;

    const isPaginated = page !== undefined;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
    const skip = (parsedPage - 1) * parsedLimit;

    // Base filter: only verified students are listed in the directory
    const where = {
      role: 'STUDENT',
      verificationStatus: 'VERIFIED',
    };

    if (institutionId) {
      if (institutionId === '_none') {
        where.institutionId = null;
      } else {
        where.institutionId = institutionId;
      }
    }

    if (domainId) {
      where.OR = [
        { domainId },
        { preferredDomains: { has: domainId } },
      ];
    }

    if (teamFilter === 'looking') {
      where.membership = null;
    } else if (teamFilter === 'inteam') {
      where.membership = { isNot: null };
    }

    if (search && search.trim()) {
      const needle = search.trim();
      const searchConditions = [
        { fullName: { contains: needle, mode: 'insensitive' } },
        { preferredTeamRole: { contains: needle, mode: 'insensitive' } },
        { technicalSkills: { contains: needle, mode: 'insensitive' } },
        { degree: { contains: needle, mode: 'insensitive' } },
        { yearSemester: { contains: needle, mode: 'insensitive' } },
        { institution: { name: { contains: needle, mode: 'insensitive' } } },
        { domain: { name: { contains: needle, mode: 'insensitive' } } },
        { membership: { team: { name: { contains: needle, mode: 'insensitive' } } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [
      total,
      students,
      domains,
      globalTotal,
      inTeamTotal,
      institutionGroups,
      allInstitutions,
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: DIRECTORY_FIELDS,
        orderBy: { fullName: 'asc' },
        ...(isPaginated ? { skip, take: parsedLimit } : {}),
      }),
      prisma.domain.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.user.count({ where: { role: 'STUDENT', verificationStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { role: 'STUDENT', verificationStatus: 'VERIFIED', membership: { isNot: null } } }),
      prisma.user.groupBy({
        by: ['institutionId'],
        where: { role: 'STUDENT', verificationStatus: 'VERIFIED' },
        _count: { id: true },
      }),
      prisma.institution.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);

    const domainById = new Map(domains.map((d) => [d.id, d]));
    const instById = new Map(allInstitutions.map((i) => [i.id, i.name]));

    const mappedStudents = students.map(({ preferredDomains, membership, ...s }) => ({
      ...s,
      preferredDomains: (preferredDomains ?? [])
        .map((id) => domainById.get(id))
        .filter(Boolean),
      team: membership?.team
        ? { ...membership.team, role: membership.role }
        : null,
    }));

    // Build college segmentation breakdown
    const colleges = institutionGroups
      .map((g) => ({
        id: g.institutionId ?? '_none',
        name: g.institutionId ? (instById.get(g.institutionId) ?? 'Unknown') : 'No college',
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const stats = {
      total: globalTotal,
      colleges: institutionGroups.filter((g) => g.institutionId !== null).length,
      inTeam: inTeamTotal,
      looking: Math.max(0, globalTotal - inTeamTotal),
    };

    const totalPages = isPaginated ? Math.max(1, Math.ceil(total / parsedLimit)) : 1;

    return {
      count: mappedStudents.length,
      total,
      page: isPaginated ? parsedPage : 1,
      limit: isPaginated ? parsedLimit : mappedStudents.length,
      totalPages,
      students: mappedStudents,
      stats,
      colleges,
      domains,
    };
  },
};
