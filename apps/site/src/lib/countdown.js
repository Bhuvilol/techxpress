// Departure-board maths: time left to the hackathon and which status line the
// LED board shows. Pure functions (pass `now` in) so they can be tested.

const IST = '+05:30';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const toMs = (value) => (value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value));

// '2026-11-27' -> the first millisecond of that day in India time.
export const startOfIstDay = (isoDate) => Date.parse(`${isoDate}T00:00:00${IST}`);
// '2026-12-01' -> the first millisecond of the NEXT day in India time.
export const endOfIstDay = (isoDate) => startOfIstDay(isoDate) + DAY;

// Whole days, hours and minutes until `target`, never negative.
export const timeLeft = (now, target) => {
  const total = Math.max(0, toMs(target) - toMs(now));
  return {
    total,
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
  };
};

export const pad2 = (n) => String(n).padStart(2, '0');

// { days: 7, hours: 3, minutes: 5 } -> [['07','D'],['03','H'],['05','M']]
export const countdownParts = ({ days, hours, minutes }) => [
  [pad2(days), 'D'],
  [pad2(hours), 'H'],
  [pad2(minutes), 'M'],
];

// "7 days, 3 hours and 5 minutes" for screen readers.
export const countdownSpoken = ({ days, hours, minutes }) => {
  const unit = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return `${unit(days, 'day')}, ${unit(hours, 'hour')} and ${unit(minutes, 'minute')}`;
};

// Which LED.status line to show.
//   open: the registration status from GET /api/registration/status
//         (true / false), or null when it could not be fetched.
// After the start it is always 'departed'. With a known status: open ->
// 'open'; closed before the opening day -> 'beforeOpen', closed after it ->
// 'closed'. Without one, the published dates decide.
export const ledStatusKey = ({ now, open, opensOn, closesOn, startsAt }) => {
  const t = toMs(now);
  if (t >= toMs(startsAt)) return 'departed';
  const beforeOpening = t < startOfIstDay(opensOn);
  if (open === true) return 'open';
  if (open === false) return beforeOpening ? 'beforeOpen' : 'closed';
  if (beforeOpening) return 'beforeOpen';
  if (closesOn && t >= endOfIstDay(closesOn)) return 'closed';
  return 'open';
};

// Which closed-shutter line the booking counter shows.
export const shutterKey = ({ now, opensOn }) => (toMs(now) < startOfIstDay(opensOn) ? 'closedBefore' : 'closedAfter');
