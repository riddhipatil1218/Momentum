// balanceData.js
// Loads what the calorie-balance features need: your stats, weigh-ins, meals and workouts,
// and works out each day's balance, your deficit streak, and any day's full breakdown.
// Shared by the Dashboard, the Today tab and the calendar's day sheet.
//
// Each day uses the most recent weigh-in on or before it (or your stats' weight if there
// isn't one), so burn estimates follow your weight over time.

import { allWeights, getProfile, mealsBetween, workoutsBetween } from '../data.js';
import { addDays, todayKey } from '../logic/daykey.js';
import { balanceBreakdown, dailyBurn, dayBalance, deficitStreak } from '../logic/energy.js';
import { profileProblems } from '../logic/targets.js';
import { weightOnOrBefore } from '../logic/weight.js';

export const LOOKBACK_DAYS = 90;

/** Your stats with the weight that applied on a given day. */
function profileForDay(profile, weights, dayKey) {
  const weighIn = weightOnOrBefore(weights, dayKey);
  return weighIn ? { ...profile, weightLb: weighIn.pounds } : profile;
}

async function loadProfile() {
  const profile = await getProfile();
  return profile && !profileProblems(profile).length ? profile : null;
}

const groupByDay = (rows) => {
  const map = new Map();
  for (const row of rows) map.set(row.dayKey, [...(map.get(row.dayKey) ?? []), row]);
  return map;
};

/**
 * @returns {Promise<null | { profile, today, balances: Map, streak, todayBurn, todayEaten, todayHasMeals }>}
 *          null when your stats aren't set up yet.
 */
export async function loadBalances() {
  const profile = await loadProfile();
  if (!profile) return null;

  const today = todayKey();
  const first = addDays(today, -LOOKBACK_DAYS);
  const [meals, workouts, weights] = await Promise.all([mealsBetween(first, today), workoutsBetween(first, today), allWeights()]);
  const mealsByDay = groupByDay(meals);
  const workoutsByDay = groupByDay(workouts);

  const balances = new Map();
  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
    const day = addDays(today, -i);
    balances.set(day, dayBalance(profileForDay(profile, weights, day), mealsByDay.get(day) ?? [], workoutsByDay.get(day) ?? []));
  }
  const pastDays = Array.from({ length: LOOKBACK_DAYS }, (_, i) => addDays(today, -(i + 1)));

  const todayMeals = mealsByDay.get(today) ?? [];
  return {
    profile,
    today,
    balances,
    streak: deficitStreak(balances, pastDays),
    todayBurn: dailyBurn(profileForDay(profile, weights, today), workoutsByDay.get(today) ?? []),
    todayEaten: Math.round(todayMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)),
    todayHasMeals: todayMeals.length > 0,
  };
}

/**
 * The full breakdown for one day (burn parts, each workout and meal), or
 * { noMeals: true } when nothing was eaten-logged that day, or null without stats.
 */
export async function loadDayBreakdown(dayKey) {
  const profile = await loadProfile();
  if (!profile) return null;
  const [meals, workouts, weights] = await Promise.all([mealsBetween(dayKey, dayKey), workoutsBetween(dayKey, dayKey), allWeights()]);
  const dayProfile = profileForDay(profile, weights, dayKey);
  const breakdown = balanceBreakdown(dayProfile, meals, workouts);
  return breakdown ?? { noMeals: true, workouts: workouts.length, weightLb: dayProfile.weightLb };
}
