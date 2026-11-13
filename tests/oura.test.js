// oura.test.js — Oura screenshot data: cleaning up what was read, matching workout names,
// avoiding duplicate workouts, and using Oura's total burn in the calorie balance.
// All people are made-up examples (public repo).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKeyFromIsoDate, matchActivity, normalizeOuraActivity, preselectOuraWorkouts } from '../app/js/logic/oura.js';
import { balanceBreakdown, dayBalance, explainBalance } from '../app/js/logic/energy.js';

const activities = [
  { name: 'Running' }, { name: 'Stair Master' }, { name: 'Strength Training' }, { name: 'Hot Yoga' },
  { name: 'Yoga' }, { name: 'Pilates' }, { name: 'Sculpt' },
];

test('what Claude read is cleaned up', () => {
  const a = normalizeOuraActivity({
    date: '2026-11-12', total_burn: 2140.6, active_calories: 512, steps: 9876.4, is_oura: true, notes: '',
    workouts: [{ name: 'Strength training', minutes: 45, calories: 260 }, { name: '  ', minutes: 5, calories: 0 }],
  }, 20261113);
  assert.deepEqual(a, {
    isOura: true, dayKey: 20261112, dateWasRead: true, totalBurn: 2141, activeCalories: 512, steps: 9876,
    workouts: [{ name: 'Strength training', minutes: 45, calories: 260 }], notes: '',
  });
});

test('a missing or impossible date falls back to today', () => {
  assert.equal(normalizeOuraActivity({ date: '' }, 20261113).dayKey, 20261113);
  assert.equal(normalizeOuraActivity({ date: '' }, 20261113).dateWasRead, false);
  assert.equal(dayKeyFromIsoDate('2026-02-30'), null);
  assert.equal(dayKeyFromIsoDate('Nov 12'), null);
  assert.equal(dayKeyFromIsoDate('2028-02-29'), 20280229);
});

test('Oura workout names are matched to your workout types', () => {
  assert.equal(matchActivity('Strength training', activities).name, 'Strength Training');
  assert.equal(matchActivity('Running', activities).name, 'Running');
  assert.equal(matchActivity('Hot yoga', activities).name, 'Hot Yoga');   // not plain Yoga
  assert.equal(matchActivity('Yoga', activities).name, 'Yoga');
  assert.equal(matchActivity('Reformer', activities).name, 'Pilates');
  assert.equal(matchActivity('Stair stepper', activities).name, 'Stair Master');
  assert.equal(matchActivity('Kayaking', activities), null);
});

test('workouts already in your log start unticked', () => {
  const result = preselectOuraWorkouts(
    [{ name: 'Strength training', minutes: 45, calories: 260 }, { name: 'Walking', minutes: 30, calories: 120 }],
    [{ activityName: 'Strength Training' }],
    activities,
  );
  assert.deepEqual(result.map((w) => [w.name, w.alreadyLogged, w.type?.name ?? null]),
    [['Strength training', true, 'Strength Training'], ['Walking', false, null]]);
});

// ---- Balance with Oura ----

const person = { sex: 'female', age: 30, heightIn: 66, weightLb: 150, goalWeightLb: 140, activity: 'three-four' };
const meals = [{ name: 'Lunch', calories: 700, date: new Date(2026, 10, 12, 12).toISOString() },
               { name: 'Dinner', calories: 900, date: new Date(2026, 10, 12, 19).toISOString() }];
const yoga = [{ activityName: 'Yoga', detailKind: 'general', durationMinutes: 60 }];
const oura = { totalBurn: 2200, activeCalories: 540, steps: 11000 };

test('without Oura, the estimate is used (stats + workouts)', () => {
  assert.deepEqual(dayBalance(person, meals, yoga), { burned: 1837, eaten: 1600, balance: 237, inDeficit: true, source: 'estimate' });
});

test('with Oura, its total burn replaces the estimate (workouts not added twice)', () => {
  assert.deepEqual(dayBalance(person, meals, yoga, oura), { burned: 2200, eaten: 1600, balance: 600, inDeficit: true, source: 'oura' });
  const day = balanceBreakdown(person, meals, yoga, oura);
  assert.equal(day.burned, 2200);
  assert.equal(day.source, 'oura');
  assert.deepEqual(day.oura, { totalBurn: 2200, activeCalories: 540, steps: 11000 });
});

test('Oura data with no total burn is ignored', () => {
  assert.equal(dayBalance(person, meals, yoga, { totalBurn: 0, steps: 5000 }).source, 'estimate');
});

test('reasons say the burn was measured by Oura', () => {
  const lines = explainBalance(balanceBreakdown(person, meals, [], oura), 1600);
  assert.equal(lines[0], 'You ate 1,600 kcal, 600 less than the 2,200 you burned.');
  assert.equal(lines[1], 'Your Oura ring measured 2,200 kcal burned, including 540 active calories and 11,000 steps.');
  assert.ok(!lines.some((l) => l.includes('tipped this into a deficit')));
});
