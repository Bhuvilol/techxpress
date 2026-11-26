import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { install, prisma, reset } from '../registration/helpers.js';

install();
const { userService } = await import('../../src/services/user.service.js');
const { updateDomainsSchema } = await import('../../src/validators/students.schema.js');
const { changeProblemStatementSchema } = await import('../../src/validators/team.schema.js');

const D = ['cdomain00000000000000000a', 'cdomain00000000000000000b', 'cdomain00000000000000000c', 'cdomain00000000000000000d'];
beforeEach(() => reset());

// ── students change their domains ────────────────────────────────────────

test('domain update needs exactly 4 different domains', () => {
  assert.equal(updateDomainsSchema.safeParse({ preferredDomains: D }).success, true);
  assert.equal(updateDomainsSchema.safeParse({ preferredDomains: D.slice(0, 3) }).success, false);
  assert.equal(updateDomainsSchema.safeParse({ preferredDomains: [...D, D[0]] }).success, false);
  assert.equal(updateDomainsSchema.safeParse({ preferredDomains: [D[0], D[0], D[1], D[2]] }).success, false);
  assert.equal(updateDomainsSchema.safeParse({}).success, false);
});

test('a student saves 4 domains; the first becomes the main domain', async () => {
  prisma.domain.findMany = mock.fn(async () => D.map((id) => ({ id, name: id.slice(-1) })));
  const user = await userService.updateDomains('cstudent000000000000000a', D);
  const { data } = prisma.user.update.mock.calls[0].arguments[0];
  assert.deepEqual(data, { preferredDomains: D, domainId: D[0] });
  assert.deepEqual(user.preferredDomainDetails.map((d) => d.id), D);
});

test('a domain that no longer exists is refused and nothing is saved', async () => {
  prisma.domain.count = mock.fn(async () => 3);
  await assert.rejects(userService.updateDomains('cstudent000000000000000a', D), (err) => err.status === 400);
  assert.equal(prisma.user.update.mock.callCount(), 0);
});

// ── leaders change the problem statement ─────────────────────────────────

const { teamService } = await import('../../src/services/team.service.js');
const TEAM = 'cteam0000000000000000000a';
const LEADER = 'cleader00000000000000000a';
const PS = 'cps000000000000000000000a';

const setup = ({ status = 'FORMING', leaderId = LEADER, ps = { id: PS, domainId: D[2] } } = {}) => {
  prisma.hackathonRules.findUnique = mock.fn(async () => ({ id: 'rules', teamMutationsLocked: false, registrationOpen: true }));
  prisma.roundState = { findUnique: mock.fn(async () => null), findFirst: mock.fn(async () => null) };
  prisma.team = {
    findUnique: mock.fn(async () => ({ id: TEAM, leaderId, status, memberCount: 1 })),
    update: mock.fn(async ({ data }) => ({ id: TEAM, ...data })),
  };
  prisma.problemStatement = { findUnique: mock.fn(async () => ps) };
  prisma.$queryRaw = mock.fn(async () => []);
  prisma.$executeRaw = mock.fn(async () => 1);
};

test('problem statement body: an id, or null to clear', () => {
  assert.equal(changeProblemStatementSchema.safeParse({ psId: PS }).success, true);
  assert.equal(changeProblemStatementSchema.safeParse({ psId: null }).success, true);
  assert.equal(changeProblemStatementSchema.safeParse({ psId: 'x' }).success, false);
});

test('the leader changes the problem statement; the team domain follows it', async () => {
  setup();
  await teamService.changeProblemStatement({ teamId: TEAM, actorId: LEADER, psId: PS });
  assert.deepEqual(prisma.team.update.mock.calls[0].arguments[0].data, { psId: PS, domainId: D[2] });
});

test('the leader can clear the problem statement', async () => {
  setup();
  await teamService.changeProblemStatement({ teamId: TEAM, actorId: LEADER, psId: null });
  assert.deepEqual(prisma.team.update.mock.calls[0].arguments[0].data, { psId: null });
});

test('only the leader may change it', async () => {
  setup({ leaderId: 'csomeoneelse000000000000a' });
  await assert.rejects(teamService.changeProblemStatement({ teamId: TEAM, actorId: LEADER, psId: PS }), (err) => err.status === 403);
  assert.equal(prisma.team.update.mock.callCount(), 0);
});

test('a finalized team cannot change it', async () => {
  setup({ status: 'FINALIZED' });
  await assert.rejects(teamService.changeProblemStatement({ teamId: TEAM, actorId: LEADER, psId: PS }), (err) => err.status === 409);
});

test('an unknown problem statement is refused', async () => {
  setup({ ps: null });
  await assert.rejects(teamService.changeProblemStatement({ teamId: TEAM, actorId: LEADER, psId: PS }), (err) => err.status === 400);
});
