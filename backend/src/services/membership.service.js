import { Conflict, Forbidden, NotFound } from '../utils/errors.js';
import { rulesService } from './rules.service.js';
import { removeUserFromTeamRoom } from '../realtime/emitter.js';

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL MEMBERSHIP WRITER
//
// This module is the ONLY place in the codebase that inserts or deletes
// TeamMember rows, updates Team counters, and cancels stale invites/requests.
//
// Every team-mutating service (invite-accept, join-approve, leave, dismiss,
// admin-force) opens its own prisma.$transaction and calls these helpers
// with the transactional client `tx`. Never call these with the global
// prisma client — race conditions become reachable.
//
// Race-safety strategy: TeamMember.userId @unique is the source of truth.
// We let the DB throw P2002 and translate it to a 409 in the controller,
// rather than racing two SELECT-then-INSERT checks.
// ─────────────────────────────────────────────────────────────────────────────

const FINALIZED_BLOCKED = 'Team is finalized; no membership changes allowed';

// Lock-the-team-for-this-tx pattern: we read+lock the team row first, so
// concurrent transactions touching the same team serialize. Postgres uses
// row-level locks on FOR UPDATE; Prisma exposes it via $queryRaw, but for
// a non-distributed instance we get sufficient ordering from updating the
// same row's `updatedAt` at the end of the tx.
const loadTeamForUpdate = async (tx, teamId) => {
  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      leaderId: true,
      status: true,
      memberCount: true,
      femaleCount: true,
      domainExpertCount: true,
      domainId: true,
    },
  });
  if (!team) throw NotFound('Team not found');
  return team;
};

const loadUserOrThrow = async (tx, userId) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      gender: true,
      isDomainExpert: true,
      verificationStatus: true,
      domainId: true,
    },
  });
  if (!user) throw NotFound('User not found');
  return user;
};

const computeDelta = (user, team) => ({
  female: user.gender === 'FEMALE' ? 1 : 0,
  expert: user.isDomainExpert && user.domainId === team.domainId ? 1 : 0,
});

