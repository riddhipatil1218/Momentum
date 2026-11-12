// weight-breakdown.test.js — weigh-in trend and goal projection, and the calorie-balance
// "why" breakdown. All people are made-up examples (public repo).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextWeighIn, projectGoal, sortWeights, weightOnOrBefore, weightTrend } from '../app/js/logic/weight.js';
import { balanceBreakdown, explainBalance } from '../app/js/logic/energy.js';

const w = (date, pounds) => ({ id: date, date: new Date(date).toISOString(), dayKey: Number(date.replaceAll('-', '').slice(0, 8)), pounds });
const now = new Date('2026-11-12T12:00:00');

test('weigh-ins sort oldest first, and the weight for a day is the latest on or before it', () => {
  const list = [w('2026-11-10T08:00', 148), w('2026-10-27T08:00', 150)];
  assert.deepEqual(sortWeights(list).map((x) => x.pounds), [150, 148]);
  assert.equal(weightOnOrBefore(list, 20261105).pounds, 150);
  assert.equal(weightOnOrBefore(list, 20261111).pounds, 148);
  assert.equal(weightOnOrBefore(list, 20261001), null);
});

test('trend needs two weigh-ins at least 10 days apart within 4 weeks', () => {
  assert.equal(weightTrend([w('2026-11-10T08:00', 148)], now).enough, false);
  assert.equal(weightTrend([w('2026-11-05T08:00', 149), w('2026-11-10T08:00', 148)], now).enough, false); // 5 days apart
  assert.equal(weightTrend([w('2026-09-01T08:00', 155), w('2026-11-10T08:00', 148)], now).enough, false); // old one outside 4 weeks
});

test('trend is pounds per week from a straight-line fit', () => {
  const t = weightTrend([w('2026-10-15T08:00', 150), w('2026-10-29T08:00', 149), w('2026-11-12T08:00', 148)], now);
  assert.equal(t.enough, true);
  assert.equal(t.lbPerWeek, -0.5);
  assert.equal(t.points, 3);
});

test('goal projection', () => {
  const list = [w('2026-10-15T08:00', 150), w('2026-10-29T08:00', 149), w('2026-11-12T08:00', 148)];
  const p = projectGoal(list, 140, now);
  assert.equal(p.status, 'projected');
  assert.equal(p.weeks, 16); // 8 lb at 0.5 lb/week
  assert.equal(p.date.toISOString().slice(0, 10), '2027-03-04');
  assert.equal(projectGoal(list.slice(2), 140, now).status, 'not-enough-data');
  assert.equal(projectGoal([w('2026-10-29T08:00', 148), w('2026-11-12T08:00', 149)], 140, now).status, 'not-heading-there');
  assert.equal(projectGoal([w('2026-11-12T08:00', 139)], 140, now, 150).status, 'reached');
  assert.equal(projectGoal([w('2026-10-29T08:00', 141), w('2026-11-12T08:00', 139)], 140, now).status, 'reached');
});

test('next weigh-in is due 2 weeks after the last', () => {
  assert.equal(nextWeighIn([w('2026-11-12T08:00', 148)]).toISOString().slice(0, 10), '2026-11-26');
  assert.equal(nextWeighIn([]), null);
});

// ---- Balance breakdown ----

const person = { sex: 'female', age: 30, heightIn: 66, weightLb: 150, goalWeightLb: 140, activity: 'three-four' };
const at = (h) => new Date(2026, 10, 10, h).toISOString();

test('breakdown lists each workout and meal and adds them up', () => {
  const day = balanceBreakdown(person,
    [{ name: 'Oatmeal', calories: 300, date: at(8) }, { name: 'Pasta', calories: 900, date: at(19) }],
    [{ activityName: 'Yoga', emoji: 'Y', detailKind: 'general', durationMinutes: 60 }, { activityName: 'Strength Training', emoji: 'S', detailKind: 'strength' }]);
  assert.equal(day.everyday, 1701);
  assert.deepEqual(day.workouts.map((x) => [x.name, x.minutes, x.assumedDuration, x.kcal]),
    [['Yoga', 60, false, 136], ['Strength Training', 45, true, 204]]);
  assert.equal(day.burned, 2041);
  assert.equal(day.eaten, 1200);
  assert.equal(day.balance, 841);
  assert.equal(balanceBreakdown(person, [], []), null);
});

test('explanations for a deficit day', () => {
  const day = balanceBreakdown(person,
    [{ name: 'Oatmeal', calories: 300, date: at(8) }, { name: 'Pasta', calories: 900, date: at(19) }],
    [{ activityName: 'Yoga', emoji: 'Y', detailKind: 'general', durationMinutes: 60 }]);
  const lines = explainBalance(day, 1600);
  assert.equal(lines[0], 'You ate 1,200 kcal, 637 less than the 1,837 you burned.');
  assert.equal(lines[1], 'Your workout helped by adding 136 kcal to your burn.');
  assert.equal(lines[2], 'Your biggest meal, Pasta, was 900 kcal (75% of the day).');
  assert.equal(lines[3], 'You were 400 kcal under your 1,600 kcal target.');
});

test('explanations for a surplus day with no workout', () => {
  const day = balanceBreakdown(person, [{ name: 'Lunch', calories: 900, date: at(12) }, { name: 'Dinner', calories: 1000, date: at(19) }], []);
  const lines = explainBalance(day, 1600);
  assert.equal(lines[0], 'You ate 1,900 kcal, 199 more than the 1,701 you burned.');
  assert.equal(lines[1], 'No workout logged, so your burn was just your everyday 1,701 kcal.');
  assert.ok(lines.includes('A 200 kcal workout or smaller portions would have tipped this into a deficit.'));
  assert.equal(lines.at(-1), 'You were 300 kcal over your 1,600 kcal target.');
});
