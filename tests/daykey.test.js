// daykey.test.js — dates → YYYYMMDD day keys, including midnight, year boundaries
// and daylight-saving changes. Run with `npm test` (uses Los Angeles time).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, dateOnDayAtTime, dayKeyFromDate, fromLocalInputValue, monthRange, startOfDay,
  toLocalInputValue,
} from '../app/js/logic/daykey.js';
import { monthGrid } from '../app/js/logic/monthgrid.js';

test('midday gives that day', () => {
  assert.equal(dayKeyFromDate(new Date(2026, 10, 10, 12, 0)), 20261110);
});

test('late night stays on the same day; midnight is the next day', () => {
  assert.equal(dayKeyFromDate(new Date(2026, 10, 10, 23, 59)), 20261110);
  assert.equal(dayKeyFromDate(new Date(2026, 10, 11, 0, 0)), 20261111);
});

test('year boundary', () => {
  assert.equal(dayKeyFromDate(new Date(2026, 11, 31)), 20261231);
  assert.equal(addDays(20261231, 1), 20270101);
  assert.equal(addDays(20270101, -1), 20261231);
});

test('leap day', () => {
  assert.equal(addDays(20280228, 1), 20280229);
  assert.equal(addDays(20270228, 1), 20270301);
});

test('startOfDay round trip', () => {
  const start = startOfDay(20261110);
  assert.deepEqual(start, new Date(2026, 10, 10, 0, 0, 0));
  assert.equal(dayKeyFromDate(start), 20261110);
});

test('logging onto a past day keeps the current clock time', () => {
  const result = dateOnDayAtTime(20250315, new Date(2026, 10, 10, 18, 45));
  assert.deepEqual(result, new Date(2025, 2, 15, 18, 45));
});

test('month range covers the whole month only', () => {
  const { first, last } = monthRange(new Date(2026, 10, 10));
  assert.equal(first, 20261101);
  assert.equal(last, 20261131);
  assert.ok(20261130 >= first && 20261130 <= last);
  assert.ok(!(20261031 >= first && 20261031 <= last));
  assert.ok(!(20261201 >= first && 20261201 <= last));
});

test('daylight-saving change does not skip or repeat days', () => {
  // US clocks fall back on Nov 1, 2026 and spring forward on Mar 8, 2026.
  for (const month of [10, 2]) { // November, March (0-based)
    const keys = monthGrid(new Date(2026, month, 15)).cells.filter(Boolean).map(dayKeyFromDate);
    const days = new Date(2026, month + 1, 0).getDate();
    const expected = Array.from({ length: days }, (_, i) => 20260000 + (month + 1) * 100 + i + 1);
    assert.deepEqual(keys, expected);
  }
});

test('date/time input text round trip', () => {
  const date = new Date(2026, 10, 10, 18, 5);
  assert.equal(toLocalInputValue(date), '2026-11-10T18:05');
  assert.deepEqual(fromLocalInputValue('2026-11-10T18:05'), date);
  assert.equal(fromLocalInputValue(''), null);
  assert.equal(fromLocalInputValue('nonsense'), null);
});
