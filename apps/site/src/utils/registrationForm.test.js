import { describe, expect, it } from 'vitest';
import {
  FIELD_ORDER,
  INITIAL_FORM,
  buildSubmitPayload,
  normalizeUrl,
  sanitizePayload,
  validateRegistration,
} from './registrationForm';

// A form that passes every rule. Each test changes one thing from this.
const validForm = (overrides = {}) => ({
  fullName: 'Asha Kumar',
  email: 'asha@college.edu',
  registrationNo: '2024PS01',
  phone: '9876543210',
  gender: 'FEMALE',
  idCard: 'data:image/jpeg;base64,/9j/',
  institutionId: 'cinstitution0000000000000a',
  preferredDomains: ['cdomain00000000000000000a'],
  domainId: 'cdomain00000000000000000a',
  yearSemester: '3rd Year / Semester 6',
  degree: 'B.Tech',
  contributionAreas: ['Frontend'],
  preferredTeamRole: 'Developer',
  technicalSkills: '',
  nonTechnicalSkills: '',
  linkedinUrl: '',
  githubUrl: '',
  resumeDriveLink: '',
  researchPublicationUrl: '',
  certificationsAchievements: '',
  projectInitiative: '',
  participationExperience: '',
  bio: 'I build small web tools.',
  achievements: '',
  hackathonExperience: '',
  website: '',
  ...overrides,
});

describe('form defaults', () => {
  it('starts gender empty, so the user has to choose it', () => {
    expect(INITIAL_FORM.gender).toBe('');
  });
});

describe('validateRegistration', () => {
  it('passes a complete form', () => {
    expect(validateRegistration(validForm())).toEqual({});
  });

  it('requires a gender: an untouched form must not pass (no MALE default)', () => {
    const errors = validateRegistration({ ...validForm(), ...INITIAL_FORM, gender: INITIAL_FORM.gender });
    expect(errors.gender).toMatch(/Select your gender/);
  });

  it.each([
    ['fullName', ''],
    ['email', ''],
    ['registrationNo', '   '],
    ['idCard', ''],
    ['institutionId', ''],
    ['preferredDomains', []],
    ['yearSemester', '  '],
    ['degree', ''],
    ['contributionAreas', []],
    ['preferredTeamRole', ''],
    ['bio', '   '],
  ])('reports a missing %s', (key, value) => {
    expect(validateRegistration(validForm({ [key]: value }))[key]).toBeTruthy();
  });

  it('checks name length: 2 to 120 characters', () => {
    expect(validateRegistration(validForm({ fullName: 'A' })).fullName).toMatch(/at least 2/);
    expect(validateRegistration(validForm({ fullName: 'A'.repeat(121) })).fullName).toMatch(/120/);
    expect(validateRegistration(validForm({ fullName: 'Al' }))).toEqual({});
  });

  it('year / semester must be one of the dropdown options', () => {
    expect(validateRegistration(validForm({ yearSemester: '3rd Year / Semester 6' }))).toEqual({});
    expect(validateRegistration(validForm({ yearSemester: '3rd year, sem 6' })).yearSemester).toMatch(/Select your year/);
    expect(validateRegistration(validForm({ yearSemester: '6th Year / Semester 12' }))).toEqual({});
    expect(validateRegistration(validForm({ yearSemester: '6th Year / Semester 13' })).yearSemester).toBeTruthy();
  });

  it('checks the email shape', () => {
    expect(validateRegistration(validForm({ email: 'asha@college' })).email).toBeTruthy();
    expect(validateRegistration(validForm({ email: '  asha@college.edu  ' }))).toEqual({});
  });

  it('checks the registration number length (50)', () => {
    expect(validateRegistration(validForm({ registrationNo: 'X'.repeat(51) })).registrationNo).toMatch(/50/);
  });

  it('phone is optional, but when given it must be exactly 10 digits', () => {
    expect(validateRegistration(validForm({ phone: '' }))).toEqual({});
    expect(validateRegistration(validForm({ phone: '9876543210' }))).toEqual({});
    for (const bad of ['12345', '987654321', '98765432100', '+919876543210', '98765 43210', '98765-43210', '98765abcde']) {
      expect(validateRegistration(validForm({ phone: bad })).phone, bad).toMatch(/exactly 10 digits/);
    }
  });

  it('allows at most 4 preferred domains through the picker, and 12 contribution areas', () => {
    expect(validateRegistration(validForm({ contributionAreas: Array(12).fill('x') }))).toEqual({});
    expect(validateRegistration(validForm({ contributionAreas: Array(13).fill('x') })).contributionAreas)
      .toMatch(/at most 12/);
  });

  it('caps the skills fields at 500 characters', () => {
    expect(validateRegistration(validForm({ technicalSkills: 'x'.repeat(501) })).technicalSkills).toMatch(/500/);
    expect(validateRegistration(validForm({ nonTechnicalSkills: 'x'.repeat(501) })).nonTechnicalSkills).toMatch(/500/);
    expect(validateRegistration(validForm({ technicalSkills: 'x'.repeat(500) }))).toEqual({});
  });

  it('checks each link field only when it is filled, and needs a dotted host', () => {
    expect(validateRegistration(validForm({ githubUrl: '' }))).toEqual({});
    expect(validateRegistration(validForm({ githubUrl: 'https://github.com/asha' }))).toEqual({});
    expect(validateRegistration(validForm({ linkedinUrl: 'https://localhost' })).linkedinUrl).toMatch(/complete link/);
    expect(validateRegistration(validForm({ linkedinUrl: 'ftp://files.example.com' })).linkedinUrl).toBeTruthy();
    expect(validateRegistration(validForm({ resumeDriveLink: 'not a url' })).resumeDriveLink).toBeTruthy();
  });

  it('checks the bio: required, at most 1000 characters', () => {
    expect(validateRegistration(validForm({ bio: 'x'.repeat(1000) }))).toEqual({});
    expect(validateRegistration(validForm({ bio: 'x'.repeat(1001) })).bio).toMatch(/1001\/1000/);
  });

  it('caps the long free-text fields at 1500 characters', () => {
    for (const key of ['certificationsAchievements', 'projectInitiative', 'participationExperience', 'achievements', 'hackathonExperience']) {
      expect(validateRegistration(validForm({ [key]: 'x'.repeat(1501) }))[key]).toMatch(/1501\/1500/);
      expect(validateRegistration(validForm({ [key]: 'x'.repeat(1500) }))).toEqual({});
    }
  });

  it('only ever reports fields the form knows how to focus', () => {
    // Every field broken at once: each error key must be in FIELD_ORDER,
    // or the focus-the-first-error logic would skip it.
    const broken = validForm({
      fullName: '', email: 'x', registrationNo: '', phone: 'abc', gender: '', idCard: '',
      institutionId: '', preferredDomains: [], yearSemester: '', degree: '',
      contributionAreas: [], preferredTeamRole: '', technicalSkills: 'x'.repeat(501),
      nonTechnicalSkills: 'x'.repeat(501), linkedinUrl: 'nope', githubUrl: 'nope',
      resumeDriveLink: 'nope', researchPublicationUrl: 'nope', bio: '',
      certificationsAchievements: 'x'.repeat(1501), projectInitiative: 'x'.repeat(1501),
      participationExperience: 'x'.repeat(1501), achievements: 'x'.repeat(1501),
      hackathonExperience: 'x'.repeat(1501),
    });
    const keys = Object.keys(validateRegistration(broken));
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) expect(FIELD_ORDER, key).toContain(key);
  });
});

