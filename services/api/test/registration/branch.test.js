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
  assert.equal(registrationSchema.safeParse(validBody({ branch: 'Civil' })).success, false);
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
  await userService.updateBranch('cstudent000000000000000a', 'EE');
  assert.deepEqual(prisma.user.update.mock.calls[0].arguments[0].data, { branch: 'EE' });
});

test('a student of another institution cannot set a branch', async () => {
  prisma.user.findUnique = mock.fn(async () => ({ institution: { name: 'Other College' } }));
  await assert.rejects(userService.updateBranch('cstudent000000000000000a', 'EE'), (err) => err.status === 400);
  assert.equal(prisma.user.update.mock.callCount(), 0);
});
