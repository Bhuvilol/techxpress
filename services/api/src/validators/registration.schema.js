import { z } from 'zod';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { parseIdCardDataUrl } from '../utils/idCard.js';
import { isDriveFileLink, isGitHubProfile, isLinkedInProfile } from '../utils/profileLinks.js';

// Human-readable messages: these reach the registration form verbatim when a
// field fails server-side validation (the form also validates client-side
// with the same rules — keep them in sync with RegistrationPage.jsx).

const url = (example) => z
  .string()
  .trim()
  .url(`Enter a complete link, e.g. ${example}`)
  .max(500, 'Link is too long — 500 characters at most.')
  .optional()
  .or(z.literal('').transform(() => undefined));

// A link that must also point at a specific site and path shape.
const profileUrl = (message, isValid) => z
  .string()
  .trim()
  .max(500, 'Link is too long — 500 characters at most.')
  .optional()
  .transform((value) => value || undefined) // empty means not filled in
  .refine((value) => value === undefined || isValid(value), { message });

const longText = (label, max) => z.string().trim().max(max, `${label} is too long — ${max} characters at most.`).optional();
// Every student picks exactly 4 domains; the first is their main domain.
export const DOMAIN_PICKS = 4;
export const domainPicks = z.array(z.string().cuid('Invalid domain selection.'), { required_error: `Pick ${DOMAIN_PICKS} domains.` })
  .length(DOMAIN_PICKS, `Pick exactly ${DOMAIN_PICKS} domains.`)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Pick 4 different domains.' });

// The year / semester choices. Kept in step with the two registration forms
// (apps/site/src/utils/registrationForm.js and apps/portal RegistrationPage.jsx).
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

// Branch: asked only of students of this institution (matched by its name in
// the Institution table). Kept in step with both registration forms
// (apps/site/src/utils/registrationForm.js and apps/portal RegistrationPage.jsx).
export const BRANCH_INSTITUTION_NAME = 'ITER | SOA';
export const BRANCH_OPTIONS = ['CSE Core', 'CSE AIML', 'CSE CS', 'CSE DS', 'CSE IOT', 'EE', 'ECE', 'EEE', 'Mech'];
export const branchField = z.enum(BRANCH_OPTIONS, { errorMap: () => ({ message: 'Select your branch.' }) });

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const registrationSchema = z.object({
  fullName: z.string().trim()
    .min(2, 'Enter your full name (at least 2 characters).')
    .max(120, 'Name is too long — 120 characters at most.'),
  email: z.string().trim().toLowerCase()
    .email('That doesn’t look like a valid email. Use the format name@college.edu.'),
  registrationNo: z.string().trim()
    .min(1, 'Registration number is required — use the one issued by your institution.')
    .max(50, 'Registration number is too long — 50 characters at most.')
    .transform(normalizeRegistrationNo),
  institutionId: z.string({ required_error: 'Select your institution from the list.' }).cuid('Select your institution from the list.'),
  domainId: z.string({ required_error: 'Pick at least one domain.' }).cuid('Pick at least one domain.'),
  preferredDomains: domainPicks,
  track: z.string().trim().min(1).max(80).optional(),
  degree: z.string({ required_error: 'Select your degree.' }).trim().min(1, 'Select your degree.').max(80),
  // Required for ITER | SOA, dropped for everyone else (user.service.js).
  branch: z.string().trim().optional().transform((v) => v || undefined)
    .refine((v) => v === undefined || BRANCH_OPTIONS.includes(v), { message: 'Select your branch.' }),
  yearSemester: z.enum(YEAR_SEMESTER_OPTIONS, { errorMap: () => ({ message: 'Select your year / semester.' }) }),
  contributionAreas: z.array(z.string().trim().min(1).max(80), { required_error: 'Pick at least one area you can contribute to.' })
    .min(1, 'Pick at least one area you can contribute to.')
    .max(12, 'Pick at most 12 contribution areas.'),
  preferredTeamRole: z.string({ required_error: 'Select the role you’d like to play in a team.' }).trim()
    .min(1, 'Select the role you’d like to play in a team.').max(80),
  technicalSkills: longText('Technical skills', 500),
  nonTechnicalSkills: longText('Non-technical skills', 500),
  phone: z.string().trim()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits, with no spaces, dashes or +.')
    .optional(),
  discordId: z.string().trim().max(60, 'Discord ID is too long.').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select your gender.' }) }),
  tshirtSize: z.enum(TSHIRT_SIZES, { errorMap: () => ({ message: 'Select your T-shirt size.' }) }),
  profilePicUrl: url('https://…/photo.jpg'),
  linkedinUrl: profileUrl('Enter your LinkedIn profile link, e.g. https://linkedin.com/in/yourname', isLinkedInProfile),
  githubUrl: profileUrl('Enter your GitHub profile link, e.g. https://github.com/yourname', isGitHubProfile),
  portfolioUrl: url('https://yourname.dev'),
  resumeDriveLink: profileUrl('Enter a Google Drive file link, e.g. https://drive.google.com/file/d/…', isDriveFileLink),
  researchPublicationUrl: url('https://doi.org/…'),
  bio: z.string({ required_error: 'Bio is required.' }).trim()
    .min(1, 'Bio is required — a few lines about what you build, study or care about.')
    .max(1000, 'Bio is too long — 1000 characters at most.'),
  certificationsAchievements: longText('Certifications', 1500),
  projectInitiative: longText('Project / initiative', 1500),
  participationExperience: longText('Participation experience', 1500),
  achievements: longText('Achievements', 1500),
  hackathonExperience: longText('Hackathon experience', 1500),
  // Required photo of the college ID card, as a data URL (see utils/idCard.js).
  // Becomes { mimeType, sizeBytes, data } after validation.
  idCard: z.string({ required_error: 'Upload a photo of your college ID card.' })
    .transform((value, ctx) => {
      const parsed = parseIdCardDataUrl(value);
      if (parsed.error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
        return z.NEVER;
      }
      return parsed;
    }),
});

// PNR status check (POST /api/registration/pnr): both values must match the
// same student. Invalid input is a 400; a valid but unknown pair is not.
export const pnrSchema = z.object({
  registrationNo: z.string({ required_error: 'Enter your registration number.' }).trim()
    .min(1, 'Enter your registration number.')
    .max(50, 'Registration number is too long — 50 characters at most.')
    .transform(normalizeRegistrationNo),
  email: z.string({ required_error: 'Enter the email you registered with.' }).trim().toLowerCase()
    .email('Enter the email you registered with.'),
});
