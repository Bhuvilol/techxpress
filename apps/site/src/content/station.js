// ALL words on the TechXpress station live here, so they can be edited in
// one place. The scene and the panels read from this file.
//
// ⚠ CONFIRM marks facts the organisers still have to confirm before launch.

export const EVENT = {
  // ⚠ CONFIRM: start of day 1 (check-in), India time. Drives the countdown.
  startsAt: '2026-12-04T09:30:00+05:30',
  // ⚠ CONFIRM: the day registration opens (matches Admin → Rules being switched on).
  registrationOpensOn: '2026-11-27',
  // ⚠ CONFIRM: registration closing day (from the draft timeline).
  registrationClosesOn: '2026-12-01',
  trainNo: '12026',
  trainName: 'TECHXPRESS',
  contactEmail: 'team@soatechxpress.in',
};

export const STATION = {
  english: 'TECHXPRESS JN.',
  hindi: 'टेकएक्सप्रेस जं.', // ⚠ CONFIRM with a native Hindi speaker
  altitude: 'समुद्र तल से ऊँचाई 2026 मी. · HEIGHT ABOVE SEA LEVEL 2026 m',
  platform: { english: 'PLATFORM 1', hindi: 'प्लेटफ़ॉर्म 1' },
};

// The orange LED indicator board.
export const LED = {
  intro: '12026 TECHXPRESS · BOARDING',
  headline: '12026 TECHXPRESS',
  status: {
    beforeOpen: 'REGISTRATION OPENS 27 NOV · PLATFORM 1',
    open: 'BOARDING NOW · BOOK YOUR TICKET · PLATFORM 1',
    closed: 'BOOKING CLOSED · DEPARTS 04 DEC',
    departed: 'DEPARTED · HACKATHON IN PROGRESS',
  },
  countdownPrefix: 'DEPARTS IN',
};

// Labels on objects, the menu and hover tags. Hindi ⚠ CONFIRM.
export const LABELS = {
  about: { english: 'About', hindi: 'परिचय', hint: 'About TechXpress' },
  timetable: { english: 'Timetable', hindi: 'समय सारणी', hint: 'Event schedule' },
  prizes: { english: 'Fare chart', hindi: 'किराया सूची', hint: 'Prizes' },
  faq: { english: 'Enquiry', hindi: 'पूछताछ', hint: 'Questions and answers' },
  pnr: { english: 'PNR status', hindi: 'पी.एन.आर. स्थिति', hint: 'Check your registration' },
  countdown: { english: 'Departure board', hindi: 'प्रस्थान', hint: 'Countdown to the hackathon' },
  book: { english: 'Book your ticket', hindi: 'टिकट बुक करें', hint: 'Register for TechXpress' },
  guide: { english: 'Station guide', hindi: 'स्टेशन गाइड' },
};

export const HINTS = {
  tap: 'Tap anything on the platform',
  tilt: 'Tilt your phone to look around',
  skip: 'Skip',
  motionOff: 'Motion off',
  motionOn: 'Motion on',
};

export const ABOUT = {
  title: 'SOA TechXpress',
  subtitle: "Siksha 'O' Anusandhan · Intra-university hackathon · Bhubaneswar",
  paragraphs: [
    "SOA TechXpress is the intra-university hackathon of Siksha 'O' Anusandhan. Students from every SOA institute come aboard to find real problems, form teams across disciplines and build working prototypes, from idea to demo, in one non-stop journey.",
    'More than a competition, it is a place to learn, meet people outside your department and build something that makes a difference.',
  ],
  whyTitle: 'Why board',
  why: [
    'Build with people from other departments and campuses.',
    'Work on real-world challenges, not toy problems.',
    'Get feedback from faculty members and industry mentors.',
    'Win prizes, incubation and mentoring support, and a feature on the SOA website.',
  ],
  whoTitle: 'Who can travel',
  // ⚠ CONFIRM: team rules are the current portal settings (min 3, max 5, at least 1 woman).
  who: 'Any registered SOA student. Teams of 3 to 5 members, with at least one woman in every team.',
};

