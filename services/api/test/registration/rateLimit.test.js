import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { install, reset } from './helpers.js';

install();
const { default: registrationRoutes } = await import('../../src/routes/registration.js');
const { errorHandler } = await import('../../src/middleware/error.js');

const app = express();
app.use('/api/registration', registrationRoutes);
app.use(errorHandler);

let server;
let url;
before(async () => {
  reset();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  url = `http://127.0.0.1:${server.address().port}/api/registration`;
});
after(() => new Promise((r) => server.close(r)));

// Every attempt counts, valid or not, so an empty body is enough here.
const attempt = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

test('the 61st registration attempt from one IP in the window is refused with 429', async () => {
  for (let i = 1; i <= 60; i += 1) {
    const res = await attempt();
    assert.equal(res.status, 400, `attempt ${i} should reach validation`);
  }
  const res = await attempt();
  const body = await res.json();
  assert.equal(res.status, 429);
  assert.equal(body.code, 'RATE_LIMITED');
});
