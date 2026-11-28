// What an admin sees for each member in the team details view. An explicit
// allow-list, so secrets (passwordHash) can never leak in.
export const ADMIN_MEMBER_FIELDS = {
  id: true, publicId: true, fullName: true, email: true, phone: true,
  registrationNo: true, gender: true, tshirtSize: true,
  degree: true, branch: true, yearSemester: true,
  isDomainExpert: true, verificationStatus: true, lastLoginAt: true,
  preferredTeamRole: true, contributionAreas: true,
  technicalSkills: true, nonTechnicalSkills: true,
  linkedinUrl: true, githubUrl: true, portfolioUrl: true, resumeDriveLink: true,
  discordId: true,
  institution: { select: { id: true, name: true } },
  domain: { select: { id: true, name: true } },
  idCard: { select: { userId: true } },
};
