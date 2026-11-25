import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrationSchema } from '../../src/validators/registration.schema.js';
import { validBody } from './helpers.js';

// Returns the field errors for a body that should fail, or fails the test.
const fieldErrors = (body) => {
  const r = registrationSchema.safeParse(body);
  assert.equal(r.success, false, 'expected validation to fail');
  return r.error.flatten().fieldErrors;
};
const parsed = (body) => {
  const r = registrationSchema.safeParse(body);
  assert.equal(r.success, true, JSON.stringify(r.error?.flatten().fieldErrors));
  return r.data;
};

test('a complete body passes and is cleaned up', () => {
  const data = parsed(validBody());
  assert.equal(data.email, 'asha.kumar@college.edu', 'email is trimmed and lower-cased');
  assert.equal(data.registrationNo, '2024PS01', 'registration number is normalized');
  assert.equal(data.idCard.mimeType, 'image/jpeg');
  assert.ok(data.idCard.data.length > 0, 'id card is decoded to bytes');
});

test('an unknown field such as the honeypot is dropped', () => {
  const data = parsed(validBody({ website: 'spam' }));
  assert.equal('website' in data, false);
});

test('the required text fields each report their own message', () => {
  for (const key of ['fullName', 'email', 'registrationNo', 'institutionId', 'domainId', 'degree', 'yearSemester', 'preferredTeamRole', 'gender', 'bio', 'idCard']) {
    const body = validBody();
    delete body[key];
    assert.ok(fieldErrors(body)[key], `missing ${key} should be reported`);
  }
});

test('year / semester must be one of the dropdown options', () => {
  for (const opt of ['1st Year / Semester 1', '2nd Year / Semester 4', '3rd Year / Semester 6', '4th Year / Semester 8']) {
    assert.equal(parsed(validBody({ yearSemester: opt })).yearSemester, opt);
  }
  assert.ok(fieldErrors(validBody({ yearSemester: '3rd year, sem 6' })).yearSemester);
  assert.equal(parsed(validBody({ yearSemester: '6th Year / Semester 12' })).yearSemester, '6th Year / Semester 12');
  assert.ok(fieldErrors(validBody({ yearSemester: '6th Year / Semester 13' })).yearSemester);
  assert.ok(fieldErrors(validBody({ yearSemester: '7th Year / Semester 13' })).yearSemester);
});

test('full name length is 2 to 120 characters', () => {
  assert.ok(fieldErrors(validBody({ fullName: 'A' })).fullName);
  assert.ok(fieldErrors(validBody({ fullName: 'A'.repeat(121) })).fullName);
  assert.ok(parsed(validBody({ fullName: '  Al  ' })).fullName);
});

test('email must look like an email', () => {
  assert.ok(fieldErrors(validBody({ email: 'not-an-email' })).email);
});

test('registration number is required and at most 50 characters', () => {
  assert.ok(fieldErrors(validBody({ registrationNo: '   ' })).registrationNo);
  assert.ok(fieldErrors(validBody({ registrationNo: 'X'.repeat(51) })).registrationNo);
});

test('gender must be one of the allowed values', () => {
  assert.ok(fieldErrors(validBody({ gender: '' })).gender);
  assert.ok(fieldErrors(validBody({ gender: 'UNKNOWN' })).gender);
  for (const g of ['MALE', 'FEMALE', 'OTHER']) assert.equal(parsed(validBody({ gender: g })).gender, g);
});

test('institution and domain must be ids of the right shape', () => {
  assert.ok(fieldErrors(validBody({ institutionId: 'not-a-cuid' })).institutionId);
  assert.ok(fieldErrors(validBody({ domainId: 'nope' })).domainId);
});

test('preferred domains: at least one, at most four', () => {
  assert.ok(fieldErrors(validBody({ preferredDomains: [] })).preferredDomains);
  const five = Array.from({ length: 5 }, (_, i) => `cdomain0000000000000000${String.fromCharCode(97 + i)}`);
  assert.ok(fieldErrors(validBody({ preferredDomains: five })).preferredDomains);
  assert.equal(parsed(validBody({ preferredDomains: five.slice(0, 4) })).preferredDomains.length, 4);
});

test('contribution areas: at least one, at most twelve', () => {
  assert.ok(fieldErrors(validBody({ contributionAreas: [] })).contributionAreas);
  const thirteen = Array.from({ length: 13 }, (_, i) => `Area ${i}`);
  assert.ok(fieldErrors(validBody({ contributionAreas: thirteen })).contributionAreas);
});

