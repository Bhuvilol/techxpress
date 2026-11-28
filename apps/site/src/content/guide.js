// Everything Rajesh (the guide character) says. Kept apart from the journeys so the copy can be
// reviewed (and translated) in one place.
//
// ⚠ CONFIRM: Rajesh is the name of the guard in the scene art; confirm it is the name the team wants.

export const GUIDE = {
  name: 'Rajesh',
  launcher: 'Need help?',
  menuTitle: 'Where to, passenger?',
  menuIntro: 'Pick one and I will walk you through it, step by step.',
  next: 'Next',
  back: 'Back',
  done: 'Done',
  stop: 'Stop guide',
  waitInput: 'Fill this in to continue',
  waitClick: 'Tap the highlighted button to continue',
  waitPills: (n) => (n === 1 ? 'Pick one to continue' : `Pick ${n} to continue`),
  missing: 'I cannot spot that on the page right now. Carry on and tap Next.',
  stepOf: (i, n) => `Step ${i} of ${n}`,
};

export const JOURNEY_COPY = {
  book: {
    title: 'Book my ticket (register)',
    blurb: 'Fill the registration form, field by field.',
  },
  pnr: {
    title: 'Check my PNR status',
    blurb: 'See if your registration is confirmed.',
  },
  closed: {
    title: 'Book my ticket (register)',
    blurb: 'Booking status and what you can still do.',
  },
};

export const STEP_COPY = {
  bookTicket: 'Namaste! I am Rajesh, your station guide. Tap the big pink ticket to open the booking counter.',
  formIntro: 'This is the registration form. Fields marked with a red * are required. I will take you through the required ones. The rest are optional, so you can fill them in your own time.',
  fullName: 'Start with your full name, exactly as printed on your college ID card.',
  email: 'Now your email. Use one you check often: your login details are sent here once you are approved.',
  registrationNo: 'Your registration number, as issued by your institution. It formats itself as you type.',
  gender: 'Pick the option that applies to you.',
  tshirtSize: 'Choose the T-shirt size you normally wear.',
  idCard: 'Upload a clear photo of your college ID card. Coordinators use it to verify you, so make sure the text is readable.',
  institution: 'Choose your institution from the list.',
  degree: 'Pick the degree you are enrolled in.',
  branch: 'You study at ITER | SOA, so pick your branch as well.',
  yearSemester: 'Choose your current year or semester.',
  domains: 'Pick exactly 4 domains. Your first pick is your primary domain, so choose it carefully.',
  contributionAreas: 'Pick the areas where you can really help a team: at least 1, and up to 12.',
  preferredTeamRole: 'Choose the role you would most like to play in a team.',
  bio: 'Write a few lines about what you build or study, and the kind of team you want to join. The bio is required.',
  submit: 'When every required field is filled, press this button. If something is missing, the form jumps to it and tells you what.',
  afterSubmit: 'After you submit you get a reservation slip. It will show WAITLISTED until your coordinator verifies your ID. Keep your registration number and email handy to check your PNR.',
  pnrIntro: 'Here you can check where your registration stands. You need the registration number and email you registered with.',
  pnrRegNo: 'Type your registration number exactly as you entered it when you booked.',
  pnrEmail: 'Now the email you used while booking.',
  pnrSubmit: 'Press Check PNR. CONFIRMED means you are verified and your login code was emailed. WAITLISTED means your coordinator has not verified you yet.',
  closed: 'Booking is closed, so the registration form is no longer open. If you already registered you can still check your PNR status. For any doubt, read the Enquiry board or write to the organisers.',
};
