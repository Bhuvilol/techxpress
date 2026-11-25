import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { install, prisma, reset } from '../registration/helpers.js';

install();
const { userService } = await import('../../src/services/user.service.js');
const { requireDelivered } = await import('../../src/utils/mail.js');

const pendingStudent = {
  id: 'cstudent000000000000000a', role: 'STUDENT', verificationStatus: 'PENDING',
  fullName: 'Asha Kumar', email: 'asha@college.edu', institutionId: null, registrationNo: null, institution: null,
};

beforeEach(() => {
  reset();
  prisma.user.findUnique = mock.fn(async () => pendingStudent);
});

test('requireDelivered passes a delivered email through', () => {
  const mail = { delivered: true, id: 'm1' };
  assert.equal(requireDelivered(mail), mail);
});

test('requireDelivered throws MAIL_NOT_SENT with a clear message when the email did not go out', () => {
  assert.throws(() => requireDelivered({ delivered: false, error: 'HTTP 401' }), (err) => {
    assert.equal(err.status, 502);
    assert.equal(err.code, 'MAIL_NOT_SENT');
    assert.match(err.message, /nothing was changed/);
    assert.deepEqual(err.details, { mailError: 'HTTP 401' });
    return true;
  });
});

test('a server with mail switched off says so in the error', () => {
  assert.throws(() => requireDelivered({ delivered: false, reason: 'not-configured' }), (err) => {
    assert.deepEqual(err.details, { mailError: 'not-configured' });
    return true;
  });
});

test('approve: when the email is not sent, the approval fails and no password is returned', async () => {
  await assert.rejects(
    userService.approveStudent(pendingStudent.id, {
      deliver: ({ user, plaintextPassword }) => requireDelivered({ delivered: false, error: 'timeout' }),
    }),
    (err) => err.code === 'MAIL_NOT_SENT',
  );
});

test('approve: the password is saved inside the transaction that also sends the email', async () => {
  let inTransaction = false;
  prisma.$transaction = mock.fn(async (fn) => { inTransaction = true; try { return await fn(prisma); } finally { inTransaction = false; } });
  prisma.user.update = mock.fn(async ({ where, data }) => {
    assert.equal(inTransaction, true, 'the write must be inside the transaction');
    return { id: where.id, email: pendingStudent.email, fullName: pendingStudent.fullName, ...data };
  });
  let sentInside = false;
  const result = await userService.approveStudent(pendingStudent.id, {
    deliver: async ({ user, plaintextPassword }) => {
      sentInside = inTransaction;
      assert.match(plaintextPassword, /^\d{6}$/);
      return requireDelivered({ delivered: true });
    },
  });
  assert.equal(sentInside, true, 'the email is sent inside the transaction');
  assert.equal(result.user.verificationStatus, 'VERIFIED');
  assert.equal('plaintextPassword' in result, false, 'the password is never returned to the caller');
});

test('approve refuses to run without a delivery step (no silent unsent approvals)', async () => {
  await assert.rejects(userService.approveStudent(pendingStudent.id), TypeError);
});
