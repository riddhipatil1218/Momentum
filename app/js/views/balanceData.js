// balanceData.js
// Loads what the calorie-balance features need: your stats, meals and workouts for a range of
// days, and works out each day's balance and your current deficit streak.
// Shared by the Dashboard and the Today tab.

import { getProfile, mealsBetween, workoutsBetween } from '../data.js';
import { addDays, todayKey } from '../logic/daykey.js';
import { dailyBurn, dayBalance, deficitStreak } from '../logic/energy.js';
import { profileProblems } from '../logic/targets.js';

const STREAK_LOOKBACK_DAYS = 90;

/**
 * @returns {Promise<null | { profile, today, balances: Map, streak, todayBurn, todayEaten, todayWorkouts }>}
 *          null when your stats aren't set up yet.
 */
export async function loadBalances() {
  const profile = await getProfile();
  if (!profile || profileProblems(profile).length) return null;

  const today = todayKey();
  const first = addDays(today, -STREAK_LOOKBACK_DAYS);
  const [meals, workouts] = await Promise.all([mealsBetween(first, today), workoutsBetween(first, today)]);

  const byDay = (rows) => {
    const map = new Map();
    for (const row of rows) map.set(row.dayKey, [...(map.get(row.dayKey) ?? []), row]);
    return map;
  };
  const mealsByDay = byDay(meals);
  const workoutsByDay = byDay(workouts);

  const balances = new Map();
  for (let i = 0; i <= STREAK_LOOKBACK_DAYS; i++) {
    const day = addDays(today, -i);
    balances.set(day, dayBalance(profile, mealsByDay.get(day) ?? [], workoutsByDay.get(day) ?? []));
  }
  const pastDays = Array.from({ length: STREAK_LOOKBACK_DAYS }, (_, i) => addDays(today, -(i + 1)));

  const todayMeals = mealsByDay.get(today) ?? [];
  return {
    profile,
    today,
    balances,
    streak: deficitStreak(balances, pastDays),
    todayBurn: dailyBurn(profile, workoutsByDay.get(today) ?? []),
    todayEaten: Math.round(todayMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)),
    todayHasMeals: todayMeals.length > 0,
  };
}
