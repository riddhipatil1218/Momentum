// goals-backup.test.js — goal status for the Dashboard, and backup/CSV files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barPercent, daysOnTarget, goalStatus, remainingText, weekGrid } from '../app/js/logic/goals.js';
import { BACKUP_META_KEYS, backupFileName, backupSummary, buildBackup, checkBackup, toCSV }
  from '../app/js/logic/backup.js';

// ---- Goal status ------------------------------------------------------------------------

test('under, on target and over use a 10% band', () => {
  assert.equal(goalStatus(1000, 1600), 'under');
  assert.equal(goalStatus(1439, 1600), 'under');
  assert.equal(goalStatus(1440, 1600), 'on');   // exactly 90%
  assert.equal(goalStatus(1600, 1600), 'on');
  assert.equal(goalStatus(1760, 1600), 'on');   // exactly 110%
  assert.equal(goalStatus(1761, 1600), 'over');
  assert.equal(goalStatus(0, 1600), 'under');
});

test('no goal means no status', () => {
  assert.equal(goalStatus(500, 0), null);
  assert.equal(goalStatus(500, undefined), null);
});

test('progress bar is capped at 100%', () => {
  assert.equal(barPercent(800, 1600), 50);
  assert.equal(barPercent(2400, 1600), 100);
  assert.equal(barPercent(100, 0), 0);
});

test('remaining text', () => {
  assert.equal(remainingText(1000, 1600, 'kcal'), '600 kcal left');
  assert.equal(remainingText(1900, 1600, 'kcal'), '300 kcal over');
  assert.equal(remainingText(1550, 1600, 'kcal'), 'On target · 50 kcal left');
  assert.equal(remainingText(1650, 1600, 'kcal'), 'On target · 50 kcal over');
});

test('7-day grid marks each metric and skips days with no meals', () => {
  const targets = { calories: 1600, proteinG: 120, carbsG: 180, fatG: 50 };
  const totals = new Map([
    [20261110, { calories: 1590, proteinG: 80, carbsG: 185, fatG: 70 }],
    [20261111, { calories: 2100, proteinG: 125, carbsG: 250, fatG: 52 }],
  ]);
  const grid = weekGrid([20261109, 20261110, 20261111], totals, targets);
  assert.deepEqual(grid[0], { dayKey: 20261109, logged: false, statuses: { calories: null, proteinG: null, carbsG: null, fatG: null } });
  assert.deepEqual(grid[1].statuses, { calories: 'on', proteinG: 'under', carbsG: 'on', fatG: 'over' });
  assert.deepEqual(grid[2].statuses, { calories: 'over', proteinG: 'on', carbsG: 'over', fatG: 'on' });
  assert.equal(daysOnTarget(grid), 1);
  assert.equal(daysOnTarget(grid, 'proteinG'), 1);
});

// ---- Backups ------------------------------------------------------------------------------

const stores = {
  activityTypes: [{ id: 'a1', name: 'Yoga' }],
  supplements: [{ id: 's1', name: 'Iron' }],
  workouts: [{ id: 'w1', dayKey: 20261110 }, { id: 'w2', dayKey: 20261111 }],
  supplementLogs: [{ id: '20261110:s1' }],
  meals: [{ id: 'm1' }],
  savedMeals: [],
};

test('backups never include the API key', () => {
  const meta = { profile: { age: 30 }, targets: { calories: 1600 }, weeklyGoal: 4, anthropicApiKey: 'sk-ant-secret' };
  const backup = buildBackup(stores, meta, new Date('2026-11-12T10:00:00Z'));
  assert.equal(JSON.stringify(backup).includes('sk-ant-secret'), false);
  assert.equal(BACKUP_META_KEYS.includes('anthropicApiKey'), false);
  assert.equal(backup.settings.weeklyGoal, 4);
  assert.equal(backup.exportedAt, '2026-11-12T10:00:00.000Z');
});

test('a good backup passes the check with counts', () => {
  const result = checkBackup(buildBackup(stores, {}));
  assert.equal(result.ok, true);
  assert.equal(result.counts.workouts, 2);
  assert.equal(backupSummary(result.counts), '2 workouts, 1 supplement check-in, 1 meal');
});

test('bad files are rejected with a clear reason', () => {
  assert.match(checkBackup(null).problem, /isn’t a Momentum backup/);
  assert.match(checkBackup({ app: 'other' }).problem, /isn’t a Momentum backup/);
  assert.match(checkBackup({ app: 'momentum', format: 99, data: {} }).problem, /newer version/);
  assert.match(checkBackup({ app: 'momentum', format: 1, data: { workouts: [{ noId: true }] } }).problem, /damaged/);
  assert.match(checkBackup({ app: 'momentum', format: 1, data: { meals: 'oops' } }).problem, /damaged/);
});

test('file names use the local date', () => {
  assert.equal(backupFileName(new Date(2026, 10, 12, 23, 30)), 'momentum-backup-2026-11-12.json');
  assert.equal(backupFileName(new Date(2026, 0, 5), 'csv', 'momentum-meals'), 'momentum-meals-2026-01-05.csv');
});

test('CSV quotes commas, quotes and line breaks, and blocks formulas', () => {
  const csv = toCSV(
    [{ a: 'Eggs, toast', b: 'say "hi"', c: 'line1\nline2', d: '=SUM(A1)', e: null, f: ['x', 'y'] }],
    [['A', (r) => r.a], ['B', (r) => r.b], ['C', (r) => r.c], ['D', (r) => r.d], ['E', (r) => r.e], ['F', (r) => r.f]],
  );
  assert.equal(csv, 'A,B,C,D,E,F\r\n"Eggs, toast","say ""hi""","line1\nline2",\'=SUM(A1),,x; y\r\n');
});
