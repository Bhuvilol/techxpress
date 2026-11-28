// Who counts as a domain expert for a team, by the TEAM's domain. A member
// counts when their institution (and, for ITER, their branch) matches, no
// matter which domain they picked for themselves. The rule is enforced only
// while Admin → Rules → "Min domain experts" is 1 or more.
//
// Names match prisma/data/taxonomy.json (domains, institutions) and
// BRANCH_OPTIONS in validators/registration.schema.js.
const ITER = 'ITER | SOA';

export const DOMAIN_EXPERT_SOURCES = {
  'Law':                      { institutions: ['SNIL | SOA'] },
  'Health':                   { institutions: ['IMS & SUM | SOA', 'SNC | SOA'] },
  'Hospital Management':      { institutions: ['IBCS | SOA'] },
  'Management':               { institutions: ['IBCS | SOA'] },
  'Agriculture':              { institutions: ['IAS | SOA'] },
  'Biotechnology & Pharmacy': { institutions: ['SPS | SOA'] },
  'Electrical':               { iterBranches: ['ECE', 'EEE', 'EE'] },
  'Mechanical':               { iterBranches: ['Mech', 'Civil'] },
};

// member: { institution: <name> | null, branch: <name> | null }
export const isDomainExpertFor = (member, teamDomainName) => {
  const source = DOMAIN_EXPERT_SOURCES[teamDomainName];
  if (!source || !member?.institution) return false;
  if (source.institutions?.includes(member.institution)) return true;
  return Boolean(source.iterBranches && member.institution === ITER && source.iterBranches.includes(member.branch));
};

export const countDomainExperts = (members, teamDomainName) =>
  members.filter((m) => isDomainExpertFor(m, teamDomainName)).length;
