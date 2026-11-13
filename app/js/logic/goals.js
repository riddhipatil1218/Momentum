// goals.js
// Whether a day's calories and macros are under, on target, or over (Dashboard).
//
// "On target" = within 10% of the goal either way (e.g. 1,800–2,200 for a 2,000 kcal goal).
// Below that is "under", above it is "over". The same rule is used for every metric.

export const TOLERANCE = 0.10;

export const METRICS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
];

/** 'under' | 'on' | 'over', or null if there's no goal to compare against. */
export function goalStatus(value, target) {
  if (!(target > 0)) return null;
  const ratio = (Number(value) || 0) / target;
  if (ratio < 1 - TOLERANCE) return 'under';
  if (ratio > 1 + TOLERANCE) return 'over';
  return 'on';
}

/** How full the progress bar is, 0–100 (capped so "over" doesn't run off the screen). */
export function barPercent(value, target) {
  if (!(target > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round(((Number(value) || 0) / target) * 100)));
}

/** Short text for a status. */
export function statusLabel(status) {
  return { under: 'Under', on: 'On target', over: 'Over' }[status] ?? '';
}

/** "220 kcal left" / "85 kcal over" / "On target" */
export function remainingText(value, target, unit) {
  if (!(target > 0)) return '';
  const diff = Math.round(target - (Number(value) || 0));
  const status = goalStatus(value, target);
  if (status === 'on') return diff >= 0 ? `On target · ${diff} ${unit} left` : `On target · ${-diff} ${unit} over`;
  return diff >= 0 ? `${diff.toLocaleString()} ${unit} left` : `${(-diff).toLocaleString()} ${unit} over`;
}

/**
 * The 7-day view: for each day, each metric's status (or null if nothing was logged that day).
 * @param {number[]} dayKeys the 7 days, oldest first
 * @param {Map<number, {calories, proteinG, carbsG, fatG}>} totalsByDay
 * @param {object} targets
 */
export function weekGrid(dayKeys, totalsByDay, targets) {
  return dayKeys.map((dayKey) => {
    const totals = totalsByDay.get(dayKey);
    return {
      dayKey,
      logged: Boolean(totals),
      statuses: Object.fromEntries(METRICS.map(({ key }) => [key, totals ? goalStatus(totals[key], targets?.[key]) : null])),
    };
  });
}

/** How many of the 7 days hit the calorie goal (only days with meals count). */
export function daysOnTarget(grid, key = 'calories') {
  return grid.filter((day) => day.statuses[key] === 'on').length;
}
