import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDomainExpertFor, countDomainExperts, DOMAIN_EXPERT_SOURCES } from '../../src/utils/domainExperts.js';

const m = (institution, branch = null) => ({ institution, branch });

test('institution-based domains', () => {
  assert.equal(isDomainExpertFor(m('SNIL | SOA'), 'Law'), true);
  assert.equal(isDomainExpertFor(m('IMS & SUM | SOA'), 'Health'), true);
  assert.equal(isDomainExpertFor(m('SNC | SOA'), 'Health'), true);
  assert.equal(isDomainExpertFor(m('IBCS | SOA'), 'Hospital Management'), true);
  assert.equal(isDomainExpertFor(m('IBCS | SOA'), 'Management'), true);
  assert.equal(isDomainExpertFor(m('IAS | SOA'), 'Agriculture'), true);
  assert.equal(isDomainExpertFor(m('SPS | SOA'), 'Biotechnology & Pharmacy'), true);
});

test('ITER branch-based domains', () => {
  for (const b of ['ECE', 'EEE', 'EE']) assert.equal(isDomainExpertFor(m('ITER | SOA', b), 'Electrical'), true, b);
  for (const b of ['Mech', 'Civil']) assert.equal(isDomainExpertFor(m('ITER | SOA', b), 'Mechanical'), true, b);
  assert.equal(isDomainExpertFor(m('ITER | SOA', 'CSE Core'), 'Electrical'), false);
  assert.equal(isDomainExpertFor(m('ITER | SOA', 'EE'), 'Mechanical'), false);
  assert.equal(isDomainExpertFor(m('ITER | SOA', null), 'Electrical'), false, 'no branch set');
});

test('the wrong institution or domain never counts', () => {
  assert.equal(isDomainExpertFor(m('IBCS | SOA'), 'Law'), false);
  assert.equal(isDomainExpertFor(m('SNIL | SOA'), 'Electrical'), false);
  assert.equal(isDomainExpertFor(m('SPS | SOA', 'EE'), 'Electrical'), false, 'branch only counts for ITER');
  assert.equal(isDomainExpertFor(m('IBCS | SOA'), 'Unknown domain'), false);
  assert.equal(isDomainExpertFor(m(null), 'Law'), false);
});

test('counting a team', () => {
  const team = [m('ITER | SOA', 'CSE Core'), m('ITER | SOA', 'EE'), m('ITER | SOA', 'ECE'), m('IBCS | SOA')];
  assert.equal(countDomainExperts(team, 'Electrical'), 2);
  assert.equal(countDomainExperts(team, 'Management'), 1);
  assert.equal(countDomainExperts(team, 'Law'), 0);
});

test('the table covers every domain in the taxonomy', async () => {
  const { readFile } = await import('node:fs/promises');
  const taxonomy = JSON.parse(await readFile(new URL('../../prisma/data/taxonomy.json', import.meta.url)));
  const names = taxonomy.domains.map((d) => d.name ?? d);
  assert.deepEqual(names.filter((n) => !DOMAIN_EXPERT_SOURCES[n]), []);
});

test('every institution and ITER branch in the table exists', async () => {
  const { readFile } = await import('node:fs/promises');
  const { BRANCH_OPTIONS } = await import('../../src/validators/registration.schema.js');
  const taxonomy = JSON.parse(await readFile(new URL('../../prisma/data/taxonomy.json', import.meta.url)));
  const institutions = new Set(taxonomy.institutions.map((i) => i.name ?? i));
  for (const [domain, src] of Object.entries(DOMAIN_EXPERT_SOURCES)) {
    for (const i of src.institutions ?? []) assert.ok(institutions.has(i), `${domain}: unknown institution ${i}`);
    for (const b of src.iterBranches ?? []) assert.ok(BRANCH_OPTIONS.includes(b), `${domain}: unknown branch ${b}`);
  }
});
