import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import 'dotenv/config';

// ─────────────────────────────────────────────────────────────────────────────
// Idempotent seed. Safe to run again: every write is an upsert keyed on a
// natural identifier, and nothing is overwritten that an admin may have
// changed (rules, round state, existing passwords).
//
//   node prisma/seed.js            production: real staff list required
//   node prisma/seed.js --dev      local: dev staff, sample registry rows,
//                                  registration open, default admin password
//   node prisma/seed.js --prune    also delete institutions, domains and
//                                  problem statements that are not in
//                                  data/taxonomy.json (skipping any in use)
//
// What it seeds:
//   - HackathonRules and RoundControl singletons, created only if missing
//     (data/rules.json; all rounds LOCKED)
//   - Institutions, domains, problem statements (data/taxonomy.json)
//   - The admin: ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD (required outside --dev)
//   - Staff (jury, coordinators, more admins) from STAFF_SEED_JSON, else
//     prisma/staff.local.json (git-ignored), else data/staff.dev.json with
//     --dev. Format: [{ "fullName", "email", "role", "institution"? }]
//     Each new staff account gets a random 6-digit login code, stored hashed
//     on the user and readable in StaffCredential for Admin → Staff.
//   - With --dev only: sample CollegeRegistry rows (data/registry.dev.json)
//
// It never prints a password.
// ─────────────────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const DEV = args.has('--dev');
const PRUNE = args.has('--prune');

const dataPath = (name) => fileURLToPath(new URL(`./data/${name}`, import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const log = (msg) => console.log(`[seed] ${msg}`);
const fail = (msg) => {
  console.error(`[seed] ${msg}`);
  process.exit(1);
};

if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set');
const ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }),
});

// Same format as the student codes issued on verification (utils/crypto.js),
// generated here so the seed doesn't need the API's full environment.
const generateSixDigitCode = () => String(randomInt(100000, 1_000_000));

// ── input validation ────────────────────────────────────────────────────────

const staffSchema = z.array(z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['JURY', 'COORDINATOR', 'ADMIN']),
  institution: z.string().trim().min(1).optional(),
}).refine((s) => s.role !== 'COORDINATOR' || s.institution, {
  message: 'coordinators need an institution',
}));

const taxonomySchema = z.object({
  institutions: z.array(z.string().trim().min(1)).min(1),
  domains: z.array(z.string().trim().min(1)).min(1),
  problemStatements: z.array(z.object({
    domain: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
  })),
});

const parseOrFail = (schema, value, label) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    fail(`${label} is invalid:\n${JSON.stringify(parsed.error.flatten(), null, 2)}`);
  }
  return parsed.data;
};

const loadStaff = () => {
  if (process.env.STAFF_SEED_JSON) {
    let raw;
    try { raw = JSON.parse(process.env.STAFF_SEED_JSON); }
    catch { fail('STAFF_SEED_JSON is not valid JSON'); }
    return { source: 'STAFF_SEED_JSON', staff: parseOrFail(staffSchema, raw, 'STAFF_SEED_JSON') };
  }
  const local = fileURLToPath(new URL('./staff.local.json', import.meta.url));
  if (existsSync(local)) {
    return { source: 'prisma/staff.local.json', staff: parseOrFail(staffSchema, readJson(local), 'staff.local.json') };
  }
  if (DEV) {
    return { source: 'data/staff.dev.json', staff: parseOrFail(staffSchema, readJson(dataPath('staff.dev.json')), 'staff.dev.json') };
  }
  return { source: null, staff: [] };
};

// ── singletons ──────────────────────────────────────────────────────────────

const seedRules = async () => {
  const defaults = readJson(dataPath('rules.json'));
  const rules = await prisma.hackathonRules.upsert({
    where: { id: 'rules' },
    update: {}, // never overwrite the admin's settings
    create: { id: 'rules', ...defaults, ...(DEV ? { registrationOpen: true } : {}) },
  });
  log(`Rules ready (registration ${rules.registrationOpen ? 'OPEN' : 'CLOSED'})`);
};

