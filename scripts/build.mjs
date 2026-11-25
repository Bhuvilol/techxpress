// Builds both frontends and assembles the Worker's static folder:
//
//   apps/site   -> dist/          (train experience, served at /)
//   apps/portal -> dist/vortex/   (VORTEX portal, Vite base /vortex/)
//
// Usage:
//   node scripts/build.mjs               install each app (npm ci), then build
//   node scripts/build.mjs --no-install  build with the node_modules already there
//
// The site (its registration form) and the portal both need VITE_API_URL at
// build time (the Cloud Run URL in production). It is read from the
// environment, as Vite normally does.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = join(root, 'dist');
const install = !process.argv.includes('--no-install');

const apps = [
  { name: 'site', dir: join(root, 'apps/site'), target: out },
  { name: 'portal', dir: join(root, 'apps/portal'), target: join(out, 'vortex') },
];

const run = (cwd, args) => {
  console.log(`\n> (${cwd.replace(root + '/', '')}) npm ${args.join(' ')}`);
  const result = spawnSync('npm', args, { cwd, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`\nbuild failed: npm ${args.join(' ')} in ${cwd}`);
    process.exit(result.status ?? 1);
  }
};

if (!process.env.VITE_API_URL) {
  console.warn('warning: VITE_API_URL is not set; the site (registration) and the portal will call the API on their own origin, which the Worker does not serve.');
}

for (const app of apps) {
  if (install) run(app.dir, ['ci', '--no-audit', '--no-fund']);
  run(app.dir, ['run', 'build']);
}

rmSync(out, { recursive: true, force: true });
for (const app of apps) {
  cpSync(join(app.dir, 'dist'), app.target, { recursive: true });
}

for (const page of ['index.html', 'vortex/index.html']) {
  if (!existsSync(join(out, page))) {
    console.error(`build failed: dist/${page} is missing`);
    process.exit(1);
  }
}

console.log('\nbuilt dist/ (site) and dist/vortex/ (portal)');
