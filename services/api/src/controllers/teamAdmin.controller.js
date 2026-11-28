import { teamAdminService } from '../services/teamAdmin.service.js';
import { auditService } from '../services/audit.service.js';
import { emitLeaderboardChanged } from '../realtime/emitter.js';
import { prisma } from '../config/db.js';
import { NotFound } from '../utils/errors.js';
import { ADMIN_MEMBER_FIELDS } from '../utils/adminMemberFields.js';

export const teamMembers = async (req, res) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, status: true, leaderId: true,
      domain: { select: { id: true, name: true } },
      problemStatement: { select: { id: true, title: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        select: { role: true, joinedAt: true, user: { select: ADMIN_MEMBER_FIELDS } },
      },
    },
  });
  if (!team) throw NotFound('Team not found');
  const members = team.members.map(({ user: { idCard, ...user }, ...m }) => ({
    ...m,
    isLeader: user.id === team.leaderId,
    user: { ...user, hasIdCard: Boolean(idCard) },
  }));
  res.json({ team: { ...team, members } });
};

export const forceAddMember = async (req, res) => {
  const team = await teamAdminService.forceAddMember({
    teamId: req.params.id,
    userId: req.body.userId,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'forceAddMember', userId: req.body.userId },
  });
  res.json({ team });
};

export const setLeader = async (req, res) => {
  const team = await teamAdminService.setLeader({
    teamId: req.params.id,
    newLeaderId: req.body.newLeaderId,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'setLeader', newLeaderId: req.body.newLeaderId },
  });
  emitLeaderboardChanged();
  res.json({ team });
};

export const forceRemoveMember = async (req, res) => {
  const team = await teamAdminService.forceRemoveMember({
    teamId: req.params.id,
    userId: req.body.userId,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'forceRemoveMember', userId: req.body.userId },
  });
  res.json({ team });
};

export const disbandTeam = async (req, res) => {
  const result = await teamAdminService.disbandTeam({ teamId: req.params.id });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: req.params.id,
    details: { op: 'disband' },
  });
  emitLeaderboardChanged();
  res.json(result);
};

export const forceFinalize = async (req, res) => {
  const { team, unmetAtOverride } = await teamAdminService.forceFinalize({ teamId: req.params.id });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FINALIZED',
    entityType: 'Team', entityId: team.id,
    details: { override: true, unmetAtOverride },
  });
  res.json({ team, unmetAtOverride });
};

export const setStatus = async (req, res) => {
  const team = await teamAdminService.setStatus({
    teamId: req.params.id,
    status: req.body.status,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'setStatus', status: req.body.status },
  });
  emitLeaderboardChanged();
  res.json({ team });
};

export const recount = async (req, res) => {
  const counters = await teamAdminService.recount({ teamId: req.params.id });
  res.json({ counters });
};

export const disqualify = async (req, res) => {
  const team = await teamAdminService.disqualify({ teamId: req.params.id });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'disqualify', status: 'DISQUALIFIED' },
  });
  emitLeaderboardChanged();
  res.json({ team });
};

export const reinstate = async (req, res) => {
  const team = await teamAdminService.reinstate({ teamId: req.params.id });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'reinstate', status: team.status },
  });
  emitLeaderboardChanged();
  res.json({ team });
};
