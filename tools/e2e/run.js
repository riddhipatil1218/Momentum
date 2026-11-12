// run.js — runs all the click-through tests and prints a summary.
//
//   npm run e2e                     run everything
//   npm run e2e -- today macros     run only some suites
//   npm run e2e -- --screenshots    also save phone screenshots to tools/e2e/screenshots/
//
// See tools/e2e/README.md for the one-time setup.

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allResults, loadPlaywright, serve } from './helpers.js';
import { backupSuite } from './suites/backup.js';
import { calendarSuite } from './suites/calendar.js';
import { dashboardSuite } from './suites/dashboard.js';
import { macrosSuite } from './suites/macros.js';
import { prototypeSuite } from './suites/prototype.js';
import { todaySuite } from './suites/today.js';
import { upgradeSuite } from './suites/upgrade.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

const SUITES = {
  upgrade: ['Database upgrades keep your data', upgradeSuite],
  today: ['Welcome screen and Today', todaySuite],
  calendar: ['Calendar', calendarSuite],
  macros: ['Macros (fake Anthropic server)', macrosSuite],
  dashboard: ['Dashboard: calorie balance and weight', dashboardSuite],
  backup: ['Backup and restore', backupSuite],
  prototype: ['claude.ai prototype build', prototypeSuite],
};

const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith('--'));
const screenshots = args.includes('--screenshots') ? resolve(here, 'screenshots') : null;
if (screenshots) await mkdir(screenshots, { recursive: true });
const unknown = wanted.filter((name) => !SUITES[name]);
if (unknown.length) {
  console.error(`Unknown suite: ${unknown.join(', ')}. Choose from: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const server = await serve(resolve(repoRoot, 'app'));
const options = { appUrl: server.url, repoRoot, screenshots, iconPath: resolve(repoRoot, 'app/icons/icon-512.png') };

let crashed = false;
for (const [name, [title, suite]] of Object.entries(SUITES)) {
  if (wanted.length && !wanted.includes(name)) continue;
  console.log(`\n${title}`);
  try {
    await suite(browser, options);
  } catch (error) {
    crashed = true;
    console.log(`  ✗ stopped early: ${error.message.split('\n')[0]}`);
  }
}

await browser.close();
await server.close();

const results = allResults();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed${crashed ? ' (a suite stopped early)' : ''}.`);
if (screenshots) console.log(`Screenshots saved in ${screenshots}`);
process.exit(failed.length || crashed ? 1 : 0);