const seedRoundControl = async () => {
  await prisma.roundControl.upsert({
    where: { id: 'round_control' },
    update: {},
    create: { id: 'round_control', round1State: 'LOCKED', round2State: 'LOCKED', round3State: 'LOCKED' },
  });
  log('Round control ready');
};

// ── taxonomy ────────────────────────────────────────────────────────────────

const seedTaxonomy = async (taxonomy) => {
  for (const name of taxonomy.institutions) {
    await prisma.institution.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of taxonomy.domains) {
    await prisma.domain.upsert({ where: { name }, update: {}, create: { name } });
  }

  const domainByName = Object.fromEntries((await prisma.domain.findMany()).map((d) => [d.name, d.id]));
  let created = 0;
  for (const { domain, title, description } of taxonomy.problemStatements) {
    const domainId = domainByName[domain];
    if (!domainId) fail(`problem statement "${title}" names unknown domain "${domain}"`);
    const existing = await prisma.problemStatement.findFirst({ where: { title, domainId }, select: { id: true } });
    if (!existing) {
      await prisma.problemStatement.create({ data: { title, description, domainId } });
      created += 1;
    }
  }
  log(`Taxonomy: ${taxonomy.institutions.length} institutions, ${taxonomy.domains.length} domains, `
    + `${taxonomy.problemStatements.length} problem statements (${created} new)`);
};

// Only with --prune. Rows still referenced by users, teams or the registry
// are kept and reported.
const pruneTaxonomy = async (taxonomy) => {
  const keep = new Set(taxonomy.problemStatements.map((p) => `${p.domain}::${p.title}`));
  const statements = await prisma.problemStatement.findMany({
    select: { id: true, title: true, domain: { select: { name: true } }, _count: { select: { teams: true } } },
  });
  const removablePs = statements.filter((ps) => !keep.has(`${ps.domain.name}::${ps.title}`) && ps._count.teams === 0);
  if (removablePs.length) {
    await prisma.problemStatement.deleteMany({ where: { id: { in: removablePs.map((ps) => ps.id) } } });
  }

  const domains = await prisma.domain.findMany({
    where: { name: { notIn: taxonomy.domains } },
    include: { _count: { select: { users: true, problemStatements: true, teams: true } } },
  });
  let removedDomains = 0;
  for (const d of domains) {
    const { users, problemStatements, teams } = d._count;
    if (users + problemStatements + teams > 0) { log(`  kept domain "${d.name}" (in use)`); continue; }
    await prisma.domain.delete({ where: { id: d.id } });
    removedDomains += 1;
  }

  const institutions = await prisma.institution.findMany({
    where: { name: { notIn: taxonomy.institutions } },
    include: { _count: { select: { users: true, registry: true } } },
  });
  let removedInstitutions = 0;
  for (const i of institutions) {
    if (i._count.users + i._count.registry > 0) { log(`  kept institution "${i.name}" (in use)`); continue; }
    await prisma.institution.delete({ where: { id: i.id } });
    removedInstitutions += 1;
  }

  log(`Pruned: ${removablePs.length} problem statements, ${removedDomains} domains, ${removedInstitutions} institutions`);
};

// ── people ──────────────────────────────────────────────────────────────────

const loadAdmin = () => {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase() || (DEV ? 'admin@example.test' : null);
  const password = process.env.ADMIN_SEED_PASSWORD || (DEV ? 'admin12345' : null);
  if (!email || !password) fail('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required (or run with --dev)');
  if (!z.string().email().safeParse(email).success) fail('ADMIN_SEED_EMAIL is not a valid email');
  if (!DEV && password.length < 12) fail('ADMIN_SEED_PASSWORD must be at least 12 characters');
  return { email, password };
};

const seedAdmin = async ({ email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing && existing.role !== 'ADMIN') fail(`${email} already exists with role ${existing.role}`);
  if (existing) {
    log(`Admin exists (${email}); password left unchanged`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      fullName: 'TechXpress Admin',
      role: 'ADMIN',
      verificationStatus: 'VERIFIED',
      passwordHash: await bcrypt.hash(password, ROUNDS),
      passwordIssuedAt: new Date(),
    },
  });
  log(`Admin created (${email})`);
};

