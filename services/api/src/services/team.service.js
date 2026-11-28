import { prisma } from '../config/db.js';
import { Conflict, Forbidden, NotFound, BadRequest } from '../utils/errors.js';
import { membershipService } from './membership.service.js';
import { membershipChangeService } from './membershipChange.service.js';
import { rulesService, loadMemberProfiles } from './rules.service.js';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { generatePublicId, TEAM_PUBLIC_PREFIX } from '../utils/publicId.js';

const TEAM_DETAIL_INCLUDE = {
  domain: { select: { id: true, name: true } },
  problemStatement: { select: { id: true, title: true } },
  leader: { select: { id: true, fullName: true, email: true } },
  members: {
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true, fullName: true, email: true, gender: true,
          isDomainExpert: true, profilePicUrl: true,
          domain: { select: { id: true, name: true } },
        },
      },
    },
  },
};

const TEAM_LIST_FIELDS = {
  id: true, publicId: true, name: true, status: true,
  memberCount: true, femaleCount: true, domainExpertCount: true,
  createdAt: true, finalizedAt: true, adminOverride: true,
  domain: { select: { id: true, name: true } },
  problemStatement: { select: { id: true, title: true } },
  leader: { select: { id: true, fullName: true } },
};

// Explore shows verified students to other students so they can pick
// teammates. Explicit allow-list: NO email, phone, Discord, gender, resume or
// long free-text answers. registrationNo is selected only so an exact
// "invite by registration number" search can be confirmed; it is stripped
// from every result that wasn't matched by that exact number.
const EXPLORE_MEMBER_FIELDS = {
  id: true,
  fullName: true,
  registrationNo: true,
  createdAt: true,
  preferredDomains: true,
  linkedinUrl: true,
  githubUrl: true,
  portfolioUrl: true,
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
  institution: { select: { id: true, name: true } },
  domain: { select: { id: true, name: true } },
  membership: {
    select: {
      teamId: true,
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  },
};

const uniqueIds = (values) => [...new Set(values.filter(Boolean))];

const buildActorDomainSet = (actor) =>
  uniqueIds([actor?.domainId, ...(actor?.preferredDomains ?? [])]);

const scoreMemberMatch = ({ actorDomainIds, actorInstitutionId, member }) => {
  const sharedPreferredDomainIds = (member.preferredDomains ?? []).filter((id) => actorDomainIds.includes(id));
  const primaryDomainMatched = member.domain?.id ? actorDomainIds.includes(member.domain.id) : false;
  const score = [
    primaryDomainMatched ? 3 : 0,
    sharedPreferredDomainIds.length * 2,
    actorInstitutionId && member.institution?.id === actorInstitutionId ? 1 : 0,
  ].reduce((sum, part) => sum + part, 0);

  return { score, sharedPreferredDomainIds, primaryDomainMatched };
};

export const teamService = {
  /**
   * Create a team. The creator becomes its LEADER and first member.
   * Refuses if the user is already in any team (DB-enforced via
   * Team.leaderId @unique AND TeamMember.userId @unique).
   */
  async create({ name, domainId, psId, leaderId }) {
    return prisma.$transaction(async (tx) => {
      await rulesService.assertTeamMutationsAllowed(tx);
      const leader = await membershipService.loadUserOrThrow(tx, leaderId);
      if (leader.role !== 'STUDENT') throw Forbidden('Only students can create teams');
      if (leader.verificationStatus !== 'VERIFIED') {
        throw Forbidden('Account is not verified');
      }

      const rules = await rulesService.get(tx);
      if (!rules.teamFormationOpen) throw Forbidden('Team formation is currently closed');

      // Domain & PS sanity checks (cheap, useful errors).
      const domain = await tx.domain.findUnique({ where: { id: domainId } });
      if (!domain) throw BadRequest('Invalid domain');
      if (psId) {
        const ps = await tx.problemStatement.findUnique({
          where: { id: psId },
          select: { id: true, domainId: true },
        });
        if (!ps) throw BadRequest('Invalid problem statement');
        if (ps.domainId !== domainId) {
          throw BadRequest('Problem statement does not belong to chosen domain');
        }
      }

      let team;
      try {
        team = await tx.team.create({
          data: {
            publicId: generatePublicId(TEAM_PUBLIC_PREFIX),
            name,
            domainId,
            psId,
            leaderId,
            status: 'FORMING',
            memberCount: 0,
            femaleCount: 0,
            domainExpertCount: 0,
          },
          select: { id: true, publicId: true, name: true, status: true, leaderId: true, domainId: true,
                    memberCount: true, femaleCount: true, domainExpertCount: true },
        });
      } catch (err) {
        if (err.code === 'P2002') {
          const target = String(err.meta?.target ?? '');
          if (target.includes('leaderId')) throw Conflict('You already lead a team');
          throw Conflict('Team name already taken', { field: 'name' });
        }
        throw err;
      }

      await membershipService.addMember(tx, {
        team,
        user: leader,
        role: 'LEADER',
        maxTeamSize: rules.maxTeamSize,
      });

      return tx.team.findUnique({ where: { id: team.id }, include: TEAM_DETAIL_INCLUDE });
    });
  },

  get(idOrName) {
    return prisma.team.findFirst({
      where: { OR: [{ id: idOrName }, { name: idOrName }] },
      include: TEAM_DETAIL_INCLUDE,
    });
  },

  getForUser(userId) {
    return prisma.team.findFirst({
      where: {
        OR: [
          { leaderId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: TEAM_DETAIL_INCLUDE,
    });
  },

  async list({ status, domainId, psId, search, page, limit } = {}) {
    const where = {
      ...(status && { status }),
      ...(domainId && { domainId }),
      ...(psId && { psId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { leader: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    if (!page) {
      return prisma.team.findMany({
        where,
        select: TEAM_LIST_FIELDS,
        orderBy: { createdAt: 'desc' },
      });
    }

    const take = limit ? Math.min(Math.max(limit, 1), 100) : 20;
    const skip = (Math.max(page, 1) - 1) * take;

    const [total, teams] = await prisma.$transaction([
      prisma.team.count({ where }),
      prisma.team.findMany({
        where,
        select: TEAM_LIST_FIELDS,
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
      teams,
    };
  },

  // Teams a user could join right now: same PS (if user has one), still
  // FORMING, not full, not finalized. Annotate with what they're missing.
  async listJoinable({ psId } = {}) {
    const rules = await rulesService.get();
    const teams = await prisma.team.findMany({
      where: {
        status: 'FORMING',
        ...(psId && { psId }),
        memberCount: { lt: rules.maxTeamSize },
      },
      select: TEAM_LIST_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    return teams.map((t) => ({
      ...t,
      missing: rulesService.unmetReasons(t, rules),
    }));
  },

  /**
   * Explore list of verified students, best domain matches first.
   *
   * Two phases so a page costs ~20 profiles, not the whole roster:
   *   1. a light query (ids + the fields the ranking needs) for everyone
   *      matching the filters; rank in memory — same order as before;
   *   2. full profile fields for just the requested slice.
   *
   * Without `limit` the whole ranked list is returned (invite lookup).
   * Returns { users, total, matchCount, offset, hasMore }.
   */
  async listAvailableMembers({ actorId, search, matchActorDomains = false, limit, offset = 0 } = {}) {
    const actor = actorId
      ? await prisma.user.findUnique({
          where: { id: actorId },
          select: {
            id: true,
            institutionId: true,
            domainId: true,
            preferredDomains: true,
          },
        })
      : null;

    const actorDomainIds = buildActorDomainSet(actor);
    const term = search?.trim() || '';
    const regNeedle = term ? normalizeRegistrationNo(term) : '';

    // Search runs server-side now that the client only holds one page.
    // Domain names are matched to ids first so preferred domains (stored as
    // an id array) are searchable too.
    const searchDomainIds = term
      ? (await prisma.domain.findMany({
          where: { name: { contains: term, mode: 'insensitive' } },
          select: { id: true },
        })).map((d) => d.id)
      : [];

    const filters = [
      { role: 'STUDENT' },
      // Only real participants — never pending / rejected / revoked accounts.
      { verificationStatus: 'VERIFIED' },
      ...(actorId ? [{ NOT: { id: actorId } }] : []),
      ...(term ? [{
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { preferredTeamRole: { contains: term, mode: 'insensitive' } },
          { technicalSkills: { contains: term, mode: 'insensitive' } },
          { institution: { name: { contains: term, mode: 'insensitive' } } },
          ...(searchDomainIds.length ? [
            { domainId: { in: searchDomainIds } },
            { preferredDomains: { hasSome: searchDomainIds } },
          ] : []),
          // Registration numbers match only when typed in full, so the list
          // can't be used to enumerate them.
          { registrationNo: { equals: regNeedle } },
        ],
      }] : []),
      ...(matchActorDomains && actorDomainIds.length ? [{
        OR: [
          { domainId: { in: actorDomainIds } },
          { preferredDomains: { hasSome: actorDomainIds } },
        ],
      }] : []),
    ];

    // Phase 1 — rank everyone on the light fields only.
    const candidates = await prisma.user.findMany({
      where: { AND: filters },
      select: { id: true, createdAt: true, domainId: true, preferredDomains: true, institutionId: true },
    });

    const ranked = candidates
      .map((c) => {
        const { score, sharedPreferredDomainIds, primaryDomainMatched } = scoreMemberMatch({
          actorDomainIds,
          actorInstitutionId: actor?.institutionId,
          member: { preferredDomains: c.preferredDomains, domain: c.domainId && { id: c.domainId }, institution: c.institutionId && { id: c.institutionId } },
        });
        return { id: c.id, createdAt: c.createdAt, score, shared: sharedPreferredDomainIds.length, isMatch: primaryDomainMatched || sharedPreferredDomainIds.length > 0 };
      })
      .sort((a, b) => (
        b.score - a.score
        || b.shared - a.shared
        || b.createdAt.getTime() - a.createdAt.getTime()
        || (a.id < b.id ? -1 : 1) // stable order across pages
      ));

    const total = ranked.length;
    const matchCount = ranked.filter((r) => r.isMatch).length;
    const start = Math.min(Number(offset) || 0, total);
    const slice = limit ? ranked.slice(start, start + Number(limit)) : ranked.slice(start);
    const hasMore = start + slice.length < total;

    // Phase 2 — full profile fields for just this page, kept in ranked order.
    const rows = slice.length
      ? await prisma.user.findMany({
          where: { id: { in: slice.map((r) => r.id) } },
          select: EXPLORE_MEMBER_FIELDS,
        })
      : [];
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const users = slice.map((r) => rowById.get(r.id)).filter(Boolean);

    const allDomainIds = uniqueIds([
      ...users.flatMap((member) => member.preferredDomains ?? []),
      ...users.map((member) => member.domain?.id),
      ...actorDomainIds,
    ]);
    const domains = allDomainIds.length
      ? await prisma.domain.findMany({
          where: { id: { in: allDomainIds } },
          select: { id: true, name: true },
        })
      : [];
    const domainMap = new Map(domains.map((domain) => [domain.id, domain]));

    const decorated = users
      .map(({ registrationNo, ...member }) => {
        const { score, sharedPreferredDomainIds, primaryDomainMatched } = scoreMemberMatch({
          actorDomainIds,
          actorInstitutionId: actor?.institutionId,
          member,
        });
        return {
          ...member,
          // Echo the registration number back only to someone who already
          // typed it exactly (the invite-by-registration-number flow).
          ...(regNeedle && registrationNo === regNeedle ? { registrationNo } : {}),
          preferredDomainDetails: (member.preferredDomains ?? [])
            .map((domainId) => domainMap.get(domainId))
            .filter(Boolean),
          sharedPreferredDomains: sharedPreferredDomainIds
            .map((domainId) => domainMap.get(domainId))
            .filter(Boolean),
          primaryDomainMatched,
          matchScore: score,
        };
      });

    return { users: decorated, total, matchCount, offset: start, hasMore };
  },

  /**
   * Leader-initiated finalization. Refuses if rules unmet (admin override
   * is a separate path). Atomic: re-reads team within tx to avoid TOCTOU.
   */
  // The leader changes the team's problem statement while the team is still
  // forming. The team's domain follows the problem statement's domain.
  // psId null clears it.
  async changeProblemStatement({ teamId, actorId, psId }) {
    return prisma.$transaction(async (tx) => {
      await rulesService.assertTeamMutationsAllowed(tx);
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      if (team.leaderId !== actorId) throw Forbidden('Only the team leader can change the problem statement');
      if (team.status !== 'FORMING') throw Conflict('The problem statement can only be changed while the team is forming');

      let data = { psId: null };
      if (psId) {
        const ps = await tx.problemStatement.findUnique({ where: { id: psId }, select: { id: true, domainId: true } });
        if (!ps) throw BadRequest('Invalid problem statement');
        data = { psId: ps.id, domainId: ps.domainId };
      }
      return tx.team.update({ where: { id: teamId }, data, include: TEAM_DETAIL_INCLUDE });
    });
  },

  async finalize({ teamId, actorId }) {
    return prisma.$transaction(async (tx) => {
      await rulesService.assertTeamMutationsAllowed(tx);
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      await membershipChangeService.assertNoActiveTeamDisband(tx, teamId);
      if (team.leaderId !== actorId) throw Forbidden('Only the team leader can finalize');
      if (team.status === 'FINALIZED') throw Conflict('Team is already finalized');
      if (team.status === 'DISQUALIFIED') throw Conflict('Team is disqualified');

      const rules = await rulesService.get(tx);
      const memberProfiles = await loadMemberProfiles(tx, teamId);
      const unmet = rulesService.unmetReasons({ ...team, memberProfiles }, rules);
      if (unmet.length) {
        throw Conflict('Team does not meet qualification rules', { unmet });
      }

      // Cancel any still-open invites/requests for this team — finalization
      // closes the door. Use the same cancel-on-full helper logic by
      // running both updateMany calls explicitly (team isn't necessarily
      // at maxSize, just locked).
      await tx.teamInvite.updateMany({
        where: { teamId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      await tx.joinRequest.updateMany({
        where: { teamId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      return tx.team.update({
        where: { id: teamId },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
        include: TEAM_DETAIL_INCLUDE,
      });
    });
  },

  async disband({ teamId, actorId }) {
    return membershipChangeService.requestDisband({
      teamId,
      leaderId: actorId,
    });
  },

  /**
   * Transfer leadership to an existing team member. Atomic:
   *   - re-read team inside tx (TOCTOU-safe)
   *   - actor must be current leader
   *   - new leader must already be a member of this team
   *   - team must not be FINALIZED / DISQUALIFIED
   *   - flip Team.leaderId, swap MemberRole on both rows
   * Does NOT change qualification — counts and rules are unaffected by
   * which member holds the leader title, so no rules.recompute needed.
   */
  async transferLeadership({ teamId, actorId, newLeaderId }) {
    if (actorId === newLeaderId) throw BadRequest('You are already the leader');

    return prisma.$transaction(async (tx) => {
      await rulesService.assertTeamMutationsAllowed(tx);
      await membershipChangeService.assertNoActiveTeamDisband(tx, teamId);
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, leaderId: true, status: true },
      });
      if (!team) throw NotFound('Team not found');
      if (team.leaderId !== actorId) throw Forbidden('Only the current leader can transfer leadership');
      if (team.status === 'FINALIZED') throw Conflict('Team is finalized; leadership cannot change');
      if (team.status === 'DISQUALIFIED') throw Conflict('Team is disqualified');

      const newLeaderMembership = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: newLeaderId } },
        select: { role: true },
      });
      if (!newLeaderMembership) throw BadRequest('New leader must already be a member of this team');

      // Three writes, all in this txn:
      //   1. Demote current leader's TeamMember row to MEMBER
      //   2. Promote new leader's TeamMember row to LEADER
      //   3. Update Team.leaderId
      // Team.leaderId @unique enforces single-leader globally; since both
      // ids belong to this team and the old/new leader swap is symmetric,
      // there's no constraint conflict.
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: actorId } },
        data: { role: 'MEMBER' },
      });
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: newLeaderId } },
        data: { role: 'LEADER' },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { leaderId: newLeaderId },
      });

      return tx.team.findUnique({ where: { id: teamId }, include: TEAM_DETAIL_INCLUDE });
    });
  },

  /**
   * Throws unless `user` may see a team's internal queues (pending invites,
   * join requests): members of that team, or an admin. 404 when the team
   * doesn't exist, 403 otherwise.
   */
  async assertCanViewTeamInternals(teamId, user) {
    if (user.role === 'ADMIN') return;
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) throw NotFound('Team not found');
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      select: { userId: true },
    });
    if (!member) throw Forbidden('Only members of this team can view this');
  },

  detailInclude: TEAM_DETAIL_INCLUDE,
};
