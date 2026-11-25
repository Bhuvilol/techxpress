import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { checkPnr } from './station.js';

const body = { registrationNo: '2024PS01', email: 'a@b.in' };
const reply = (value) => async () => value;
const fail = (init) => async () => { throw new ApiError({ message: 'x', ...init }); };

describe('checkPnr', () => {
  it('passes CONFIRMED tickets through', async () => {
    const ticket = { pnr: 'TXP-1', name: 'A' };
    expect(await checkPnr(body, reply({ status: 'CONFIRMED', ticket }))).toEqual({ kind: 'result', status: 'CONFIRMED', ticket });
  });
  it('drops tickets for other statuses', async () => {
    expect(await checkPnr(body, reply({ status: 'WAITLISTED', ticket: {} }))).toEqual({ kind: 'result', status: 'WAITLISTED', ticket: null });
  });
  it('404 means the endpoint is not deployed yet', async () => {
    expect((await checkPnr(body, fail({ status: 404, code: 'HTTP_ERROR' }))).kind).toBe('soon');
  });
  it('flattens validation errors per field', async () => {
    const r = await checkPnr(body, fail({ status: 400, code: 'VALIDATION_ERROR', details: { body: { email: ['Bad email'] } } }));
    expect(r).toMatchObject({ kind: 'invalid', fields: { email: 'Bad email' } });
  });
  it('recognises rate limiting', async () => {
    expect((await checkPnr(body, fail({ status: 429, code: 'RATE_LIMITED' }))).kind).toBe('limited');
  });
  it('turns network failures into a friendly error', async () => {
    const r = await checkPnr(body, async () => { throw new TypeError('Failed to fetch'); });
    expect(r.kind).toBe('error');
    expect(r.message).toMatch(/connection/);
  });
  it('an unexpected 200 body (SPA fallback HTML) is treated as not deployed', async () => {
    expect((await checkPnr(body, reply(null))).kind).toBe('soon');
  });
});