const seedStaff = async ({ source, staff }) => {
  if (!source) {
    log('Staff: none (set STAFF_SEED_JSON or add prisma/staff.local.json)');
    return;
  }

  const instByName = Object.fromEntries((await prisma.institution.findMany()).map((i) => [i.name, i.id]));
  let created = 0;
  let codesIssued = 0;

  for (const person of staff) {
    const institutionId = person.institution ? instByName[person.institution] : null;
    if (person.institution && !institutionId) fail(`${person.email}: unknown institution "${person.institution}"`);

    const existing = await prisma.user.findUnique({
      where: { email: person.email },
      select: { id: true, role: true, passwordHash: true, staffCredential: { select: { userId: true } } },
    });
    if (existing?.role === 'STUDENT') fail(`${person.email} is already a student account`);

    // A new account, or a staff account that never got a code, gets one.
    // Existing passwords are never changed.
    const needsCode = !existing || (!existing.passwordHash && !existing.staffCredential);
    const code = needsCode ? generateSixDigitCode() : null;
    const passwordData = code
      ? { passwordHash: await bcrypt.hash(code, ROUNDS), passwordIssuedAt: new Date() }
      : {};

    await prisma.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
          where: { id: existing.id },
          data: { fullName: person.fullName, role: person.role, institutionId, verificationStatus: 'VERIFIED', ...passwordData },
          select: { id: true },
        })
        : await tx.user.create({
          data: {
            email: person.email,
            fullName: person.fullName,
            role: person.role,
            institutionId,
            verificationStatus: 'VERIFIED',
            ...passwordData,
          },
          select: { id: true },
        });
      if (code) {
        await tx.staffCredential.upsert({
          where: { userId: user.id },
          update: { password: code },
          create: { userId: user.id, password: code },
        });
      }
    });

    if (!existing) created += 1;
    if (code) codesIssued += 1;
  }

  log(`Staff from ${source}: ${staff.length} ensured, ${created} new, ${codesIssued} login codes issued (see Admin → Staff)`);
};

const seedDevRegistry = async () => {
  const rows = readJson(dataPath('registry.dev.json'));
  const instByName = Object.fromEntries((await prisma.institution.findMany()).map((i) => [i.name, i.id]));
  for (const { registrationNo, fullName, email, institution } of rows) {
    const institutionId = instByName[institution];
    if (!institutionId) continue;
    await prisma.collegeRegistry.upsert({
      where: { registrationNo },
      update: { fullName, email, institutionId },
      create: { registrationNo, fullName, email, institutionId },
    });
  }
  log(`Registry (dev samples): ${rows.length} ensured`);
};

// ── orchestration ──────────────────────────────────────────────────────────

const main = async () => {
  log(`start${DEV ? ' (dev)' : ''}${PRUNE ? ' (prune)' : ''}`);

  // Validate every input before writing anything.
  const taxonomy = parseOrFail(taxonomySchema, readJson(dataPath('taxonomy.json')), 'data/taxonomy.json');
  const admin = loadAdmin();
  const staff = loadStaff();
  const emails = staff.staff.map((s) => s.email);
  const duplicate = emails.find((e, i) => emails.indexOf(e) !== i);
  if (duplicate) fail(`staff list has ${duplicate} twice`);
  if (emails.includes(admin.email)) fail(`${admin.email} is both ADMIN_SEED_EMAIL and in the staff list`);
  const unknownInstitution = staff.staff.find((s) => s.institution && !taxonomy.institutions.includes(s.institution));
  if (unknownInstitution) fail(`${unknownInstitution.email}: unknown institution "${unknownInstitution.institution}"`);

  await seedRules();
  await seedRoundControl();
  await seedTaxonomy(taxonomy);
  if (PRUNE) await pruneTaxonomy(taxonomy);
  await seedAdmin(admin);
  await seedStaff(staff);
  if (DEV) await seedDevRegistry();
  log('done');
};

main()
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