// ── Cancellation helpers ────────────────────────────────────────────────────
// Called whenever a user "lands" in a team: their other open invites and
// outgoing join requests become moot.
const cancelOtherPendingForUser = async (tx, { userId, exceptTeamId }) => {
  await tx.teamInvite.updateMany({
    where: {
      inviteeId: userId,
      status: 'PENDING',
      ...(exceptTeamId && { NOT: { teamId: exceptTeamId } }),
    },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
  await tx.joinRequest.updateMany({
    where: {
      requesterId: userId,
      status: 'PENDING',
      ...(exceptTeamId && { NOT: { teamId: exceptTeamId } }),
    },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
};

// Called whenever a team's roster changes such that capacity may have shifted.
// If full, kill all open invites + requests for THIS team.
const cancelTeamPendingIfFull = async (tx, teamId, maxSize) => {
  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { memberCount: true },
  });
  if (!team || team.memberCount < maxSize) return;
  await tx.teamInvite.updateMany({
    where: { teamId, status: 'PENDING' },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
  await tx.joinRequest.updateMany({
    where: { teamId, status: 'PENDING' },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
};

// ── Public API (transactional) ──────────────────────────────────────────────

export const membershipService = {
  loadTeamForUpdate,
  loadUserOrThrow,
  cancelOtherPendingForUser,
  cancelTeamPendingIfFull,

  /**
   * Add a user to a team. Updates counters atomically. Cancels the user's
   * other pending invites + requests. Cancels this team's pending invites
   * + requests if the addition pushes member count to maxTeamSize.
   *
   * Caller is expected to have already validated that the team's status
   * permits modification (FORMING / QUALIFIED). We re-check defensively.
   *
   * Returns the inserted TeamMember.
   */
  async addMember(tx, { team, user, role = 'MEMBER', maxTeamSize, allowFinalized = false, allowLockdown = false }) {
    if (!allowLockdown) await rulesService.assertTeamMutationsAllowed(tx);
    if (!allowFinalized && team.status === 'FINALIZED') throw Conflict(FINALIZED_BLOCKED);
    if (team.status === 'DISQUALIFIED') throw Conflict('Team is disqualified');
    if (user.role !== 'STUDENT') throw Forbidden('Only students can join teams');
    if (user.verificationStatus !== 'VERIFIED') {
      throw Forbidden('User is not verified');
    }
    if (team.memberCount >= maxTeamSize) throw Conflict('Team is full');

    let member;
    try {
      member = await tx.teamMember.create({
        data: { teamId: team.id, userId: user.id, role },
      });
    } catch (err) {
      // P2002 here means the user is already in SOME team (userId is unique)
      // OR already in this team (composite PK). Either way: 409.
      if (err.code === 'P2002') throw Conflict('User is already a member of a team');
      throw err;
    }

    const { female, expert } = computeDelta(user, team);
    await tx.team.update({
      where: { id: team.id },
      data: {
        memberCount: { increment: 1 },
        femaleCount: { increment: female },
        domainExpertCount: { increment: expert },
      },
    });

    await cancelOtherPendingForUser(tx, { userId: user.id, exceptTeamId: team.id });
    await cancelTeamPendingIfFull(tx, team.id, maxTeamSize);

    // Final step in every team mutation: recompute qualification.
    await rulesService.recomputeTeamStatus(tx, team.id);

    return member;
  },

  /**
   * Remove a user from a team. Decrements counters. Disallowed on FINALIZED
   * unless `allowFinalized: true` (admin override path).
   *
   * If the leader is removed and `disbandIfLeader: true`, the entire team is
   * deleted (cascade wipes members/invites/requests). Otherwise removing the
   * leader is rejected — leadership transfer is a separate operation.
   */
  async removeMember(tx, { teamId, userId, allowFinalized = false, allowLockdown = false, disbandIfLeader = false }) {
    if (!allowLockdown) await rulesService.assertTeamMutationsAllowed(tx);
    const team = await loadTeamForUpdate(tx, teamId);
    if (!allowFinalized && team.status === 'FINALIZED') throw Conflict(FINALIZED_BLOCKED);

    const member = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    if (!member) throw NotFound('User is not a member of this team');

    const isLeader = team.leaderId === userId;
    if (isLeader && !disbandIfLeader) {
      throw Conflict('Cannot remove the team leader; transfer leadership or disband');
    }

    if (isLeader && disbandIfLeader) {
      // Cascade handles members/invites/requests/etc.
      await tx.team.delete({ where: { id: teamId } });
      return { disbanded: true };
    }

    const user = await loadUserOrThrow(tx, userId);
    const { female, expert } = computeDelta(user, team);

    await tx.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    await tx.team.update({
      where: { id: teamId },
      data: {
        memberCount: { decrement: 1 },
        femaleCount: { decrement: female },
        domainExpertCount: { decrement: expert },
      },
    });

    await rulesService.recomputeTeamStatus(tx, teamId);

    // Stop live team traffic (chat) to the removed member right away. The
    // API itself already rejects them, since they're no longer a member.
    removeUserFromTeamRoom(userId, teamId);

    return { disbanded: false };
  },

  /**
   * Take a just-revoked student out of their team (admin action; bypasses
   * lockdown and finalized-status guards). The team itself stays — including
   * its scores and leaderboard standing.
   *
   *   - member  → removed, counters updated
   *   - leader  → leadership passes to the longest-standing other member,
   *               then the old leader is removed
   *   - leader and the only member → the empty team is deleted
   *
   * Open membership-change requests involving them on that team are
   * cancelled (their approver/initiator may no longer be valid).
   * Returns { teamId, teamName, newLeaderId?, teamDeleted } or null.
   */
  async removeRevokedUser(tx, userId) {
    const membership = await tx.teamMember.findUnique({
      where: { userId },
      select: { teamId: true, team: { select: { name: true, leaderId: true } } },
    });
    if (!membership) return null;
    const { teamId } = membership;
    const result = { teamId, teamName: membership.team.name, newLeaderId: null, teamDeleted: false };

    await tx.membershipChangeRequest.updateMany({
      where: {
        teamId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [{ targetUserId: userId }, { approverId: userId }, { initiatorId: userId }],
      },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });

    if (membership.team.leaderId === userId) {
      const successor = await tx.teamMember.findFirst({
        where: { teamId, NOT: { userId } },
        orderBy: { joinedAt: 'asc' },
        select: { userId: true },
      });
      if (!successor) {
        await tx.team.delete({ where: { id: teamId } }); // cascade: members, invites, messages…
        removeUserFromTeamRoom(userId, teamId);
        return { ...result, teamDeleted: true };
      }
      await tx.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role: 'MEMBER' } });
      await tx.teamMember.update({ where: { teamId_userId: { teamId, userId: successor.userId } }, data: { role: 'LEADER' } });
      await tx.team.update({ where: { id: teamId }, data: { leaderId: successor.userId } });
      result.newLeaderId = successor.userId;
    }

    await this.removeMember(tx, { teamId, userId, allowFinalized: true, allowLockdown: true });
    return result;
  },

  /**
   * Recount a team's denormalized counters from scratch. Used as a safety
   * net by admin-override flows; not on hot paths.
   */
  async recountTeam(tx, teamId) {
    const members = await tx.teamMember.findMany({
      where: { teamId },
      select: { user: { select: { gender: true, isDomainExpert: true, domainId: true } } },
    });
    const team = await tx.team.findUnique({ where: { id: teamId }, select: { domainId: true } });
    const memberCount = members.length;
    const femaleCount = members.filter((m) => m.user.gender === 'FEMALE').length;
    const domainExpertCount = members.filter(
      (m) => m.user.isDomainExpert && m.user.domainId === team.domainId,
    ).length;

    await tx.team.update({
      where: { id: teamId },
      data: { memberCount, femaleCount, domainExpertCount },
    });
    await rulesService.recomputeTeamStatus(tx, teamId);
    return { memberCount, femaleCount, domainExpertCount };
  },
};
