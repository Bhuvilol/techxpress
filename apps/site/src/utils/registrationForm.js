// Registration form rules and payload, kept free of React so they can be unit tested.
// They mirror the server validator (services/api/src/validators/registration.schema.js).

export const INITIAL_FORM = {
  fullName: '',
  email: '',
  registrationNo: '',
  phone: '',
  gender: '', // no default: a guessed value would feed the team gender rules
  idCard: '',
  institutionId: '',
  preferredDomains: [],
  domainId: '',
  yearSemester: '',
  degree: '',
  contributionAreas: [],
  preferredTeamRole: '',
  technicalSkills: '',
  nonTechnicalSkills: '',
  linkedinUrl: '',
  githubUrl: '',
  resumeDriveLink: '',
  researchPublicationUrl: '',
  certificationsAchievements: '',
  projectInitiative: '',
  participationExperience: '',
  bio: '',
  achievements: '',
  hackathonExperience: '',
  website: '', // honeypot — hidden from humans; must stay empty
};

export const URL_FIELDS = ['linkedinUrl', 'githubUrl', 'resumeDriveLink', 'researchPublicationUrl'];

export const URL_EXAMPLES = {
  linkedinUrl: 'https://linkedin.com/in/yourname',
  githubUrl: 'https://github.com/yourname',
  resumeDriveLink: 'https://drive.google.com/file/d/...',
  researchPublicationUrl: 'https://doi.org/...',
};

export const FIELD_ORDER = [
  'fullName',
  'email',
  'registrationNo',
  'phone',
  'gender',
  'idCard',
  'institutionId',
  'preferredDomains',
  'domainId',
  'yearSemester',
  'degree',
  'contributionAreas',
  'preferredTeamRole',
  'technicalSkills',
  'nonTechnicalSkills',
  'linkedinUrl',
  'githubUrl',
  'resumeDriveLink',
  'researchPublicationUrl',
  'certificationsAchievements',
  'projectInitiative',
  'participationExperience',
  'bio',
  'achievements',
  'hackathonExperience',
];

export const FIELD_LABELS = {
  fullName: 'Full Name',
  email: 'Email',
  registrationNo: 'Registration Number',
  phone: 'Phone',
  gender: 'Gender',
  idCard: 'College ID Card',
  institutionId: 'Institution',
  preferredDomains: 'Preferred Domain',
  domainId: 'Preferred Domain',
  yearSemester: 'Year / Semester',
  degree: 'Degree',
  contributionAreas: 'Contribution Areas',
  preferredTeamRole: 'Preferred Team Role',
  technicalSkills: 'Technical Skills',
  nonTechnicalSkills: 'Non-Technical Skills',
  linkedinUrl: 'LinkedIn Profile',
  githubUrl: 'GitHub Profile',
  resumeDriveLink: 'Resume Drive Link',
  researchPublicationUrl: 'Research / Publication Link',
  certificationsAchievements: 'Certifications / Achievements',
  projectInitiative: 'Project / Initiative',
  participationExperience: 'Participation Experience',
  bio: 'Bio',
  achievements: 'Achievements',
  hackathonExperience: 'Hackathon Experience',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeUrl = (value) => {
  const v = (value ?? '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

const isValidUrl = (value) => {
  try {
    const u = new URL(value);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') && value.length <= 500;
  } catch {
    return false;
  }
};

export const validateRegistration = (f) => {
  const e = {};
  const name = f.fullName.trim();
  if (name.length < 2) e.fullName = 'Enter your full name (at least 2 characters).';
  else if (name.length > 120) e.fullName = 'Name is too long — 120 characters at most.';

  const email = f.email.trim();
  if (!email) e.email = 'Email is required — your login details are sent here.';
  else if (!EMAIL_RE.test(email)) e.email = 'That does not look like a valid email. Use name@college.edu.';

  const reg = f.registrationNo.trim();
  if (!reg) e.registrationNo = 'Registration number is required — use the one issued by your institution.';
  else if (reg.length > 50) e.registrationNo = 'Registration number is too long — 50 characters at most.';

  const phone = f.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s-]+$/.test(phone)) e.phone = 'Use digits only (spaces, dashes and a leading + are fine).';
    else if (digits.length < 7 || digits.length > 15) e.phone = `Phone number should have 7–15 digits (entered ${digits.length}).`;
    else if (phone.length > 20) e.phone = 'Phone number is too long — 20 characters at most.';
  }

  if (!f.gender) e.gender = 'Select your gender.';
  if (!f.idCard) e.idCard = 'Upload a photo of your college ID card.';
  if (!f.institutionId) e.institutionId = 'Select your institution from the list.';
  if (!f.preferredDomains.length) e.preferredDomains = 'Pick at least one domain (up to 4). Your first pick is primary.';
  if (!f.yearSemester.trim()) e.yearSemester = 'Enter your year / semester, e.g. "3rd Year / Semester 6".';
  if (!f.degree) e.degree = 'Select your degree.';
  if (!f.contributionAreas.length) e.contributionAreas = 'Pick at least one area you can contribute to.';
  else if (f.contributionAreas.length > 12) e.contributionAreas = 'Pick at most 12 contribution areas.';
  if (!f.preferredTeamRole) e.preferredTeamRole = 'Select the role you would like to play in a team.';
  if (f.technicalSkills.length > 500) e.technicalSkills = 'Keep technical skills under 500 characters.';
  if (f.nonTechnicalSkills.length > 500) e.nonTechnicalSkills = 'Keep non-technical skills under 500 characters.';

  for (const key of URL_FIELDS) {
    if (f[key] && !isValidUrl(f[key])) e[key] = `Enter a complete link, e.g. ${URL_EXAMPLES[key]}`;
  }

  const bio = f.bio.trim();
  if (!bio) e.bio = 'Bio is required — a few lines about what you build, study or care about.';
  else if (bio.length > 1000) e.bio = `Bio is too long — ${bio.length}/1000 characters.`;

  for (const key of [
    'certificationsAchievements',
    'projectInitiative',
    'participationExperience',
    'achievements',
    'hackathonExperience',
  ]) {
    if (f[key].length > 1500) e[key] = `Too long — ${f[key].length}/1500 characters.`;
  }

  return e;
};

export const sanitizePayload = (form) =>
  Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => {
        if (Array.isArray(value)) return [key, value.length ? value : undefined];
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return [key, trimmed === '' ? undefined : trimmed];
        }
        return [key, value];
      })
      .filter(([, value]) => value !== undefined),
  );

// The body sent to POST /api/registration. The primary domain is the first
// pick, so the API gets both fields the server validator expects.
export const buildSubmitPayload = (form) => {
  const payload = sanitizePayload(form);
  if (form.preferredDomains.length) {
    payload.preferredDomains = form.preferredDomains;
    payload.domainId = form.preferredDomains[0];
  }
  return payload;
};
