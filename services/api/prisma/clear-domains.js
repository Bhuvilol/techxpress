// One-off, for when the domain and problem statement list is replaced:
// clears every student's 4 domain picks (and main domain) and every forming
// team's problem statement, so they choose again from the new list. The
// portal then asks each student to pick 4 domains again.
//
//   node prisma/clear-domains.js           dry run: prints counts, changes nothing
//   node prisma/clear-domains.js --apply   makes the changes (in one transaction)
//
// Finalized or qualified teams keep their problem statement.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }),
});

const students = { role: 'STUDENT', OR: [{ domainId: { not: null } }, { NOT: { preferredDomains: { isEmpty: true } } }] };
const teams = { status: 'FORMING', psId: { not: null } };

try {
  const [studentCount, teamCount] = await Promise.all([
    prisma.user.count({ where: students }),
    prisma.team.count({ where: teams }),
  ]);
  console.log(`Students whose domains would be cleared: ${studentCount}`);
  console.log(`Forming teams whose problem statement would be cleared: ${teamCount}`);

  if (!apply) {
    console.log('Dry run: nothing changed. Run with --apply to make these changes.');
  } else {
    const [u, t] = await prisma.$transaction([
      prisma.user.updateMany({ where: students, data: { domainId: null, preferredDomains: [] } }),
      prisma.team.updateMany({ where: teams, data: { psId: null } }),
    ]);
    console.log(`Cleared: ${u.count} students, ${t.count} teams.`);
  }
} finally {
  await prisma.$disconnect();
}
