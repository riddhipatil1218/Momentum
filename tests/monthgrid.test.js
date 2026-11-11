// monthgrid.test.js — each month's days land under the correct weekday.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid, preferredFirstWeekday, weekdayLetters } from '../app/js/logic/monthgrid.js';

test('November 2026 starts on Sunday → no blanks with Sunday-first weeks', () => {
  const grid = monthGrid(new Date(2026, 10, 20), 0);
  assert.equal(grid.leadingBlanks, 0);
  assert.equal(grid.cells.filter(Boolean).length, 30);
  assert.equal(grid.cells.length, 35); // 5 full rows
  assert.deepEqual(grid.monthStart, new Date(2026, 10, 1));
});

test('Monday-first weeks shift the grid', () => {
  const grid = monthGrid(new Date(2026, 10, 20), 1);
  assert.equal(grid.leadingBlanks, 6);
  assert.equal(grid.cells.length, 42); // 6 rows
});

test('February 2026 fits exactly four rows', () => {
  const grid = monthGrid(new Date(2026, 1, 10), 0);
  assert.equal(grid.leadingBlanks, 0);
  assert.equal(grid.cells.length, 28);
  assert.ok(grid.cells.every(Boolean));
});

test('leap-year February has 29 days', () => {
  const grid = monthGrid(new Date(2028, 1, 10), 0); // Feb 1, 2028 is a Tuesday
  assert.equal(grid.cells.filter(Boolean).length, 29);
  assert.equal(grid.leadingBlanks, 2);
  assert.equal(grid.cells.length, 35);
});

test('every month is whole weeks', () => {
  for (let month = 0; month < 12; month++) {
    assert.equal(monthGrid(new Date(2026, month, 1)).cells.length % 7, 0, `month ${month + 1}`);
  }
});

test('weekday headers follow the first weekday', () => {
  assert.deepEqual(weekdayLetters(0), ['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  assert.deepEqual(weekdayLetters(1), ['M', 'T', 'W', 'T', 'F', 'S', 'S']);
});

test('phone locale decides the first weekday', () => {
  assert.equal(preferredFirstWeekday('en-US'), 0); // Sunday
  assert.equal(preferredFirstWeekday('en-GB'), 1); // Monday
});
