// The "?" help on each registration field: what to type, an example, and what
// to avoid. Written from the form's own rules in utils/registrationForm.js, so
// keep the two in step. Keyed by the FieldWrap `field` name.
//
//   what     one or two short sentences
//   example  optional, shown as typed
//   avoid    optional, the common mistakes
//
// ⚠ CONFIRM: the organisers should read this before launch, especially the
// "avoid" lines and anything that explains why a detail is asked.

export const FIELD_GUIDE = {
  fullName: {
    what: 'Your full name, exactly as it is printed on your college ID card.',
    example: 'Priya Kumari Sharma',
    avoid: 'Nicknames, only your first name, or initials in place of your name.',
  },
  email: {
    what: 'An email you check often. Your login details are sent here once your registration is approved.',
    example: 'name@college.edu',
    avoid: 'Typing mistakes, or an address you no longer use.',
  },
  emailConfirm: {
    what: 'Type the same email again. This catches typing mistakes, so it has to match the first one exactly.',
    avoid: 'Pasting the first one. Typing it again is what catches a slip.',
  },
  registrationNo: {
    what: 'The registration number issued by your institution. It formats itself as you type.',
    example: '2024PS12345',
    avoid: 'Your school roll number, or a number from a different document.',
  },
  phone: {
    what: 'Optional. Your 10-digit mobile number.',
    example: '9876543210',
    avoid: 'Spaces, dashes, or +91. Digits only, exactly 10.',
  },
  gender: {
    // ⚠ CONFIRM: reason taken from the About text (at least one girl per team).
    what: 'Pick the option that applies to you. Teams need at least one girl, so this helps with team formation.',
  },
  tshirtSize: {
    what: 'The T-shirt size you normally wear, from XS to XXXL.',
    example: 'M',
  },
  idCard: {
    what: 'A clear photo or scan of the front of your college ID card, showing your name and photo. JPG, PNG or WebP. It is resized automatically.',
    avoid: 'The back of the card, a blurry or cropped picture, or someone else’s ID. Coordinators use it to verify you.',
  },
  institutionId: {
    what: 'Choose the institution you study at, from the list.',
    avoid: 'Choosing a different institution from the one on your ID card.',
  },
  degree: {
    what: 'The degree you are enrolled in right now.',
  },
  branch: {
    what: 'Your branch. This question appears only for ITER | SOA students.',
  },
  yearSemester: {
    what: 'Your current year or semester.',
  },
  preferredDomains: {
    what: 'Pick exactly 4 domains. Your first pick is your primary domain, used for qualification and team matching.',
    avoid: 'Picking fewer than 4: the form will not submit. Choose your first pick carefully.',
  },
  contributionAreas: {
    what: 'Pick at least 1 and at most 12 areas where you can really help a team.',
    avoid: 'Ticking everything. Choose the areas you can genuinely contribute to.',
  },
  preferredTeamRole: {
    what: 'The role you would most like to play in a team.',
  },
  technicalSkills: {
    what: 'Optional. Your stack, tools, labs or platforms. Up to 500 characters.',
    example: 'React, Node.js, Python, Figma, SQL',
  },
  nonTechnicalSkills: {
    what: 'Optional. Skills like pitching, leadership, research or outreach. Up to 500 characters.',
    example: 'Leadership, communication, documentation',
  },
  linkedinUrl: {
    what: 'Optional. The link to your own LinkedIn profile.',
    example: 'https://linkedin.com/in/yourname',
    avoid: 'A post link, a company page, or just your name.',
  },
  githubUrl: {
    what: 'Optional. The link to your GitHub (or other technical) profile page.',
    example: 'https://github.com/yourname',
    avoid: 'A link to a single project. Use your profile page, not a repository.',
  },
  resumeDriveLink: {
    what: 'Optional. A Google Drive link to your resume. Set sharing so that anyone with the link can view it.',
    example: 'https://drive.google.com/file/d/...',
    avoid: 'A folder link, a link to another site, or a file that is not shared.',
  },
  researchPublicationUrl: {
    what: 'Optional. A complete link to a paper or publication of yours.',
    example: 'https://doi.org/...',
  },
  certificationsAchievements: {
    what: 'Optional. Licenses, certifications or fellowships. Up to 1500 characters.',
  },
  projectInitiative: {
    what: 'Optional. A project, startup, society or initiative you are building. Up to 1500 characters.',
  },
  participationExperience: {
    what: 'Optional. Competitions, case challenges, paper presentations or community work. Up to 1500 characters.',
  },
  bio: {
    what: 'A few lines about what you build or study, what you care about, and the kind of team you want to join. Up to 1000 characters.',
    example: 'Third-year CSE student who builds web apps and likes turning ideas into working prototypes. Looking for a team that ships.',
    avoid: 'Leaving it empty: the bio is required.',
  },
  achievements: {
    what: 'Optional. Work or awards you are proud of. Up to 1500 characters.',
  },
  hackathonExperience: {
    what: 'Optional. Earlier hackathons, your role and the outcome. Up to 1500 characters.',
  },
};

export const hasFieldHelp = (field) => Boolean(field && FIELD_GUIDE[field]);
