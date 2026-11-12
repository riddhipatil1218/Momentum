// backup.js — Back up now, spreadsheet export, and restoring on a "new phone"
// (a fresh browser profile) from the welcome screen. Backups must never contain the API key.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { check, dayAgo, newPhone, onboard, putRecords, text } from '../helpers.js';

export async function backupSuite(browser, { appUrl }) {
  const { context, page } = await newPhone(browser, { acceptDownloads: true });
  await page.goto(appUrl);
  await onboard(page);
  await putRecords(page, {
    meals: [{ id: 'm1', ...dayAgo(0, 12), name: 'Lunch', calories: 500, proteinG: 30, carbsG: 50, fatG: 15, assumptions: [] }],
    workouts: [{ id: 'w1', ...dayAgo(0, 7), activityName: 'Running', emoji: '🏃‍♀️', detailKind: 'running', durationMinutes: 30, notes: '' }],
    weights: [{ id: 'kg1', ...dayAgo(0, 7), pounds: 150 }],
    meta: [{ key: 'anthropicApiKey', value: 'sk-ant-SECRET-must-not-be-in-backups' }],
  });

  await page.click('[data-tab="settings"]');
  check('“Last backup” starts as Never', (await text(page, '[data-open="backup"] .row-subtitle')) === 'Last backup: Never');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-open="backup"]')]);
  const backupPath = join(tmpdir(), `momentum-e2e-${Date.now()}.json`);
  await download.saveAs(backupPath);
  const raw = await readFile(backupPath, 'utf8');
  const backup = JSON.parse(raw);
  check('backup file is named by date', /^momentum-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()));
  check('backup contains workouts, meals and weigh-ins', backup.data.workouts.length === 1 && backup.data.meals.length === 1 && backup.data.weights.length === 1);
  check('backup never contains the API key', !raw.includes('sk-ant'));
  await page.waitForTimeout(300);
  check('“Last backup” shows a date after backing up', !(await text(page, '[data-open="backup"] .row-subtitle')).includes('Never'));

  const names = [];
  page.on('download', (d) => names.push(d.suggestedFilename()));
  await page.click('[data-open="csv"]'); await page.waitForTimeout(800);
  check('spreadsheet export makes workouts, meals, supplements and weights files', ['workouts', 'meals', 'supplements', 'weights'].every((t) => names.some((n) => n.includes(t))), names.join(', '));
  await context.close();

  // A "new phone": fresh browser profile
  const fresh = await newPhone(browser);
  await fresh.page.goto(appUrl);
  await fresh.page.waitForSelector('[data-restore]');
  await fresh.page.click('[data-restore]');
  const notBackup = join(tmpdir(), `momentum-e2e-bad-${Date.now()}.json`);
  await writeFile(notBackup, '{"hello":1}');
  await fresh.page.setInputFiles('[data-file]', notBackup);
  await fresh.page.waitForSelector('.sheet .form-problems');
  check('a file that isn’t a backup is refused with a clear message', (await fresh.page.textContent('.sheet .form-problems')).includes('isn’t a Momentum backup'));
  await fresh.page.setInputFiles('[data-file]', backupPath);
  await fresh.page.waitForSelector('.restore-summary');
  check('restore shows what’s in the backup first', (await text(fresh.page, '.restore-summary')).includes('1 workout, 1 meal, 1 weigh-in'));
  await fresh.page.click('[data-confirm-restore]');
  await fresh.page.waitForSelector('.week-card');
  check('restoring on a new phone skips the welcome screen and brings back the workout', (await fresh.page.locator('.workout-row').count()) === 1);
  await fresh.page.click('[data-tab="settings"]');
  check('targets come back; the API key does not', (await text(fresh.page, '[data-open="targets"] .row-title')) === '1,660 kcal' && (await text(fresh.page, '[data-open="apikey"] .row-subtitle')).startsWith('Not added'));
  check('Backup: no page errors', page.errors.length === 0 && fresh.page.errors.length === 0, [...page.errors, ...fresh.page.errors].join('; '));
  await fresh.context.close();
}