// Timetable. ⚠ CONFIRM: every date and time here is from a draft schedule.
export const TIMETABLE = {
  preDeparture: [
    { date: '27 NOV', title: 'Booking opens', detail: 'Registration opens on this site' },
    { date: '01 DEC', title: 'Booking closes', detail: 'Last day to register', key: true },
    { date: '02–03 DEC', title: 'Final passenger list', detail: 'Shortlist announced', key: true },
    { date: '04 DEC', title: 'Departure', detail: 'The hackathon begins', key: true },
  ],
  days: [
    {
      id: 'day1',
      title: 'Day 1 · Friday 04 Dec',
      stops: [
        { time: '09:30', title: 'Check-in', venue: 'BGA A' },
        { time: '10:30', title: 'Flag-off and briefing', venue: 'BGA A' },
        { time: '12:30', title: 'Lunch', venue: 'CL 3rd floor' },
        { time: '13:30', title: 'TechXpress begins', venue: 'CL 3rd floor', key: true },
        { time: '15:00', title: 'Evaluation wave 1: problem framing', venue: 'CL 3rd floor' },
        { time: '17:30', title: 'Evaluation wave 2: top 20 continue', venue: 'CL 3rd floor', key: true },
        { time: '20:30', title: 'Dinner', venue: 'CL parking' },
        { time: '22:00', title: 'Overnight build', venue: 'CL 3rd floor' },
      ],
    },
    {
      id: 'day2',
      title: 'Day 2 · Saturday 05 Dec',
      stops: [
        { time: '08:00', title: 'Breakfast', venue: 'CL 3rd floor' },
        { time: '09:00', title: 'Evaluation wave 3: top 10 advance', venue: 'CL 3rd floor', key: true },
        { time: '13:00', title: 'Lunch', venue: 'CL 3rd floor' },
        { time: '13:30', title: 'Final jury', venue: 'CL 3rd floor', key: true },
        { time: '15:00', title: 'Journey ends', venue: 'CL 3rd floor' },
      ],
    },
    {
      // ⚠ CONFIRM: keep Abinya 3.1 on the timetable?
      id: 'day3',
      title: 'Day 3 · Sunday 06 Dec · Abinya 3.1',
      stops: [
        { time: '10:30', title: 'Abinya 3.1 inauguration', venue: 'BGA A' },
        { time: '11:00', title: 'Project exhibition (open to all students)', venue: 'CL 3rd floor', key: true },
        { time: '14:30', title: 'Felicitation ceremony', venue: 'BGA A', key: true },
        { time: '16:30', title: 'Cultural night', venue: 'BGA A' },
      ],
    },
  ],
};

// Prizes, written as a railway fare chart. Total ₹65,000.
export const FARES = {
  total: '₹65,000',
  rows: [
    { cls: '1A', className: 'First AC', title: 'Winner', fare: '₹25,000', extra: 'Trophy and medals for every member' },
    { cls: '2A', className: 'Second AC', title: '1st runner-up', fare: '₹15,000', extra: 'Trophy and medals for every member' },
    { cls: '3A', className: 'Third AC', title: '2nd runner-up', fare: '₹10,000', extra: 'Trophy and medals for every member' },
    { cls: 'TQ', className: 'Tatkal Special × 3', title: 'Special awards', fare: '₹5,000 each', extra: 'For the best theme-based ideas' },
  ],
  // ⚠ CONFIRM: whether incubation and the website feature are for the top 3 only.
  perks: 'Top teams also get merit certificates, incubation and mentoring support, and a feature on the SOA website.',
  general: { cls: 'GN', className: 'General', title: 'Every passenger', extra: 'Participation certificate and goodies' },
};

export const FAQ = [
  { q: 'Who can register?', a: 'Any SOA student. Register on this site with your college ID card.' },
  { q: 'Is there a fee?', a: 'No, registration is free.' }, // ⚠ CONFIRM
  { q: 'How big is a team?', a: '3 to 5 members, with at least one woman in every team.' }, // ⚠ CONFIRM
  { q: 'Can I register without a team?', a: 'Yes. Register on your own first, then form or join a team in the VORTEX portal.' },
  { q: 'What happens after I register?', a: 'Your college coordinator checks your details and ID card. Once you are approved, your login code arrives by email from team@soatechxpress.in.' },
  { q: "I haven't received my email.", a: 'Check your spam folder, then check your PNR status here. If it says CONFIRMED but no email arrived, write to the organisers.' },
  { q: 'Where is the hackathon?', a: 'ITER campus, SOA, Bhubaneswar: BGA A and the CL 3rd floor.' }, // ⚠ CONFIRM
  { q: 'What should I bring?', a: 'Your laptop, charger and college ID card.' }, // ⚠ CONFIRM
  { q: 'Will food be provided?', a: 'Yes, meals are provided during the event. See the timetable.' }, // ⚠ CONFIRM
  { q: 'Who do I contact?', a: 'Write to team@soatechxpress.in.' },
];

