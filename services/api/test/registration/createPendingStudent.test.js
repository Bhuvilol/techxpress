import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { install, prisma, reset, validBody } from './helpers.js';
import { registrationSchema } from '../../src/validators/registration.schema.js';

install();
const { rulesService } = await import('../../src/services/rules.service.js');
const { userService } = await import('../../src/services/user.service.js');

// The service receives what the controller gets: the validated body.
const input = (overrides) => registrationSchema.parse(validBody(overrides));

const expectError = async (promise, status, code) => {
  await assert.rejects(promise, (err) => {
    assert.equal(err.status, status);
    assert.equal(err.code, code);
    return true;
  });
};

beforeEach(() => {
  reset();
  rulesService.invalidate();
});

test('creates a PENDING student with no password and the card in the same write', async () => {
  const user = await userService.createPendingStudent(input());
  assert.equal(prisma.user.create.mock.callCount(), 1);
  const { data } = prisma.user.create.mock.calls[0].arguments[0];
  assert.equal(data.role, 'STUDENT');
  assert.equal(data.verificationStatus, 'PENDING');
  assert.equal(data.passwordHash, null);
  assert.equal(data.registrationNo, '2024PS01');
  assert.equal(data.email, 'asha.kumar@college.edu');
  assert.match(data.publicId, /^TXP-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/, 'every student gets a TXP- id');
  assert.equal(data.idCard.create.mimeType, 'image/jpeg', 'card is created in the same statement');
  assert.equal(user.email, 'asha.kumar@college.edu');
});

test('the nested card is left out when no card is given', async () => {
  const { idCard, ...noCard } = input();
  await userService.createPendingStudent(noCard);
  const { data } = prisma.user.create.mock.calls[0].arguments[0];
  assert.equal('idCard' in data, false);
});

test('registration closed: 403 and nothing is written', async () => {
  prisma.hackathonRules.findUnique = mock.fn(async () => ({ id: 'rules', registrationOpen: false }));
  rulesService.invalidate();
  await expectError(userService.createPendingStudent(input()), 403, 'REGISTRATION_CLOSED');
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('an unknown institution is a 400 and nothing is written', async () => {
  prisma.institution.findUnique = mock.fn(async () => null);
  await expectError(userService.createPendingStudent(input()), 400, 'BAD_REQUEST');
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('an unknown preferred domain is a 400 and nothing is written', async () => {
  // Two distinct domain ids, but only one exists.
  prisma.domain.count = mock.fn(async () => 1);
  const body = input({ preferredDomains: ['cdomain00000000000000000a', 'cdomain00000000000000000b'] });
  await expectError(userService.createPendingStudent(body), 400, 'BAD_REQUEST');
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('domain ids are de-duplicated before the lookup', async () => {
  // Primary and preferred repeat the same id: one id is looked up, not two.
  await userService.createPendingStudent(input());
  const { where } = prisma.domain.count.mock.calls[0].arguments[0];
  assert.deepEqual(where.id.in, ['cdomain00000000000000000a']);
});

test('a duplicate email or registration number is a generic 409 with no field name', async () => {
  prisma.user.findFirst = mock.fn(async () => ({ id: 'cexisting000000000000000' }));
  await assert.rejects(userService.createPendingStudent(input()), (err) => {
    assert.equal(err.status, 409);
    assert.equal(err.code, 'CONFLICT');
    assert.match(err.message, /already registered/);
    assert.equal(err.details, undefined, 'no details, so no field name leaks');
    return true;
  });
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('the duplicate check looks at both email and registration number', async () => {
  await userService.createPendingStudent(input());
  const { where } = prisma.user.findFirst.mock.calls[0].arguments[0];
  assert.deepEqual(where.OR, [
    { email: 'asha.kumar@college.edu' },
    { registrationNo: '2024PS01' },
  ]);
});

test('a race that hits the unique index gets the same duplicate answer', async () => {
  prisma.user.create = mock.fn(async () => { throw Object.assign(new Error('unique'), { code: 'P2002' }); });
  await assert.rejects(userService.createPendingStudent(input()), (err) => {
    assert.equal(err.status, 409);
    assert.equal(err.code, 'CONFLICT');
    assert.match(err.message, /already registered/);
    return true;
  });
});

test('other database errors are passed through unchanged', async () => {
  const boom = new Error('connection lost');
  prisma.user.create = mock.fn(async () => { throw boom; });
  await assert.rejects(userService.createPendingStudent(input()), (err) => err === boom);
});

test('without a registration number only the email is checked for duplicates', async () => {
  const { registrationNo, ...rest } = input();
  await userService.createPendingStudent(rest);
  const { where } = prisma.user.findFirst.mock.calls[0].arguments[0];
  assert.deepEqual(where.OR, [{ email: 'asha.kumar@college.edu' }]);
});
