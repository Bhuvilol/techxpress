import { STEP_COPY as S, JOURNEY_COPY as J } from '../content/guide.js';

// A journey is plain data. Each step:
//   panel    - which panel it lives in ('book', 'pnr'), null for the stage, '*' for any
//   target   - CSS selector to spotlight; omit for a message on its own
//   say      - what Rajesh says
//   advance  - 'next' (button) | 'input' (field filled) | 'click' (target pressed)
//              | 'pills' (at least `min` choices ticked inside the target)
//   optional - skip the step when its target is not on the page (e.g. Branch)
//   actions  - optional extra buttons: [{ label, panel }] open that panel and end the guide

const book = {
  id: 'book',
  ...J.book,
  steps: [
    { panel: null, target: '.book-ticket--register', say: S.bookTicket, advance: 'click' },
    { panel: 'book', say: S.formIntro, advance: 'next' },
    { panel: 'book', target: '[data-field="fullName"]', say: S.fullName, advance: 'input' },
    { panel: 'book', target: '[data-field="email"]', say: S.email, advance: 'input' },
    { panel: 'book', target: '[data-field="emailConfirm"]', say: S.emailConfirm, advance: 'input' },
    { panel: 'book', target: '[data-field="registrationNo"]', say: S.registrationNo, advance: 'input' },
    { panel: 'book', target: '[data-field="gender"]', say: S.gender, advance: 'input' },
    { panel: 'book', target: '[data-field="tshirtSize"]', say: S.tshirtSize, advance: 'input' },
    { panel: 'book', target: '[data-field="idCard"]', say: S.idCard, advance: 'next' },
    { panel: 'book', target: '[data-field="institutionId"]', say: S.institution, advance: 'input' },
    { panel: 'book', target: '[data-field="degree"]', say: S.degree, advance: 'input' },
    { panel: 'book', target: '[data-field="branch"]', say: S.branch, advance: 'input', optional: true },
    { panel: 'book', target: '[data-field="yearSemester"]', say: S.yearSemester, advance: 'input' },
    { panel: 'book', target: '[data-field="preferredDomains"]', say: S.domains, advance: 'pills', min: 4 },
    { panel: 'book', target: '[data-field="contributionAreas"]', say: S.contributionAreas, advance: 'pills', min: 1 },
    { panel: 'book', target: '[data-field="preferredTeamRole"]', say: S.preferredTeamRole, advance: 'input' },
    { panel: 'book', target: '[data-field="bio"]', say: S.bio, advance: 'input' },
    { panel: 'book', target: '.submit-btn', say: S.submit, advance: 'next' },
    { panel: 'book', say: S.afterSubmit, advance: 'next' },
  ],
};

const pnr = {
  id: 'pnr',
  ...J.pnr,
  steps: [
    { panel: 'pnr', say: S.pnrIntro, advance: 'next' },
    { panel: 'pnr', target: '#pnr-registrationNo', say: S.pnrRegNo, advance: 'input' },
    { panel: 'pnr', target: '#pnr-email', say: S.pnrEmail, advance: 'input' },
    { panel: 'pnr', target: '.pnr-form button[type="submit"]', say: S.pnrSubmit, advance: 'next' },
  ],
};

// Shown instead of `book` once registration has closed.
const closed = {
  id: 'book', // takes the place of `book`, so a run in progress carries over
  ...J.closed,
  steps: [
    {
      panel: '*',
      say: S.closed,
      advance: 'next',
      actions: [
        { label: 'Check PNR status', panel: 'pnr' },
        { label: 'Open Enquiry', panel: 'faq' },
      ],
    },
  ],
};

// registrationOpen: true | false | null (unknown yet: treated as open).
export const journeysFor = (registrationOpen) => [registrationOpen === false ? closed : book, pnr];

export const findJourney = (id, registrationOpen) =>
  journeysFor(registrationOpen).find((j) => j.id === id) ?? null;
