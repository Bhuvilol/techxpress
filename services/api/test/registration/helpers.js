// Shared test setup for the registration tests.
//
// The real modules are loaded, but the database, env, bcrypt and the Prisma
// error class are replaced with fakes. Call `install()` before importing any
// module from src/ (each test file runs in its own process, so mocks never leak).

import { mock } from 'node:test';

const src = (path) => new URL(`../../src/${path}`, import.meta.url).href;

// Fake Prisma client. Each method is a mock.fn so tests can set results and
// check calls. `reset()` restores the defaults between tests.
const defaults = () => ({
  institution: { findUnique: async () => ({ id: 'cinstitution0000000000000a' }) },
  domain: { count: async () => 1 },
  user: {
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'cuser0000000000000000000', publicId: data.publicId, fullName: data.fullName, email: data.email }),
    findUnique: async () => null,
    update: async ({ where, data }) => ({ id: where.id, email: 'asha@college.edu', fullName: 'Asha Kumar', ...data }),
    aggregate: async () => ({ _max: { seatNo: null } }),
  },
  hackathonRules: { findUnique: async () => ({ id: 'rules', registrationOpen: true }) },
  collegeRegistry: { findUnique: async () => null },
  studentIdCard: { deleteMany: async () => ({ count: 0 }) },
});

export const prisma = {};
const wrap = (obj) => {
  for (const [model, methods] of Object.entries(obj)) {
    prisma[model] = {};
    for (const [name, impl] of Object.entries(methods)) prisma[model][name] = mock.fn(impl);
  }
};
wrap(defaults());
// Interactive transactions just run the callback here (no real rollback).
prisma.$transaction = mock.fn(async (fn) => fn(prisma));
prisma.$executeRaw = mock.fn(async () => 1);

// Put every fake back to its default and clear recorded calls.
export const reset = () => {
  for (const key of Object.keys(prisma)) for (const fn of Object.values(prisma[key])) fn.mock.resetCalls();
  wrap(defaults());
  prisma.$transaction = mock.fn(async (fn) => fn(prisma));
  prisma.$executeRaw = mock.fn(async () => 1);
};

let installed = false;
export const install = () => {
  if (installed) return;
  installed = true;
  mock.module(src('config/env.js'), {
    namedExports: {
      env: {
        NODE_ENV: 'test', LOG_LEVEL: 'error', BCRYPT_ROUNDS: 4, TRUST_PROXY_HOPS: 1,
        CORS_ORIGIN: [], ENABLE_TESTING_IMPORT: false, ACCESS_TOKEN_SECRET: 'x'.repeat(32), ACCESS_TOKEN_EXPIRY: '2h',
      },
      isProd: false,
      isDev: false,
    },
  });
  mock.module(src('config/db.js'), { namedExports: { prisma } });
  mock.module('bcrypt', {
    defaultExport: { hash: async () => '$2b$04$fakehash', compare: async () => true },
  });
  mock.module('@prisma/client', {
    namedExports: {
      Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {} },
    },
  });
};

// A valid registration body, as the browser sends it (strings, not parsed yet).
// idCard is a tiny JPEG (signature FF D8 FF) as a data URL.
export const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
export const validBody = (overrides = {}) => ({
  fullName: 'Asha Kumar',
  email: 'Asha.Kumar@College.edu',
  registrationNo: '2024 ps 01',
  institutionId: 'cinstitution0000000000000a',
  domainId: 'cdomain00000000000000000a',
  preferredDomains: ['cdomain00000000000000000a'],
  degree: 'B.Tech',
  yearSemester: '3rd Year / Semester 6',
  contributionAreas: ['Frontend'],
  preferredTeamRole: 'Developer',
  gender: 'FEMALE',
  bio: 'I build small web tools.',
  idCard: `data:image/jpeg;base64,${JPEG_BYTES.toString('base64')}`,
  ...overrides,
});
