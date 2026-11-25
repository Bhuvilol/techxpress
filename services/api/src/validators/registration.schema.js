import { z } from 'zod';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { parseIdCardDataUrl } from '../utils/idCard.js';

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

const longText = (label, max) => z.string().trim().max(max, `${label} is too long — ${max} characters at most.`).optional();
const cuidList = z.array(z.string().cuid('Invalid domain selection.'))
  .min(1, 'Pick at least one domain (up to 4).')
  .max(4, 'You can pick at most 4 domains.')
  .optional();

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
  preferredDomains: cuidList,
  track: z.string().trim().min(1).max(80).optional(),
  degree: z.string({ required_error: 'Select your degree.' }).trim().min(1, 'Select your degree.').max(80),
  yearSemester: z.string({ required_error: 'Enter your year / semester.' }).trim()
    .min(1, 'Enter your year / semester, e.g. “3rd Year / Semester 6”.')
    .max(80, 'Year / semester is too long — 80 characters at most.'),
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
  profilePicUrl: url('https://…/photo.jpg'),
  linkedinUrl: url('https://linkedin.com/in/yourname'),
  githubUrl: url('https://github.com/yourname'),
  portfolioUrl: url('https://yourname.dev'),
  resumeDriveLink: url('https://drive.google.com/file/d/…'),
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
