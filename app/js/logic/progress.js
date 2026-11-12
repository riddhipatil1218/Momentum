// progress.js
// Weekly progress, workout streaks and the encouraging line on the Today tab.

import { addDays, startOfDay } from './daykey.js';

/** Fallback weekly workout goal; your own goal is set in Settings. */
export const WEEKLY_WORKOUT_GOAL = 4;

/** The 7 day keys of the week containing `dayKey`, starting on `firstWeekday` (0 = Sunday). */
export function weekDayKeys(dayKey, firstWeekday = 0) {
  const offset = (startOfDay(dayKey).getDay() - firstWeekday + 7) % 7;
  const weekStart = addDays(dayKey, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** How many days in a row you've worked out, counting back from today.
 *  If today has no workout yet, the streak from yesterday still counts (you have until midnight). */
export function workoutStreak(workoutDays, todayKey) {
  let day = workoutDays.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (workoutDays.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** One short, encouraging line based on how the week is going. */
export function encouragement({ workedOutToday, weekCount, goal = WEEKLY_WORKOUT_GOAL, streak = 0 }) {
  if (weekCount >= goal) return "Weekly goal reached. You're on fire 🏆";
  if (workedOutToday) return 'You showed up today. That’s how momentum builds 💪';
  if (streak >= 2) return `${streak}-day streak. Keep it going today 🔥`;
  if (weekCount > 0) {
    const left = goal - weekCount;
    return `${left} more workout${left === 1 ? '' : 's'} to hit this week’s goal`;
  }
  return 'A short workout still counts. Let’s go ✨';
}

/** Cheer shown right after logging a workout. */
export function loggedCheer(weekCount, goal = WEEKLY_WORKOUT_GOAL) {
  if (weekCount === goal) return `That’s ${weekCount} this week. Goal reached! 🏆`;
  if (weekCount > goal) return `That’s ${weekCount} this week. Above and beyond 🌟`;
  return `That’s ${weekCount} of ${goal} this week 🎉`;
}

/** The longest run of consecutive days (in `orderedDays`) that are in `doneDays`. */
export function longestRun(doneDays, orderedDays) {
  let best = 0;
  let run = 0;
  for (const day of orderedDays) {
    run = doneDays.has(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Counts workouts per activity name, most frequent first: [{ name, emoji, count }]. */
export function activityBreakdown(workouts) {
  const counts = new Map();
  for (const w of workouts) {
    const entry = counts.get(w.activityName) ?? { name: w.activityName, emoji: w.emoji, count: 0 };
    entry.count++;
    counts.set(w.activityName, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
