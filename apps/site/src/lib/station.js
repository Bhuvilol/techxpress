// Station-wide API calls and preferences used by several UI pieces.
import { api } from './api.js';

// ── Registration status ───────────────────────────────────────────────────
// GET /api/registration/status -> { open }. Fetched once per page load and
// shared. Resolves true / false, or null when the API can't be reached (no
// backend in preview, network down): callers fall back to the dates.
let statusPromise = null;
export const fetchRegistrationOpen = () => {
  if (!statusPromise) {
    statusPromise = api
      .get('/api/registration/status')
      .then((res) => (typeof res?.open === 'boolean' ? res.open : null))
      .catch(() => null);
  }
  return statusPromise;
};
// Lets the booking counter correct the shared value after a 403 REGISTRATION_CLOSED.
export const markRegistrationClosed = () => {
  statusPromise = Promise.resolve(false);
};

// ── PNR enquiry ───────────────────────────────────────────────────────────
// POST /api/registration/pnr. Returns one of:
//   { kind: 'result', status, ticket? }
//   { kind: 'invalid', fields: { registrationNo?: msg, email?: msg }, message }
//   { kind: 'limited', message }   (429)
//   { kind: 'soon' }               (404: endpoint not deployed yet)
//   { kind: 'error', message }     (anything else, incl. network)
export const PNR_STATUSES = ['CONFIRMED', 'WAITLISTED', 'NOT_CONFIRMED', 'CANCELLED', 'NO_RESERVATION'];

export const checkPnr = async ({ registrationNo, email }, request = api.post) => {
  try {
    const res = await request('/api/registration/pnr', { registrationNo, email });
    if (!PNR_STATUSES.includes(res?.status)) return { kind: 'soon' };
    return { kind: 'result', status: res.status, ticket: res.status === 'CONFIRMED' ? res.ticket ?? null : null };
  } catch (err) {
    if (err?.status === 404) return { kind: 'soon' };
    if (err?.code === 'RATE_LIMITED' || err?.status === 429) {
      return { kind: 'limited', message: err.message || 'Too many enquiries. Please wait a minute and try again.' };
    }
    if (err?.code === 'VALIDATION_ERROR') {
      const body = err.details?.body ?? err.details ?? {};
      const fields = {};
      for (const [key, value] of Object.entries(body)) fields[key] = Array.isArray(value) ? value[0] : String(value);
      return { kind: 'invalid', fields, message: err.message };
    }
    return { kind: 'error', message: err?.status ? err.message : 'Could not reach the station. Check your connection and try again.' };
  }
};

// ── Motion preference ─────────────────────────────────────────────────────
// localStorage 'txp.motion' = 'off' turns the stage's motion off. Mirrored on
// <html data-motion="off"> so the stage (and CSS) can respect it.
const MOTION_KEY = 'txp.motion';

export const readMotionOff = () => {
  try {
    return window.localStorage.getItem(MOTION_KEY) === 'off';
  } catch {
    return false;
  }
};

export const applyMotionPref = (off) => {
  if (typeof document === 'undefined') return;
  if (off) document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
};

export const setMotionOff = (off) => {
  try {
    if (off) window.localStorage.setItem(MOTION_KEY, 'off');
    else window.localStorage.removeItem(MOTION_KEY);
  } catch {
    /* storage blocked: the preference lasts for this page only */
  }
  applyMotionPref(off);
};

// True when the visitor wants less motion (OS setting or our toggle).
export const prefersLessMotion = () =>
  (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'off')
  || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
