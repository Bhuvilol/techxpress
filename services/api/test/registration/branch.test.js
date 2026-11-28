import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { install, prisma, reset, validBody } from './helpers.js';
import { registrationSchema } from '../../src/validators/registration.schema.js';

install();
const { rulesService } = await import('../../src/services/rules.service.js');
const { userService } = await import('../../src/services/user.service.js');
const { updateBranchSchema } = await import('../../src/validators/students.schema.js');

const input = (overrides) => registrationSchema.parse(validBody(overrides));
const asIter = () => {
  prisma.institution.findUnique = mock.fn(async () => ({ id: 'cinstitution0000000000000a', name: 'ITER | SOA' }));
};

beforeEach(() => {
  reset();
  rulesService.invalidate();
});

test('the registration schema accepts only a branch from the list', () => {
  assert.equal(registrationSchema.safeParse(validBody({ branch: 'CSE AIML' })).success, true);
  assert.equal(registrationSchema.safeParse(validBody({ branch: 'EEE' })).success, true);
  assert.equal(registrationSchema.safeParse(validBody({ branch: 'Civil' })).success, true);
  assert.equal(registrationSchema.safeParse(validBody({ branch: 'Chemical' })).success, false);
  assert.equal(registrationSchema.safeParse(validBody({ branch: '' })).success, true, 'empty means not given');
});

test('ITER | SOA without a branch is a 400 and nothing is written', async () => {
  asIter();
  await assert.rejects(userService.createPendingStudent(input()), (err) => err.status === 400);
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('ITER | SOA with a branch saves it', async () => {
  asIter();
  await userService.createPendingStudent(input({ branch: 'CSE DS' }));
  assert.equal(prisma.user.create.mock.calls[0].arguments[0].data.branch, 'CSE DS');
});

test('any other institution drops the branch', async () => {
  prisma.institution.findUnique = mock.fn(async () => ({ id: 'cinstitution0000000000000a', name: 'Other College' }));
  await userService.createPendingStudent(input({ branch: 'ECE' }));
  assert.equal('branch' in prisma.user.create.mock.calls[0].arguments[0].data, false);
});

test('branch update: schema needs a listed branch', () => {
  assert.equal(updateBranchSchema.safeParse({ branch: 'Mech' }).success, true);
  assert.equal(updateBranchSchema.safeParse({ branch: 'mech' }).success, false);
  assert.equal(updateBranchSchema.safeParse({}).success, false);
});

test('an ITER | SOA student saves their branch', async () => {
  prisma.user.findUnique = mock.fn(async () => ({ institution: { name: 'ITER | SOA' } }));
  prisma.domain.findMany = mock.fn(async () => []);
  prisma.teamMember = { findUnique: mock.fn(async () => null) }; // not in a team
  await userService.updateBranch('cstudent000000000000000a', 'EE');
  assert.deepEqual(prisma.user.update.mock.calls[0].arguments[0].data, { branch: 'EE' });
});

// ── Cross-branch rule: an all-ITER team needs one member from another branch ─
const RULES = { minTeamSize: 1, maxTeamSize: 6, minFemaleMembers: 0, minDomainExperts: 0 };
const team = (memberProfiles) => ({ memberCount: memberProfiles.length, femaleCount: 0, domainExpertCount: 0, memberProfiles });
const iter = (branch) => ({ institution: 'ITER | SOA', branch });
const codes = (t) => rulesService.evaluateTeam(t, RULES).issues.map((i) => i.code);

test('an all-ITER team from one branch needs a cross-branch member', () => {
  const { isQualified, issues } = rulesService.evaluateTeam(team([iter('CSE Core'), iter('CSE Core'), iter('CSE Core')]), RULES);
  assert.equal(isQualified, false);
  assert.deepEqual(issues, [{ code: 'CROSS_BRANCH_REQUIRED', need: 1, have: 0 }]);
});

test('one member from another branch is enough', () => {
  assert.deepEqual(codes(team([iter('CSE Core'), iter('CSE Core'), iter('EE')])), []);
});

test('a member from another institution lifts the cross-branch rule', () => {
  assert.deepEqual(codes(team([iter('CSE Core'), iter('CSE Core'), { institution: 'Other College', branch: null }])), []);
});

test('a member with no branch set does not count as a different branch', () => {
  assert.deepEqual(codes(team([iter('CSE Core'), iter(null)])), ['CROSS_BRANCH_REQUIRED']);
});

test('without member profiles the rule is not applied (count-only callers)', () => {
  assert.deepEqual(codes({ memberCount: 3, femaleCount: 0, domainExpertCount: 0 }), []);
});

test('changing branch re-checks the team the student is in', async () => {
  prisma.user.findUnique = mock.fn(async () => ({ institution: { name: 'ITER | SOA' } }));
  prisma.domain.findMany = mock.fn(async () => []);
  prisma.teamMember = {
    findUnique: mock.fn(async () => ({ teamId: 'cteam000000000000000000a' })),
    findMany: mock.fn(async () => [{ user: { branch: 'EE', institution: { name: 'ITER | SOA' } } }]),
  };
  prisma.team = { ...prisma.team, findUnique: mock.fn(async () => ({ id: 'cteam000000000000000000a', status: 'FORMING', adminOverride: false, memberCount: 1, femaleCount: 0, domainExpertCount: 0 })), update: mock.fn(async () => ({})) };
  prisma.hackathonRules.findUnique = mock.fn(async () => ({ id: 'rules', ...RULES }));
  await userService.updateBranch('cstudent000000000000000a', 'EE');
  assert.equal(prisma.teamMember.findMany.mock.callCount(), 1);
  assert.equal(prisma.team.findUnique.mock.callCount(), 1);
});

test('a student of another institution cannot set a branch', async () => {
  prisma.user.findUnique = mock.fn(async () => ({ institution: { name: 'Other College' } }));
  await assert.rejects(userService.updateBranch('cstudent000000000000000a', 'EE'), (err) => err.status === 400);
  assert.equal(prisma.user.update.mock.callCount(), 0);
});
