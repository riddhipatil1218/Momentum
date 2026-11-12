// progress.test.js — weekly progress, streaks and encouraging messages.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encouragement, loggedCheer, weekDayKeys, workoutStreak } from '../app/js/logic/progress.js';

test('week containing a Wednesday, Sunday-first', () => {
  // Nov 11, 2026 is a Wednesday.
  assert.deepEqual(weekDayKeys(20261111, 0),
    [20261108, 20261109, 20261110, 20261111, 20261112, 20261113, 20261114]);
});

test('week containing a Wednesday, Monday-first', () => {
  assert.deepEqual(weekDayKeys(20261111, 1),
    [20261109, 20261110, 20261111, 20261112, 20261113, 20261114, 20261115]);
});

test('week that crosses a month and year boundary', () => {
  // Dec 31, 2026 is a Thursday.
  assert.deepEqual(weekDayKeys(20261231, 0),
    [20261227, 20261228, 20261229, 20261230, 20261231, 20270101, 20270102]);
});

test('streak counts consecutive days ending today', () => {
  assert.equal(workoutStreak(new Set([20261109, 20261110, 20261111]), 20261111), 3);
});

test('streak from yesterday still counts before today’s workout', () => {
  assert.equal(workoutStreak(new Set([20261109, 20261110]), 20261111), 2);
});

test('a gap breaks the streak', () => {
  assert.equal(workoutStreak(new Set([20261107, 20261108, 20261110]), 20261111), 1);
  assert.equal(workoutStreak(new Set([20261105]), 20261111), 0);
  assert.equal(workoutStreak(new Set(), 20261111), 0);
});

test('streak across a month boundary', () => {
  assert.equal(workoutStreak(new Set([20261030, 20261031, 20261101]), 20261101), 3);
});

test('encouragement picks the most relevant message', () => {
  assert.match(encouragement({ workedOutToday: true, weekCount: 4, goal: 4 }), /goal reached/i);
  assert.match(encouragement({ workedOutToday: true, weekCount: 2, goal: 4 }), /showed up today/);
  assert.match(encouragement({ workedOutToday: false, weekCount: 2, goal: 4, streak: 3 }), /Keep your streak going/);
  assert.match(encouragement({ workedOutToday: false, weekCount: 3, goal: 4 }), /^1 more workout to/);
  assert.match(encouragement({ workedOutToday: false, weekCount: 1, goal: 4 }), /^3 more workouts to/);
  assert.match(encouragement({ workedOutToday: false, weekCount: 0, goal: 4 }), /still counts/);
});

test('cheer after logging', () => {
  assert.equal(loggedCheer(2, 4), 'That’s 2 of 4 this week.');
  assert.match(loggedCheer(4, 4), /Goal reached/);
  assert.match(loggedCheer(5, 4), /Above and beyond/);
});

test('longest run of consecutive days', async () => {
  const { longestRun } = await import('../app/js/logic/progress.js');
  const days = [20261101, 20261102, 20261103, 20261104, 20261105, 20261106];
  assert.equal(longestRun(new Set([20261101, 20261102, 20261104, 20261105, 20261106]), days), 3);
  assert.equal(longestRun(new Set(), days), 0);
  assert.equal(longestRun(new Set(days), days), 6);
});

test('activity breakdown, most frequent first', async () => {
  const { activityBreakdown } = await import('../app/js/logic/progress.js');
  const result = activityBreakdown([
    { activityName: 'Yoga', emoji: 'Y' }, { activityName: 'Running', emoji: 'R' },
    { activityName: 'Yoga', emoji: 'Y' }, { activityName: 'Pilates', emoji: 'P' },
  ]);
  assert.deepEqual(result.map((r) => `${r.name}:${r.count}`), ['Yoga:2', 'Pilates:1', 'Running:1']);
});