describe('normalizeUrl', () => {
  it('adds https:// when there is no scheme', () => {
    expect(normalizeUrl('linkedin.com/in/asha')).toBe('https://linkedin.com/in/asha');
  });

  it('keeps an existing http or https scheme, in any case', () => {
    expect(normalizeUrl('http://a.example.com')).toBe('http://a.example.com');
    expect(normalizeUrl('HTTPS://a.example.com')).toBe('HTTPS://a.example.com');
  });

  it('trims spaces and returns empty for blank input', () => {
    expect(normalizeUrl('  github.com/asha  ')).toBe('https://github.com/asha');
    expect(normalizeUrl('   ')).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });
});

describe('sanitizePayload', () => {
  it('trims strings and drops the ones that are empty', () => {
    expect(sanitizePayload({ fullName: '  Asha  ', bio: '   ', phone: '' })).toEqual({ fullName: 'Asha' });
  });

  it('drops empty arrays and keeps non-empty ones', () => {
    expect(sanitizePayload({ preferredDomains: [], contributionAreas: ['AI'] })).toEqual({ contributionAreas: ['AI'] });
  });

  it('keeps other values as they are, including false and 0', () => {
    expect(sanitizePayload({ website: false, count: 0 })).toEqual({ website: false, count: 0 });
  });
});

describe('buildSubmitPayload', () => {
  it('sends the first preferred domain as the primary domainId', () => {
    const payload = buildSubmitPayload(validForm({
      preferredDomains: ['cdomain00000000000000000a', 'cdomain00000000000000000b'],
      domainId: '',
    }));
    expect(payload.domainId).toBe('cdomain00000000000000000a');
    expect(payload.preferredDomains).toEqual(['cdomain00000000000000000a', 'cdomain00000000000000000b']);
  });

  it('keeps the form values it does not change', () => {
    const payload = buildSubmitPayload(validForm({ fullName: '  Asha  ' }));
    expect(payload.fullName).toBe('Asha');
    expect(payload.gender).toBe('FEMALE');
  });

  it('sends the gender only once it has been picked', () => {
    expect(buildSubmitPayload(validForm({ gender: '' })).gender).toBeUndefined();
  });
});
