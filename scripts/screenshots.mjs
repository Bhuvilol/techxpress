// Real render check for the train site: opens it in headless Chromium at
// several screen sizes, saves screenshots and fails on any console error or
// uncaught page error (lint and build once missed a runtime crash).
//
//   node scripts/screenshots.mjs <base-url> <out-dir> [--reduced] [--hash=timetable] [--only=laptop,iphone]
//
// Needs Playwright's Chromium: `npx playwright install chromium` (local only).

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const VIEWPORTS = {
  laptop: { width: 1440, height: 900 },
  'full-hd': { width: 1920, height: 1080 },
  small: { width: 1280, height: 720 },
  ultrawide: { width: 2560, height: 1080 },
  ipad: { width: 820, height: 1180, mobile: true },
  iphone: { width: 390, height: 844, mobile: true },
  android: { width: 360, height: 800, mobile: true },
  'android-big': { width: 412, height: 915, mobile: true },
};

const [base = 'http://localhost:4173', out = 'screenshots', ...flags] = process.argv.slice(2);
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const names = opt.only ? String(opt.only).split(',') : Object.keys(VIEWPORTS);
const hash = opt.hash ? `#${opt.hash}` : '';
const wait = Number(opt.wait ?? 2500);

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const name of names) {
  const vp = VIEWPORTS[name];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: Boolean(vp.mobile),
    hasTouch: Boolean(vp.mobile),
    reducedMotion: opt.reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`[${name}] console: ${msg.text()}`); });
  page.on('pageerror', (err) => problems.push(`[${name}] page error: ${err.message}`));
  await page.goto(`${base}/${hash}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  const file = join(out, `${name}${opt.reduced ? '-reduced' : ''}${opt.hash ? `-${opt.hash}` : ''}.png`);
  await page.screenshot({ path: file });
  console.log(`saved ${file}`);
  await context.close();
}

await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('\nno console or page errors');