test('bio is required and at most 1000 characters', () => {
  assert.ok(fieldErrors(validBody({ bio: '' })).bio);
  assert.ok(fieldErrors(validBody({ bio: 'x'.repeat(1001) })).bio);
  assert.ok(parsed(validBody({ bio: 'x'.repeat(1000) })).bio);
});

test('phone is optional; when given it must be exactly 10 digits', () => {
  assert.equal(parsed(validBody({ phone: undefined })).phone, undefined);
  assert.equal(parsed(validBody({ phone: '9876543210' })).phone, '9876543210');
  assert.equal(parsed(validBody({ phone: '  9876543210  ' })).phone, '9876543210', 'surrounding spaces are trimmed');
  for (const bad of ['12', '987654321', '98765432100', '+919876543210', '98765 43210', '98765-43210', 'call me', '98765abcde']) {
    assert.ok(fieldErrors(validBody({ phone: bad })).phone, `${bad} must be rejected`);
  }
});

test('an empty optional link becomes undefined; a bad link is rejected', () => {
  assert.equal(parsed(validBody({ linkedinUrl: '' })).linkedinUrl, undefined);
  assert.equal(parsed(validBody({ githubUrl: 'https://github.com/asha' })).githubUrl, 'https://github.com/asha');
  assert.ok(fieldErrors(validBody({ linkedinUrl: 'linkedin.com/in/asha' })).linkedinUrl);
  assert.ok(fieldErrors(validBody({ portfolioUrl: 'https://' + 'a'.repeat(500) + '.dev' })).portfolioUrl);
});

test('long free-text fields have their own limits', () => {
  assert.ok(fieldErrors(validBody({ technicalSkills: 'x'.repeat(501) })).technicalSkills);
  assert.ok(fieldErrors(validBody({ nonTechnicalSkills: 'x'.repeat(501) })).nonTechnicalSkills);
  assert.ok(fieldErrors(validBody({ achievements: 'x'.repeat(1501) })).achievements);
  assert.ok(parsed(validBody({ achievements: 'x'.repeat(1500) })).achievements);
});

test('the ID card must be a supported image', () => {
  assert.ok(fieldErrors(validBody({ idCard: 'data:image/gif;base64,AAAA' })).idCard);
  assert.ok(fieldErrors(validBody({ idCard: 'hello' })).idCard);
});

test('LinkedIn must be a linkedin.com profile link', () => {
  for (const ok of ['https://linkedin.com/in/asha', 'https://www.linkedin.com/in/asha-k/', 'https://in.linkedin.com/in/asha']) {
    assert.equal(parsed(validBody({ linkedinUrl: ok })).linkedinUrl, ok);
  }
  for (const bad of [
    'https://linkedin.com/company/acme',
    'https://linkedin.com/in/',
    'https://evil-linkedin.com/in/asha',
    'https://notlinkedin.com/in/asha',
    'linkedin.com/in/asha',
    'ftp://linkedin.com/in/asha',
  ]) {
    assert.ok(fieldErrors(validBody({ linkedinUrl: bad })).linkedinUrl, `${bad} must be rejected`);
  }
});

test('GitHub must be a github.com profile link', () => {
  for (const ok of ['https://github.com/asha', 'https://github.com/asha-k', 'https://www.github.com/a1b2']) {
    assert.equal(parsed(validBody({ githubUrl: ok })).githubUrl, ok);
  }
  for (const bad of [
    'https://github.com/asha/repo',
    'https://github.com/-bad',
    'https://github.com/bad-',
    'https://github.com/',
    'https://gist.github.com/asha',
    'https://github.com.evil.example/asha',
    'https://' + 'a'.repeat(40) + '.example.com',
  ]) {
    assert.ok(fieldErrors(validBody({ githubUrl: bad })).githubUrl, `${bad} must be rejected`);
  }
});

test('the resume must be a Google Drive file link', () => {
  assert.equal(
    parsed(validBody({ resumeDriveLink: 'https://drive.google.com/file/d/abc123/view?usp=sharing' })).resumeDriveLink,
    'https://drive.google.com/file/d/abc123/view?usp=sharing',
  );
  for (const bad of [
    'https://drive.google.com/drive/folders/abc',
    'https://drive.google.com/',
    'https://docs.google.com/document/d/abc',
    'https://example.com/resume.pdf',
  ]) {
    assert.ok(fieldErrors(validBody({ resumeDriveLink: bad })).resumeDriveLink, `${bad} must be rejected`);
  }
});