export const PNR = {
  title: 'PNR enquiry',
  intro: 'Enter the registration number and email you registered with.',
  fields: { registrationNo: 'Registration number', email: 'Email' },
  submit: 'Check PNR',
  checking: 'Checking…',
  soon: 'PNR enquiry opens soon.',
  stamps: {
    CONFIRMED: { label: 'CONFIRMED', text: 'You are verified. Your login code was emailed to you. Download your e-ticket below.' },
    WAITLISTED: { label: 'WAITLISTED', text: 'Your registration is waiting for your coordinator to verify it.' },
    NOT_CONFIRMED: { label: 'NOT CONFIRMED', text: 'Your registration was not approved. Contact the organisers if you think this is a mistake.' },
    CANCELLED: { label: 'CANCELLED', text: 'Your access was cancelled by the organisers.' },
    NO_RESERVATION: { label: 'NO RESERVATION', text: 'No reservation found for these details. Check them, or book your ticket.' },
  },
  download: 'Download e-ticket',
  share: 'Share',
  ticketFooter: 'Souvenir ticket · not valid for travel · soatechxpress.in',
};

export const BOOK = {
  title: 'Reservation counter',
  formTitle: 'Reservation requisition form',
  closedBefore: 'Booking opens 27 Nov', // ⚠ CONFIRM
  closedAfter: 'Booking closed',
  successTitle: 'Reservation slip',
  checkPnr: 'Check PNR status',
  login: 'Log in to VORTEX',
};

// ── Added for the station UI (src/ui/). ⚠ CONFIRM the wording. ────────────

// The souvenir e-ticket drawn by src/lib/eticket.js.
export const TICKET = {
  header: 'TECHXPRESS JN. · ELECTRONIC RESERVATION SLIP',
  headerHindi: 'इलेक्ट्रॉनिक आरक्षण पर्ची', // ⚠ CONFIRM with a native Hindi speaker
  kind: 'E-TICKET · SOUVENIR',
  from: 'SOA',
  to: 'TECHXPRESS JN.',
  departure: '09:30 IST', // ⚠ CONFIRM: matches EVENT.startsAt
  stampTop: 'TECHXPRESS JN.',
  stampBottom: 'BOARDING CONFIRMED',
  labels: {
    train: 'Train No. / Name',
    pnr: 'PNR',
    from: 'From',
    to: 'To',
    date: 'Date of journey',
    departure: 'Departure',
    passenger: 'Passenger name',
    institution: 'Institution',
    cls: 'Class',
    coach: 'Coach',
    berth: 'Berth',
    berthType: 'Berth type',
  },
  footerSmall: 'SOA TechXpress · Bhubaneswar · 04 Dec 2026',
  shareTitle: 'My TechXpress ticket',
  shareText: 'Boarding the 12026 TechXpress. See you at TechXpress Jn.!',
};

// Small UI words that were not in the sections above.
export const UI = {
  close: 'Close',
  panelsHeading: 'On the platform',
  closeAnyway: 'Close form',
  keepEditing: 'Keep editing',
  discardQuestion: 'Close the form? What you typed stays here until you leave the page.',
  loadingCounter: 'Opening the counter…',
  liveStatusPrefix: 'Departure board:',
  timetableCols: { time: 'Time', event: 'Event', venue: 'Venue' },
  preDepartureTitle: 'Before departure',
  fareCols: { cls: 'Class', title: 'Passenger', fare: 'Fare', extra: 'Includes' },
  fareTotal: 'Total prize pool',
  fareTitle: 'Fare chart',
  enquiryPlate: { hindi: 'पूछताछ', english: 'ENQUIRY' },
  enquiryTitle: 'Questions and answers',
  bookShutterNote: 'Meanwhile, check the timetable or ask at the enquiry counter.',
  pnrAgain: 'Check another PNR',
  pnrRequired: {
    registrationNo: 'Enter your registration number.',
    email: 'Enter the email you registered with.',
  },
  pnrBadEmail: 'That does not look like a valid email.',
  passengerRef: 'Passenger ref',
  regdNo: 'Regd. number',
};
