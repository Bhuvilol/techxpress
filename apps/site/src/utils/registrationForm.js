// Registration form rules and payload, kept free of React so they can be unit tested.
// They mirror the server validator (services/api/src/validators/registration.schema.js).

// Kept in step with TSHIRT_SIZES in services/api/src/validators/registration.schema.js.
export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Branch is asked only of this institution's students. Kept in step with
// BRANCH_INSTITUTION_NAME / BRANCH_OPTIONS in the server validator.
export const BRANCH_INSTITUTION_NAME = 'ITER | SOA';
export const BRANCH_OPTIONS = ['CSE Core', 'CSE AIML', 'CSE CS', 'CSE DS', 'EE', 'ECE', 'EEE', 'Mech'];

export const INITIAL_FORM = {
  fullName: '',
  email: '',
  registrationNo: '',
  phone: '',
  gender: '', // no default: a guessed value would feed the team gender rules
  tshirtSize: '',
  idCard: '',
  institutionId: '',
  preferredDomains: [],
  domainId: '',
  yearSemester: '',
  degree: '',
  branch: '',
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

// Same list as the server (services/api/src/validators/registration.schema.js).
export const YEAR_SEMESTER_OPTIONS = [
  '1st Year / Semester 1',
  '1st Year / Semester 2',
  '2nd Year / Semester 3',
  '2nd Year / Semester 4',
  '3rd Year / Semester 5',
  '3rd Year / Semester 6',
  '4th Year / Semester 7',
  '4th Year / Semester 8',
  '5th Year / Semester 9',
  '5th Year / Semester 10',
  '6th Year / Semester 11',
  '6th Year / Semester 12',
];

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
  'tshirtSize',
  'idCard',
  'institutionId',
  'preferredDomains',
  'domainId',
  'yearSemester',
  'degree',
  'branch',
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
  tshirtSize: 'T-shirt size',
  idCard: 'College ID Card',
  institutionId: 'Institution',
  preferredDomains: 'Preferred Domain',
  domainId: 'Preferred Domain',
  yearSemester: 'Year / Semester',
  degree: 'Degree',
  branch: 'Branch',
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

export // Profile links must point at the right site. Same rules as the server
// (services/api/src/utils/profileLinks.js).
const parseLink = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};
const onHost = (u, host) => u.hostname === host || u.hostname.endsWith(`.${host}`);
const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const isLinkedInProfile = (value) => {
  const u = parseLink(value);
  return Boolean(u && onHost(u, 'linkedin.com') && /^\/in\/[^/]+\/?$/i.test(u.pathname));
};
const isGitHubProfile = (value) => {
  const u = parseLink(value);
  if (!u || !['github.com', 'www.github.com'].includes(u.hostname)) return false;
  const [user, ...rest] = u.pathname.split('/').filter(Boolean);
  return Boolean(user && GITHUB_USER.test(user) && rest.length === 0);
};
const isDriveFileLink = (value) => {
  const u = parseLink(value);
  return Boolean(u && onHost(u, 'drive.google.com') && /^\/file\/d\/[^/]+/.test(u.pathname));
};

// Each profile field: the check and the message shown when it fails.
const PROFILE_CHECKS = {
  linkedinUrl: { valid: isLinkedInProfile, message: 'LinkedIn' },
  githubUrl: { valid: isGitHubProfile, message: 'GitHub' },
  resumeDriveLink: { valid: isDriveFileLink, message: 'Google Drive file' },
};

// needsBranch: the picked institution is BRANCH_INSTITUTION_NAME.
export const validateRegistration = (f, { needsBranch = false } = {}) => {
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
  // Optional, but when given it must be exactly 10 digits (same rule as the server).
  if (phone && !/^\d{10}$/.test(phone)) e.phone = 'Phone number must be exactly 10 digits, with no spaces, dashes or +.';

  if (!f.gender) e.gender = 'Select your gender.';
  if (!TSHIRT_SIZES.includes(f.tshirtSize)) e.tshirtSize = 'Select your T-shirt size.';
  if (!f.idCard) e.idCard = 'Upload a photo of your college ID card.';
  if (!f.institutionId) e.institutionId = 'Select your institution from the list.';
  if (f.preferredDomains.length !== 4) e.preferredDomains = 'Pick exactly 4 domains. Your first pick is primary.';
  if (!YEAR_SEMESTER_OPTIONS.includes(f.yearSemester)) e.yearSemester = 'Select your year / semester.';
  if (!f.degree) e.degree = 'Select your degree.';
  if (needsBranch && !BRANCH_OPTIONS.includes(f.branch)) e.branch = 'Select your branch.';
  if (!f.contributionAreas.length) e.contributionAreas = 'Pick at least one area you can contribute to.';
  else if (f.contributionAreas.length > 12) e.contributionAreas = 'Pick at most 12 contribution areas.';
  if (!f.preferredTeamRole) e.preferredTeamRole = 'Select the role you would like to play in a team.';
  if (f.technicalSkills.length > 500) e.technicalSkills = 'Keep technical skills under 500 characters.';
  if (f.nonTechnicalSkills.length > 500) e.nonTechnicalSkills = 'Keep non-technical skills under 500 characters.';

  for (const key of URL_FIELDS) {
    if (!f[key]) continue;
    const profile = PROFILE_CHECKS[key];
    if (profile) {
      if (!profile.valid(f[key])) e[key] = `Enter your ${profile.message} link, e.g. ${URL_EXAMPLES[key]}`;
    } else if (!isValidUrl(f[key])) {
      e[key] = `Enter a complete link, e.g. ${URL_EXAMPLES[key]}`;
    }
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

// True when the visitor has typed or picked anything (the honeypot does not
// count). The booking panel asks before closing when this is true.
export const hasFormData = (form) =>
  Object.keys(INITIAL_FORM).some(
    (key) => key !== 'website' && JSON.stringify(form[key]) !== JSON.stringify(INITIAL_FORM[key]),
  );
