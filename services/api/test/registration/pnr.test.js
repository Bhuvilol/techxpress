import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import express from 'express';
import { install, prisma, reset } from './helpers.js';

install();
const { default: registrationRoutes } = await import('../../src/routes/registration.js');
const { errorHandler, notFoundHandler } = await import('../../src/middleware/error.js');


const app = express();
app.use('/api/registration', registrationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let url;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  url = `http://127.0.0.1:${server.address().port}/api/registration/pnr`;
});
after(() => new Promise((r) => server.close(r)));
beforeEach(() => reset());

// Each test uses its own registration number, so the per-number limiter
// (10 per window) never trips by accident.
let seq = 0;
const nextRegNo = () => `2024PNR${String((seq += 1)).padStart(3, '0')}`;

const student = (overrides = {}) => ({
  id: 'cuserpnr0000000000000000a',
  role: 'STUDENT',
  email: 'asha.kumar@college.edu',
  verificationStatus: 'VERIFIED',
  fullName: 'Asha Kumar',
  publicId: 'TXP-7K3M-9QWA',
  seatNo: 73,
  institution: { name: 'ITER | SOA' },
  domain: { name: 'Artificial Intelligence' },
  ...overrides,
});

const lookup = async (body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

const withUser = (user) => {
  prisma.user.findUnique = mock.fn(async () => user);
};

test('a confirmed student gets CONFIRMED and their ticket, and nothing private', async () => {
  withUser(student());
  const res = await lookup({ registrationNo: nextRegNo(), email: 'Asha.Kumar@College.edu' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.body.status, 'CONFIRMED');
  const { ticket } = res.body;
  assert.equal(ticket.pnr, 'TXP-7K3M-9QWA');
  assert.equal(ticket.name, 'Asha Kumar');
  assert.equal(ticket.institution, 'ITER | SOA');
  assert.equal(ticket.domain, 'Artificial Intelligence');
  assert.equal(ticket.train, '12026 TECHXPRESS');
  assert.equal(ticket.date, '2026-12-04');
  assert.deepEqual({ coach: ticket.coach, berth: ticket.berth, berthType: ticket.berthType }, { coach: 'TX-02', berth: '1', berthType: 'LB' });
  const text = JSON.stringify(res.body);
  for (const secret of ['asha.kumar@college.edu', 'cuserpnr0000000000000000a', 'STUDENT', 'email', 'registrationNo']) {
    assert.ok(!text.includes(secret), `response must not contain ${secret}`);
  }
});

test('the lookup uses the canonical registration number', async () => {
  withUser(student());
  await lookup({ registrationNo: ' 2024 pnr x01 ', email: 'asha.kumar@college.edu' });
  assert.deepEqual(prisma.user.findUnique.mock.calls[0].arguments[0].where, { registrationNo: '2024PNRX01' });
});

test('each account status maps to its railway status, without a ticket', async () => {
  const cases = { PENDING: 'WAITLISTED', REJECTED: 'NOT_CONFIRMED', REVOKED: 'CANCELLED' };
  for (const [verificationStatus, expected] of Object.entries(cases)) {
    withUser(student({ verificationStatus }));
    const res = await lookup({ registrationNo: nextRegNo(), email: 'asha.kumar@college.edu' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: expected });
  }
});

test('unknown number, wrong email and staff accounts all give the same answer', async () => {
  const answers = [];
  withUser(null);
  answers.push((await lookup({ registrationNo: nextRegNo(), email: 'asha.kumar@college.edu' })).body);
  withUser(student());
  answers.push((await lookup({ registrationNo: nextRegNo(), email: 'someone.else@college.edu' })).body);
  withUser(student({ role: 'ADMIN' }));
  answers.push((await lookup({ registrationNo: nextRegNo(), email: 'asha.kumar@college.edu' })).body);
  for (const body of answers) assert.deepEqual(body, { status: 'NO_RESERVATION' });
});

test('invalid input is a 400 with field errors', async () => {
  const res = await lookup({ registrationNo: '', email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION_ERROR');
  assert.ok(res.body.details.body.registrationNo);
  assert.ok(res.body.details.body.email);
});

test('the 11th lookup for one registration number in the window is refused with 429', async () => {
  withUser(null);
  const regNo = nextRegNo();
  for (let i = 1; i <= 10; i += 1) {
    const res = await lookup({ registrationNo: regNo, email: `guess${i}@college.edu` });
    assert.equal(res.status, 200, `lookup ${i} should be answered`);
  }
  // Spacing and case don't create a fresh bucket.
  const res = await lookup({ registrationNo: regNo.toLowerCase().replace('PNR', ' pnr '), email: 'guess11@college.edu' });
  assert.equal(res.status, 429);
  assert.equal(res.body.code, 'RATE_LIMITED');
});
