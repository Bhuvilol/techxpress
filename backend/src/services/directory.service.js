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
      groupBy = 'institution',
      perCollegeLimit = 6,
    } = query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
    const collegeLimit = Math.min(50, Math.max(1, parseInt(perCollegeLimit, 10) || 6));

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

    // Shared global lookups & stats
    const [
      domains,
      allInstitutions,
      globalTotal,
      inTeamTotal,
      globalInstitutionGroups,
    ] = await Promise.all([
      prisma.domain.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.institution.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.user.count({ where: { role: 'STUDENT', verificationStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { role: 'STUDENT', verificationStatus: 'VERIFIED', membership: { isNot: null } } }),
      prisma.user.groupBy({
        by: ['institutionId'],
        where: { role: 'STUDENT', verificationStatus: 'VERIFIED' },
        _count: { id: true },
      }),
    ]);

    const domainById = new Map(domains.map((d) => [d.id, d]));
    const instById = new Map(allInstitutions.map((i) => [i.id, i.name]));

    const mapStudent = ({ preferredDomains, membership, ...s }) => ({
      ...s,
      preferredDomains: (preferredDomains ?? [])
        .map((id) => domainById.get(id))
        .filter(Boolean),
      team: membership?.team
        ? { ...membership.team, role: membership.role }
        : null,
    });

    const colleges = globalInstitutionGroups
      .map((g) => ({
        id: g.institutionId ?? '_none',
        name: g.institutionId ? (instById.get(g.institutionId) ?? 'Unknown') : 'No college',
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const stats = {
      total: globalTotal,
      colleges: globalInstitutionGroups.filter((g) => g.institutionId !== null).length,
      inTeam: inTeamTotal,
      looking: Math.max(0, globalTotal - inTeamTotal),
    };

    // Determine pagination mode:
    // When grouped by college and "All colleges" is selected (no specific institutionId),
    // each college displays 6 students per page.
    const isPerCollege = (groupBy === 'institution' && !institutionId);

    if (isPerCollege) {
      const skip = (parsedPage - 1) * collegeLimit;

      // Group matching counts per institution under current filters
      const matchingGroups = await prisma.user.groupBy({
        by: ['institutionId'],
        where,
        _count: { id: true },
      });

      const matchingMap = new Map(matchingGroups.map((g) => [g.institutionId, g._count.id]));
      const totalMatching = matchingGroups.reduce((acc, g) => acc + g._count.id, 0);
      const maxCollegeTotal = Math.max(0, ...matchingGroups.map((g) => g._count.id));
      const totalPages = Math.max(1, Math.ceil(maxCollegeTotal / collegeLimit));

      // Build target list of colleges (including No college if applicable)
      const collegeTargets = allInstitutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
      }));

      if (matchingMap.has(null) || globalInstitutionGroups.some((g) => g.institutionId === null)) {
        collegeTargets.push({ id: '_none', name: 'No college' });
      }

      // Query students only for colleges that have students on this page (total > skip)
      const collegesWithStudents = collegeTargets.filter((c) => {
        const count = matchingMap.get(c.id === '_none' ? null : c.id) || 0;
        return count > skip;
      });

      const studentResults = await Promise.all(
        collegesWithStudents.map((c) =>
          prisma.user.findMany({
            where: {
              ...where,
              institutionId: c.id === '_none' ? null : c.id,
            },
            select: DIRECTORY_FIELDS,
            orderBy: { fullName: 'asc' },
            skip,
            take: collegeLimit,
          }),
        ),
      );

      const studentsByCollegeId = new Map();
      collegesWithStudents.forEach((c, idx) => {
        studentsByCollegeId.set(c.id, studentResults[idx].map(mapStudent));
      });

      // Build complete college groups with state flags
      const collegeGroups = collegeTargets.map((c) => {
        const collegeTotal = matchingMap.get(c.id === '_none' ? null : c.id) || 0;
        const studentsForCollege = studentsByCollegeId.get(c.id) || [];
        const lastPage = Math.max(1, Math.ceil(collegeTotal / collegeLimit));

        return {
          id: c.id,
          name: c.name,
          total: collegeTotal,
          shownCount: studentsForCollege.length,
          page: parsedPage,
          limit: collegeLimit,
          allShownEarlier: collegeTotal > 0 && skip >= collegeTotal,
          lastPage,
          students: studentsForCollege,
        };
      });

      // Sort college groups:
      // 1. Colleges with students on this page first (sorted by count descending, then name)
      // 2. Colleges where all students have already been shown on earlier pages
      // 3. Colleges with 0 matching students
      collegeGroups.sort((a, b) => {
        const aActive = a.students.length > 0;
        const bActive = b.students.length > 0;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        if (a.allShownEarlier && !b.allShownEarlier) return -1;
        if (!a.allShownEarlier && b.allShownEarlier) return 1;

        return b.total - a.total || a.name.localeCompare(b.name);
      });

      const allFetchedStudents = collegeGroups.flatMap((g) => g.students);

      return {
        mode: 'perCollege',
        count: allFetchedStudents.length,
        total: totalMatching,
        page: parsedPage,
        limit: collegeLimit,
        totalPages,
        students: allFetchedStudents,
        collegeGroups,
        stats,
        colleges,
        domains,
      };
    }

    // Standard flat pagination (single college or domain view)
    const skip = (parsedPage - 1) * parsedLimit;
    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: DIRECTORY_FIELDS,
        orderBy: { fullName: 'asc' },
        skip,
        take: parsedLimit,
      }),
    ]);

    const mappedStudents = students.map(mapStudent);
    const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

    return {
      mode: 'standard',
      count: mappedStudents.length,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      students: mappedStudents,
      stats,
      colleges,
      domains,
    };
  },
};
