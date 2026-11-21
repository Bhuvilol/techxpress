import { prisma } from '../config/db.js';
import { Conflict, BadRequest, NotFound } from '../utils/errors.js';
import { membershipService } from './membership.service.js';
import { rulesService } from './rules.service.js';
import { teamService } from './team.service.js';
import { leaderboardService } from './leaderboard.service.js';

// Admin "force resolve" override paths. These bypass:
//   - team.status guards (can edit FINALIZED teams when needed)
//   - rules guards (can finalize unqualified teams)
//
// They DO NOT bypass:
//   - DB unique constraints (TeamMember.userId @unique still applies)
//   - User existence / verification status
//
// Every action sets team.adminOverride = true so the audit trail / UI
// can flag teams that were touched outside the normal flow.

export const teamAdminService = {
  async forceAddMember({ teamId, userId }) {
    return prisma.$transaction(async (tx) => {
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      const user = await membershipService.loadUserOrThrow(tx, userId);
      const rules = await rulesService.get(tx);

      // Bend maxTeamSize: admin override may exceed soft cap, but we still
      // refuse to insert a duplicate user via the unique constraint.
      // Counter still bumps; the team will fail rules.qualifies() afterwards
      // if size exceeds maxTeamSize, and the admin will see that in the UI.
      // Members added by admin are always inserted as MEMBER. To change a
      // team's leader, use setLeader.
      await membershipService.addMember(tx, {
        team,
        user,
        role: 'MEMBER',
        maxTeamSize: Math.max(rules.maxTeamSize, team.memberCount + 1),
        allowFinalized: true,
        allowLockdown: true,
      });

      await tx.team.update({
        where: { id: teamId },
        data: { adminOverride: true },
      });

      return tx.team.findUnique({ where: { id: teamId }, include: teamService.detailInclude });
    });
  },

  async setLeader({ teamId, newLeaderId }) {
    return prisma.$transaction(async (tx) => {
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      if (team.leaderId === newLeaderId) {
        throw BadRequest('User is already the leader of this team');
      }

      const newLeaderMembership = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: newLeaderId } },
        select: { role: true },
      });
      if (!newLeaderMembership) {
        throw BadRequest('New leader must already be a member of this team');
      }

      // Demote current leader to MEMBER, promote new leader to LEADER, update Team.leaderId
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: team.leaderId } },
        data: { role: 'MEMBER' },
      });
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: newLeaderId } },
        data: { role: 'LEADER' },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { leaderId: newLeaderId, adminOverride: true },
      });

      return tx.team.findUnique({ where: { id: teamId }, include: teamService.detailInclude });
    });
  },

  async forceRemoveMember({ teamId, userId }) {
    return prisma.$transaction(async (tx) => {
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      if (team.leaderId === userId) {
        throw BadRequest('Use disbandTeam to remove the leader');
      }
      await membershipService.removeMember(tx, { teamId, userId, allowFinalized: true, allowLockdown: true });
      await tx.team.update({ where: { id: teamId }, data: { adminOverride: true } });
      return tx.team.findUnique({ where: { id: teamId }, include: teamService.detailInclude });
    });
  },

  async disbandTeam({ teamId }) {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, leaderId: true },
      });
      if (!team) throw NotFound('Team not found');
      // Cascade wipes members/invites/requests/etc.
      await tx.team.delete({ where: { id: teamId } });
      return { disbanded: true, teamId };
    }).then(async (result) => {
      await leaderboardService.rerank(); // close the rank gap left by the deleted team
      return result;
    });
  },

  /**
   * Take a team out of the competition. Scores are KEPT (so reinstating
   * restores the team's standing); the team simply drops off the leaderboard
   * and awards, and juries stop seeing it. Open invites/requests are closed.
   */
  async disqualify({ teamId }) {
    const team = await prisma.$transaction(async (tx) => {
      const current = await tx.team.findUnique({ where: { id: teamId }, select: { id: true, status: true } });
      if (!current) throw NotFound('Team not found');
      if (current.status === 'DISQUALIFIED') throw Conflict('Team is already disqualified');
      const now = new Date();
      await tx.teamInvite.updateMany({ where: { teamId, status: 'PENDING' }, data: { status: 'CANCELLED', respondedAt: now } });
      await tx.joinRequest.updateMany({ where: { teamId, status: 'PENDING' }, data: { status: 'CANCELLED', respondedAt: now } });
      return tx.team.update({
        where: { id: teamId },
        data: { status: 'DISQUALIFIED', adminOverride: true },
        include: teamService.detailInclude,
      });
    });
    await leaderboardService.rerank();
    return team;
  },

  /**
   * Undo a disqualification. A team that had been finalized goes straight
   * back to FINALIZED (and reappears on the leaderboard with its scores);
   * otherwise it returns to FORMING and the rules engine re-evaluates it.
   */
  async reinstate({ teamId }) {
    const team = await prisma.$transaction(async (tx) => {
      const current = await tx.team.findUnique({ where: { id: teamId }, select: { id: true, status: true, finalizedAt: true } });
      if (!current) throw NotFound('Team not found');
      if (current.status !== 'DISQUALIFIED') throw Conflict('Only disqualified teams can be reinstated');
      if (current.finalizedAt) {
        await tx.team.update({ where: { id: teamId }, data: { status: 'FINALIZED' } });
      } else {
        await tx.team.update({ where: { id: teamId }, data: { status: 'FORMING', adminOverride: false } });
        await rulesService.recomputeTeamStatus(tx, teamId);
      }
      return tx.team.findUnique({ where: { id: teamId }, include: teamService.detailInclude });
    });
    await leaderboardService.rerank();
    return team;
  },

  /**
   * Force a team into FINALIZED regardless of rule satisfaction. Records
   * the override flag and a snapshot of which rules were unmet at the
   * moment of override (kept in adminOverride flag + audit).
   */
  async forceFinalize({ teamId }) {
    return prisma.$transaction(async (tx) => {
      const team = await membershipService.loadTeamForUpdate(tx, teamId);
      if (team.status === 'FINALIZED') throw Conflict('Team is already finalized');
      if (team.status === 'DISQUALIFIED') throw Conflict('Team is disqualified');

      const rules = await rulesService.get(tx);
      const unmet = rulesService.unmetReasons(team, rules);

      // Cancel still-open invites + join requests (same as leader finalize).
      await tx.teamInvite.updateMany({
        where: { teamId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      await tx.joinRequest.updateMany({
        where: { teamId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      const updated = await tx.team.update({
        where: { id: teamId },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
          adminOverride: true,
        },
        include: teamService.detailInclude,
      });

      // Return unmet so the controller can audit-log it.
      return { team: updated, unmetAtOverride: unmet };
    });
  },

  async setStatus({ teamId, status }) {
    if (!['FORMING', 'QUALIFIED', 'FINALIZED', 'DISQUALIFIED'].includes(status)) {
      throw BadRequest('Invalid status');
    }
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        status,
        adminOverride: true,
        ...(status === 'FINALIZED' && { finalizedAt: new Date() }),
      },
      include: teamService.detailInclude,
    });
    await leaderboardService.rerank();
    return team;
  },

  async recount({ teamId }) {
    return prisma.$transaction(async (tx) => {
      const counters = await membershipService.recountTeam(tx, teamId);
      // recountTeam already calls rulesService.recomputeTeamStatus inside
      // the same tx. Read the post-update team for the response.
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, status: true, adminOverride: true, ...Object.fromEntries(Object.keys(counters).map((k) => [k, true])) },
      });
      return { team, counters };
    });
  },
};
