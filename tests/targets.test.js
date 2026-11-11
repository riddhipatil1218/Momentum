// targets.test.js — the calorie calculation (Mifflin–St Jeor) and macro targets.
// All people here are made-up examples (the repo is public; see SPEC D30).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmr, formatHeight, macroCalories, profileProblems, suggestTargets, totalInches }
  from '../app/js/logic/targets.js';

const exampleWoman = { sex: 'female', age: 30, heightIn: 66, weightLb: 150, goalWeightLb: 140, activity: 'three-four' };
const exampleMan = { sex: 'male', age: 40, heightIn: 70, weightLb: 200, goalWeightLb: 180, activity: 'five-six' };

test('BMR uses the Mifflin–St Jeor equation', () => {
  assert.equal(Math.round(bmr(exampleWoman) * 10) / 10, 1417.1);
  assert.equal(Math.round(bmr(exampleMan) * 10) / 10, 1823.4);
});

test('weight-loss targets: 15% deficit, rounded to 10, macros from calories', () => {
  assert.deepEqual(
    pick(suggestTargets(exampleWoman)),
    { calories: 1660, proteinG: 128, carbsG: 183, fatG: 46, maintenance: 1949, losing: true },
  );
  assert.deepEqual(
    pick(suggestTargets(exampleMan)),
    { calories: 2400, proteinG: 170, carbsG: 280, fatG: 67, maintenance: 2826, losing: true },
  );
});

test('no deficit when the goal is at or above current weight', () => {
  const t = suggestTargets({ sex: 'female', age: 35, heightIn: 64, weightLb: 140, goalWeightLb: 150, activity: 'none' });
  assert.equal(t.losing, false);
  assert.equal(t.calories, 1580); // maintenance 1578 rounded
});

test('calories never go below the safe minimum', () => {
  const t = suggestTargets({ sex: 'female', age: 60, heightIn: 60, weightLb: 110, goalWeightLb: 100, activity: 'none' });
  assert.equal(t.calories, 1200);
});

test('macros add up to about the calorie target', () => {
  for (const person of [exampleWoman, exampleMan]) {
    const t = suggestTargets(person);
    assert.ok(Math.abs(macroCalories(t) - t.calories) <= 10, `${macroCalories(t)} vs ${t.calories}`);
  }
});

test('height helpers', () => {
  assert.equal(totalInches(5, 6), 66);
  assert.equal(totalInches('6', ''), 72);
  assert.equal(formatHeight(66), '5′6″');
  assert.equal(formatHeight(72), '6′0″');
});

test('profile checks', () => {
  assert.deepEqual(profileProblems(exampleWoman), []);
  assert.equal(profileProblems({ ...exampleWoman, age: 8 }).length, 1);
  assert.equal(profileProblems({ ...exampleWoman, sex: '' }).length, 1);
  assert.equal(profileProblems({ ...exampleWoman, goalWeightLb: null }).length, 0); // goal is optional
  assert.equal(profileProblems({}).length, 5);
});

function pick({ calories, proteinG, carbsG, fatG, maintenance, losing }) {
  return { calories, proteinG, carbsG, fatG, maintenance, losing };
}
