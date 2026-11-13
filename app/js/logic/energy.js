// energy.js
// Calorie balance: how much you burned (stats + workouts) versus how much you ate.
//
// Burned in a day = BMR (Mifflin–St Jeor, from your stats) × 1.2 for everyday life
//                 + the calories of each workout you logged.
// We use 1.2 here (not your activity level) because workouts are counted one by one;
// using 1.375 *and* adding workouts would count them twice.
//
// Workout calories = (MET − 1) × weight in kg × hours. MET is how hard an activity is
// compared with sitting still; we subtract 1 because resting calories are already in BMR.
// Without a logged duration we assume 45 minutes (and say so).

import { bmr } from './targets.js';

export const EVERYDAY_FACTOR = 1.2;
export const DEFAULT_WORKOUT_MINUTES = 45;
const KG_PER_LB = 0.45359237;

// Typical MET values (Compendium of Physical Activities), matched by activity name first.
const MET_BY_NAME = [
  [/hot yoga|bikram/i, 4.0],
  [/stair/i, 9.0],
  [/strength|weight|lift/i, 5.0],
  [/sculpt/i, 4.5],
  [/pilates/i, 3.0],
  [/yoga/i, 3.0],
  [/barre/i, 3.5],
  [/spin|cycl|bike/i, 7.5],
  [/hiit|bootcamp|circuit/i, 8.0],
  [/swim/i, 7.0],
  [/row/i, 7.0],
  [/box|kickbox/i, 7.8],
  [/hike/i, 6.0],
  [/walk/i, 3.5],
  [/dance|zumba/i, 5.0],
];
const MET_BY_KIND = { running: 9.8, stairMaster: 9.0, strength: 5.0, hotYoga: 4.0, general: 4.0 };

/** MET for running from pace (minutes per mile); faster = higher. */
export function runningMet(paceMinPerMile) {
  if (!(paceMinPerMile > 0)) return MET_BY_KIND.running;
  if (paceMinPerMile <= 7) return 11.8;
  if (paceMinPerMile <= 8) return 11.0;
  if (paceMinPerMile <= 9) return 10.0;
  if (paceMinPerMile <= 10) return 9.8;
  if (paceMinPerMile <= 11) return 9.0;
  if (paceMinPerMile <= 12) return 8.3;
  return 7.0;
}

export function workoutMet(workout) {
  if (workout.detailKind === 'running') {
    const pace = workout.durationMinutes > 0 && workout.distanceMiles > 0
      ? workout.durationMinutes / workout.distanceMiles : null;
    return runningMet(pace);
  }
  const byName = MET_BY_NAME.find(([pattern]) => pattern.test(workout.activityName ?? ''));
  return byName ? byName[1] : (MET_BY_KIND[workout.detailKind] ?? 4.0);
}

/** Calories burned by one workout on top of resting calories. */
export function workoutCalories(workout, weightLb) {
  const minutes = workout.durationMinutes > 0 ? workout.durationMinutes : DEFAULT_WORKOUT_MINUTES;
  const kcal = (workoutMet(workout) - 1) * weightLb * KG_PER_LB * (minutes / 60);
  return { kcal: Math.round(kcal), assumedDuration: !(workout.durationMinutes > 0) };
}

/** Everything burned in a day: { everyday, workouts, total, assumedDurations } */
export function dailyBurn(profile, dayWorkouts = []) {
  const everyday = bmr(profile) * EVERYDAY_FACTOR;
  let workouts = 0;
  let assumedDurations = 0;
  for (const w of dayWorkouts) {
    const { kcal, assumedDuration } = workoutCalories(w, profile.weightLb);
    workouts += kcal;
    if (assumedDuration) assumedDurations++;
  }
  return { everyday: Math.round(everyday), workouts: Math.round(workouts), total: Math.round(everyday + workouts), assumedDurations };
}

/** Oura's measured total burn for a day, if there's usable Oura data (else null). */
export function ouraBurn(ouraDay) {
  return ouraDay?.totalBurn > 0 ? Math.round(ouraDay.totalBurn) : null;
}

/**
 * Balance for one day. `balance` > 0 means a deficit (burned more than eaten).
 * Days with no meals logged return null: without food logged we can't know.
 * With Oura data for the day, Oura's measured Total Burn is used instead of the estimate.
 */
export function dayBalance(profile, dayMeals, dayWorkouts, ouraDay = null) {
  if (!dayMeals.length) return null;
  const measured = ouraBurn(ouraDay);
  const burned = measured ?? dailyBurn(profile, dayWorkouts).total;
  const eaten = Math.round(dayMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0));
  return { burned, eaten, balance: burned - eaten, inDeficit: burned - eaten > 0, source: measured ? 'oura' : 'estimate' };
}

