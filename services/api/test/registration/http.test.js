import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import express from 'express';
import { install, prisma, reset, validBody } from './helpers.js';

install();
const { rulesService } = await import('../../src/services/rules.service.js');
const { default: registrationRoutes } = await import('../../src/routes/registration.js');
const { errorHandler, notFoundHandler } = await import('../../src/middleware/error.js');

// Same mounting as the real app for this route: the router parses its own body.
const app = express();
app.use('/api/registration', registrationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/registration`;
});
after(() => new Promise((r) => server.close(r)));

beforeEach(() => {
  reset();
  rulesService.invalidate();
});

const post = (body, raw = false) => fetch(base, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: raw ? body : JSON.stringify(body),
});
const json = async (res) => ({ status: res.status, body: await res.json() });

test('GET /status reports whether registration is open', async () => {
  assert.deepEqual(await json(await fetch(`${base}/status`)), { status: 200, body: { open: true } });
  prisma.hackathonRules.findUnique = mock.fn(async () => ({ id: 'rules', registrationOpen: false }));
  rulesService.invalidate();
  assert.deepEqual(await json(await fetch(`${base}/status`)), { status: 200, body: { open: false } });
});

test('a valid registration is accepted with 202 and no password in the response', async () => {
  const { status, body } = await json(await post(validBody()));
  assert.equal(status, 202);
  assert.deepEqual(Object.keys(body.user).sort(), ['email', 'fullName', 'id']);
  assert.equal(body.user.email, 'asha.kumar@college.edu');
  assert.equal(prisma.user.create.mock.callCount(), 1);
});

test('the honeypot filled in: 202 with no user and nothing written', async () => {
  const { status, body } = await json(await post(validBody({ website: 'http://spam.example' })));
  assert.equal(status, 202);
  assert.equal(body.user, null);
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('the honeypot is still a bot trap when the rest of the form is invalid', async () => {
  // Checked before validation, so a bot gets the same fake success.
  const { status, body } = await json(await post({ website: 'x' }));
  assert.equal(status, 202);
  assert.equal(body.user, null);
});

test('a honeypot with only spaces is treated as empty (a real user)', async () => {
  const { status, body } = await json(await post(validBody({ website: '   ' })));
  assert.equal(status, 202);
  assert.ok(body.user);
  assert.equal(prisma.user.create.mock.callCount(), 1);
});

test('an invalid body is 400 with the field errors under details.body', async () => {
  const { status, body } = await json(await post(validBody({ bio: '', gender: 'X' })));
  assert.equal(status, 400);
  assert.equal(body.code, 'VALIDATION_ERROR');
  assert.ok(body.details.body.bio);
  assert.ok(body.details.body.gender);
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('registration closed is a 403 and nothing is written', async () => {
  prisma.hackathonRules.findUnique = mock.fn(async () => ({ id: 'rules', registrationOpen: false }));
  rulesService.invalidate();
  const { status, body } = await json(await post(validBody()));
  assert.equal(status, 403);
  assert.equal(body.code, 'REGISTRATION_CLOSED');
  assert.equal(prisma.user.create.mock.callCount(), 0);
});

test('a duplicate is a generic 409 with no field name in the response', async () => {
  prisma.user.findFirst = mock.fn(async () => ({ id: 'cexisting000000000000000' }));
  const { status, body } = await json(await post(validBody()));
  assert.equal(status, 409);
  assert.equal(body.code, 'CONFLICT');
  assert.equal(body.details, undefined);
  assert.ok(!/"field"/.test(JSON.stringify(body)));
});

test('a body over 2 MB is 413 PAYLOAD_TOO_LARGE', async () => {
  const huge = validBody({ bio: 'x'.repeat(2.2 * 1024 * 1024) });
  const { status, body } = await json(await post(huge));
  assert.equal(status, 413);
  assert.equal(body.code, 'PAYLOAD_TOO_LARGE');
});

test('malformed JSON is 400 BAD_JSON', async () => {
  const { status, body } = await json(await post('{"fullName":', true));
  assert.equal(status, 400);
  assert.equal(body.code, 'BAD_JSON');
});
