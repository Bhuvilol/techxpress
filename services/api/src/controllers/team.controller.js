import { teamService } from '../services/team.service.js';
import { membershipChangeService } from '../services/membershipChange.service.js';
import { rulesService, loadMemberProfiles } from '../services/rules.service.js';
import { auditService } from '../services/audit.service.js';
import { prisma } from '../config/db.js';
import { NotFound } from '../utils/errors.js';

export const create = async (req, res) => {
  const team = await teamService.create({
    name:     req.body.name,
    domainId: req.body.domainId,
    psId:     req.body.psId,
    leaderId: req.user.id,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_CREATED',
    entityType: 'Team', entityId: team.id, details: { name: team.name },
  });
  res.status(201).json({ team });
};

// Member emails are visible to the team's own members and admins only.
// Everyone else (other students browsing teams, jury) gets the same team
// without email addresses.
const canSeeTeamContacts = (team, user) =>
  user.role === 'ADMIN' || team.members.some((m) => m.user.id === user.id);

const withoutContacts = (team) => ({
  ...team,
  leader: team.leader && { id: team.leader.id, fullName: team.leader.fullName },
  members: team.members.map(({ user: { email: _email, ...user }, ...m }) => ({ ...m, user })),
});

export const get = async (req, res) => {
  const team = await teamService.get(req.params.id);
  if (!team) throw NotFound('Team not found');
  res.json({ team: canSeeTeamContacts(team, req.user) ? team : withoutContacts(team) });
};

export const mine = async (req, res) => {
  const team = await teamService.getForUser(req.user.id);
  res.json({ team: team ?? null });
};

export const list = async (req, res) => {
  const result = await teamService.list(req.query);
  if (Array.isArray(result)) {
    return res.json({ count: result.length, total: result.length, teams: result });
  }
  res.json({
    count: result.teams.length,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    teams: result.teams,
  });
};

export const listJoinable = async (req, res) => {
  const teams = await teamService.listJoinable(req.query);
  res.json({ count: teams.length, teams });
};

export const listAvailableMembers = async (req, res) => {
  const { users, total, matchCount, offset, hasMore } = await teamService.listAvailableMembers({
    actorId: req.user.id,
    search: req.query.search,
    matchActorDomains: req.query.matchActorDomains,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  res.json({ count: users.length, users, total, matchCount, offset, hasMore });
};

// Live preview of qualification for a single team. Read-only, no status flip.
export const evaluate = async (req, res) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, status: true, adminOverride: true,
      memberCount: true, femaleCount: true, domainExpertCount: true,
    },
  });
  if (!team) throw NotFound('Team not found');
  const rules = await rulesService.get();
  const memberProfiles = await loadMemberProfiles(prisma, team.id);
  const { isQualified, issues } = rulesService.evaluateTeam({ ...team, memberProfiles }, rules);
  res.json({ team, isQualified, issues, rules });
};

export const transferLeadership = async (req, res) => {
  const team = await teamService.transferLeadership({
    teamId:      req.params.id,
    actorId:     req.user.id,
    newLeaderId: req.body.newLeaderId,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'transferLeadership', from: req.user.id, to: req.body.newLeaderId },
  });
  res.json({ team });
};

export const changeProblemStatement = async (req, res) => {
  const team = await teamService.changeProblemStatement({
    teamId:  req.params.id,
    actorId: req.user.id,
    psId:    req.body.psId,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: team.id,
    details: { op: 'changeProblemStatement', psId: req.body.psId },
  });
  res.json({ team });
};

export const finalize = async (req, res) => {
  const team = await teamService.finalize({
    teamId:  req.params.id,
    actorId: req.user.id,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FINALIZED',
    entityType: 'Team', entityId: team.id,
  });
  res.json({ team });
};

export const disband = async (req, res) => {
  const result = await membershipChangeService.requestDisband({
    teamId: req.params.id,
    leaderId: req.user.id,
  });
  auditService.record({
    actorId: req.user.id, action: 'TEAM_FORCE_MODIFIED',
    entityType: 'Team', entityId: req.params.id,
    details: { op: result.disbanded ? 'disbandByLeader' : 'requestDisbandByLeader' },
  });
  res.json(result);
};

// GET /api/teams/invite/:ref (public). What an invite link shows before the
// visitor logs in: no member names or contacts, only the leader's first name.
export const invitePreview = async (req, res) => {
  const team = await prisma.team.findUnique({
    where: { publicId: req.params.ref },
    select: {
      id: true, publicId: true, name: true, status: true, memberCount: true,
      domain: { select: { name: true } },
      problemStatement: { select: { title: true } },
      leader: { select: { fullName: true } },
    },
  });
  if (!team) throw NotFound('This invite link is not valid. Ask the team for a new one.');
  const rules = await rulesService.get();
  const { leader, ...rest } = team;
  res.json({
    team: {
      ...rest,
      leaderFirstName: leader?.fullName?.split(/\s+/)[0] ?? null,
      maxTeamSize: rules.maxTeamSize,
      acceptingRequests: !['FINALIZED', 'DISQUALIFIED'].includes(team.status) && team.memberCount < rules.maxTeamSize,
    },
  });
};
