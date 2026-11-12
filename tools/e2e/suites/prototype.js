// prototype.js — the claude.ai prototype build: sample data, the demo estimator, and the
// message that saving files only works in the real app.

import { execFileSync } from 'node:child_process';
import { check, newPhone, onboard, serve, text } from '../helpers.js';

export async function prototypeSuite(browser, { repoRoot, screenshots }) {
  execFileSync('bash', ['tools/prototype/build.sh'], { cwd: repoRoot, stdio: 'ignore' });
  const server = await serve(`${repoRoot}/build/prototype`);
  const { context, page } = await newPhone(browser);
  await page.goto(server.url);
  await onboard(page);
  await page.click('#proto-sample');
  await page.waitForTimeout(1800);
  check('sample data fills the week strip', (await page.locator('.week-names span').count()) > 0);
  await page.click('[data-tab="dashboard"]');
  await page.waitForSelector('.weight-card');
  check('sample weigh-ins give a pace on the Weight card', (await text(page, '.weight-pace')).startsWith('At'));
  await page.click('[data-tab="macros"]');
  await page.click('.examples .chip >> nth=0');
  await page.click('.send-button');
  await page.waitForSelector('.estimate-card');
  check('the demo estimator answers (and says it’s a demo)', await page.isVisible('.demo-note'));
  await page.click('[data-tab="settings"]');
  await page.click('[data-open="backup"]');
  await page.waitForSelector('.toast');
  check('backups in the prototype explain they need the real app', (await page.textContent('.toast span')).includes('only works in the real app'));
  await page.click('#proto-clear'); await page.click('#proto-clear');
  await page.waitForSelector('[data-stats]');
  check('Clear (twice) starts over at the welcome screen', true);
  if (screenshots) await page.screenshot({ path: `${screenshots}/prototype.png` });
  check('Prototype: no page errors', page.errors.filter((e) => !e.includes('404')).length === 0, page.errors.join('; '));
  await context.close();
  await server.close();
}