/**
 * Days in a row in a deficit, counting back from yesterday (today isn't over yet).
 * A day with no meals logged, or not in a deficit, ends the streak.
 * @param {Map<number, object|null>} balanceByDay  dayKey → dayBalance(...)
 * @param {number[]} pastDaysNewestFirst  e.g. [yesterday, the day before, …]
 */
export function deficitStreak(balanceByDay, pastDaysNewestFirst) {
  let streak = 0;
  for (const day of pastDaysNewestFirst) {
    if (balanceByDay.get(day)?.inDeficit) streak++;
    else break;
  }
  return streak;
}

/** About how many pounds a calorie deficit equals (3,500 kcal ≈ 1 lb). */
export function poundsFromCalories(kcal) {
  return Math.round((kcal / 3500) * 10) / 10;
}

/**
 * Everything behind one day's balance, for the "why" breakdown.
 * @returns {null | { burned, eaten, balance, inDeficit, everyday, workouts: [{name, emoji, minutes, assumedDuration, kcal}],
 *                    meals: [{name, kcal, date}], weightLb }}
 */
export function balanceBreakdown(profile, dayMeals, dayWorkouts, ouraDay = null) {
  if (!dayMeals.length) return null;
  const everyday = Math.round(bmr(profile) * EVERYDAY_FACTOR);
  const workouts = dayWorkouts.map((w) => {
    const { kcal, assumedDuration } = workoutCalories(w, profile.weightLb);
    return { name: w.activityName, emoji: w.emoji, minutes: w.durationMinutes > 0 ? w.durationMinutes : DEFAULT_WORKOUT_MINUTES, assumedDuration, kcal };
  });
  const meals = [...dayMeals]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((m) => ({ name: m.name, kcal: Math.round(Number(m.calories) || 0), date: m.date }));
  const measured = ouraBurn(ouraDay);
  // With Oura, its Total Burn already includes everyday life and workouts, so nothing is added on top.
  const burned = measured ?? everyday + workouts.reduce((s, w) => s + w.kcal, 0);
  const eaten = meals.reduce((s, m) => s + m.kcal, 0);
  return {
    burned, eaten, balance: burned - eaten, inDeficit: burned - eaten > 0, everyday, workouts, meals, weightLb: profile.weightLb,
    source: measured ? 'oura' : 'estimate',
    oura: measured ? { totalBurn: measured, activeCalories: ouraDay.activeCalories ?? 0, steps: ouraDay.steps ?? 0 } : null,
  };
}

/** A few plain-language reasons for a day's deficit or surplus. */
export function explainBalance(day, calorieTarget = null) {
  const lines = [];
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  lines.push(day.inDeficit
    ? `You ate ${fmt(day.eaten)} kcal, ${fmt(day.balance)} less than the ${fmt(day.burned)} you burned.`
    : `You ate ${fmt(day.eaten)} kcal, ${fmt(-day.balance)} more than the ${fmt(day.burned)} you burned.`);

  const workoutKcal = day.workouts.reduce((s, w) => s + w.kcal, 0);
  if (day.source === 'oura') {
    const active = day.oura?.activeCalories > 0 ? `, including ${fmt(day.oura.activeCalories)} active calories` : '';
    const steps = day.oura?.steps > 0 ? ` and ${fmt(day.oura.steps)} steps` : '';
    lines.push(`Your Oura ring measured ${fmt(day.burned)} kcal burned${active}${steps}.`);
  } else if (workoutKcal > 0) {
    const verb = day.inDeficit ? 'helped by adding' : 'added';
    lines.push(`Your ${day.workouts.length === 1 ? 'workout' : `${day.workouts.length} workouts`} ${verb} ${fmt(workoutKcal)} kcal to your burn.`);
  } else {
    lines.push(`No workout logged, so your burn was just your everyday ${fmt(day.everyday)} kcal.`);
  }

  if (day.meals.length > 1) {
    const biggest = day.meals.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const share = day.eaten > 0 ? Math.round((biggest.kcal / day.eaten) * 100) : 0;
    if (share >= 35) lines.push(`Your biggest meal, ${biggest.name}, was ${fmt(biggest.kcal)} kcal (${share}% of the day).`);
  }

  if (day.source !== 'oura' && !day.inDeficit && workoutKcal === 0 && day.eaten - day.everyday < 400) {
    lines.push(`A ${fmt(Math.ceil((-day.balance + 1) / 50) * 50)} kcal workout or smaller portions would have tipped this into a deficit.`);
  }

  if (calorieTarget > 0) {
    const diff = day.eaten - calorieTarget;
    if (Math.abs(diff) <= calorieTarget * 0.05) lines.push(`You ate right around your ${fmt(calorieTarget)} kcal target.`);
    else if (diff < 0) lines.push(`You were ${fmt(-diff)} kcal under your ${fmt(calorieTarget)} kcal target.`);
    else lines.push(`You were ${fmt(diff)} kcal over your ${fmt(calorieTarget)} kcal target.`);
  }
  return lines;
}
