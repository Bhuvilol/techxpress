import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { install, prisma, reset } from './helpers.js';

install();
const { assignSeat, userService } = await import('../../src/services/user.service.js');
const { requireDelivered } = await import('../../src/utils/mail.js');

beforeEach(() => reset());

// A tiny in-memory "User" table with seat numbers, enough for assignSeat.
const table = (rows) => {
  prisma.user.findUnique = mock.fn(async ({ where }) => rows.find((r) => r.id === where.id) ?? null);
  prisma.user.aggregate = mock.fn(async () => ({ _max: { seatNo: Math.max(0, ...rows.map((r) => r.seatNo ?? 0)) || null } }));
  prisma.user.update = mock.fn(async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data));
};

test('the first student gets seat 1, the next gets seat 2', async () => {
  const rows = [{ id: 'a' }, { id: 'b' }];
  table(rows);
  assert.equal(await assignSeat(prisma, 'a'), 1);
  assert.equal(await assignSeat(prisma, 'b'), 2);
});

test('a student who already has a seat keeps it', async () => {
  const rows = [{ id: 'a', seatNo: 5 }, { id: 'b', seatNo: 9 }];
  table(rows);
  assert.equal(await assignSeat(prisma, 'a'), 5);
  assert.equal(prisma.user.update.mock.callCount(), 0);
});

test('seats are never reused: the next seat follows the highest one', async () => {
  const rows = [{ id: 'a', seatNo: 1 }, { id: 'c', seatNo: 7 }, { id: 'n' }];
  table(rows);
  assert.equal(await assignSeat(prisma, 'n'), 8);
});

test('assignment takes the lock before reading the highest seat', async () => {
  const order = [];
  table([{ id: 'a' }]);
  prisma.$executeRaw = mock.fn(async () => { order.push('lock'); return 1; });
  const agg = prisma.user.aggregate;
  prisma.user.aggregate = mock.fn(async (...args) => { order.push('max'); return agg(...args); });
  await assignSeat(prisma, 'a');
  assert.deepEqual(order, ['lock', 'max']);
});

test('approving a student gives them a seat inside the approval transaction', async () => {
  const rows = [{ id: 'cstudent000000000000000a', role: 'STUDENT', verificationStatus: 'PENDING', fullName: 'Asha', email: 'a@c.edu', institutionId: null, registrationNo: null, institution: null }];
  table(rows);
  let inTx = false;
  prisma.$transaction = mock.fn(async (fn) => { inTx = true; try { return await fn(prisma); } finally { inTx = false; } });
  const seatWrites = [];
  const update = prisma.user.update;
  prisma.user.update = mock.fn(async (args) => { if ('seatNo' in args.data) seatWrites.push(inTx); return update(args); });
  await userService.approveStudent(rows[0].id, { deliver: async () => requireDelivered({ delivered: true }) });
  assert.deepEqual(seatWrites, [true]);
  assert.equal(rows[0].seatNo, 1);
});
