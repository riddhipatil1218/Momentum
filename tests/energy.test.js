// energy.test.js — calorie burn from stats + workouts, daily balance, deficit streaks,
// and meal sections. All people are made-up examples (public repo).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyBurn, dayBalance, deficitStreak, poundsFromCalories, runningMet, workoutCalories, workoutMet }
  from '../app/js/logic/energy.js';
import { groupMealsBySection, mealSection } from '../app/js/logic/meals.js';

const person = { sex: 'female', age: 30, heightIn: 66, weightLb: 150, goalWeightLb: 140, activity: 'three-four' };

test('workout calories use MET × weight × time (minus resting)', () => {
  // 30 min, 3 mi = 10:00 pace → MET 9.8 → (9.8 − 1) × 68.04 kg × 0.5 h ≈ 299
  assert.deepEqual(workoutCalories({ activityName: 'Running', detailKind: 'running', durationMinutes: 30, distanceMiles: 3 }, 150),
    { kcal: 299, assumedDuration: false });
  // Yoga 60 min, MET 3 → (3 − 1) × 68.04 × 1 ≈ 136
  assert.equal(workoutCalories({ activityName: 'Yoga', detailKind: 'general', durationMinutes: 60 }, 150).kcal, 136);
});

test('no duration logged → assume 45 minutes and say so', () => {
  assert.deepEqual(workoutCalories({ activityName: 'Strength Training', detailKind: 'strength' }, 150),
    { kcal: 204, assumedDuration: true });
});

test('activity intensity is matched by name, then by kind', () => {
  assert.equal(workoutMet({ activityName: 'Hot Yoga', detailKind: 'hotYoga' }), 4.0);
  assert.equal(workoutMet({ activityName: 'Stair Master', detailKind: 'stairMaster' }), 9.0);
  assert.equal(workoutMet({ activityName: 'Barre', detailKind: 'strength' }), 3.5);
  assert.equal(workoutMet({ activityName: 'Something new', detailKind: 'general' }), 4.0);
});

test('faster running burns more', () => {
  assert.ok(runningMet(7) > runningMet(9));
  assert.ok(runningMet(9) > runningMet(12.5));
  assert.equal(runningMet(null), 9.8);
});

test('daily burn = BMR × 1.2 + workouts', () => {
  const burn = dailyBurn(person, [{ activityName: 'Yoga', detailKind: 'general', durationMinutes: 60 }]);
  assert.equal(burn.everyday, 1701);
  assert.equal(burn.workouts, 136);
  assert.equal(burn.total, 1837);
  assert.equal(burn.assumedDurations, 0);
});

test('day balance: positive is a deficit; no meals means unknown', () => {
  const meals = [{ calories: 600 }, { calories: 800 }];
  assert.deepEqual(dayBalance(person, meals, []), { burned: 1701, eaten: 1400, balance: 301, inDeficit: true });
  assert.equal(dayBalance(person, [{ calories: 2000 }], []).inDeficit, false);
  assert.equal(dayBalance(person, [], []), null);
});

test('deficit streak counts back from yesterday and stops at a miss or a blank day', () => {
  const d = (balance) => ({ balance, inDeficit: balance > 0 });
  const balances = new Map([[20261111, d(300)], [20261110, d(150)], [20261109, d(-200)], [20261108, d(400)]]);
  assert.equal(deficitStreak(balances, [20261111, 20261110, 20261109, 20261108]), 2);
  assert.equal(deficitStreak(new Map([[20261111, null]]), [20261111]), 0);
  assert.equal(deficitStreak(new Map(), [20261111]), 0);
});

test('3,500 kcal ≈ 1 lb', () => {
  assert.equal(poundsFromCalories(1750), 0.5);
  assert.equal(poundsFromCalories(2450), 0.7);
});

test('meals are grouped into breakfast, lunch, dinner and snacks by time', () => {
  const at = (h) => new Date(2026, 10, 12, h, 15).toISOString();
  assert.equal(mealSection(at(8)), 'Breakfast');
  assert.equal(mealSection(at(12)), 'Lunch');
  assert.equal(mealSection(at(16)), 'Snacks');
  assert.equal(mealSection(at(19)), 'Dinner');
  assert.equal(mealSection(at(23)), 'Snacks');
  const groups = groupMealsBySection([
    { date: at(19), calories: 600, proteinG: 40, carbsG: 50, fatG: 20 },
    { date: at(8), calories: 300, proteinG: 20, carbsG: 30, fatG: 10 },
    { date: at(9), calories: 100, proteinG: 1, carbsG: 25, fatG: 0 },
  ]);
  assert.deepEqual(groups.map((g) => `${g.section}:${g.totals.calories}`), ['Breakfast:400', 'Dinner:600']);
});
