// weight.js
// Weigh-ins (logged about every 2 weeks): latest weight, change, trend and the projected
// date for reaching your goal weight.
//
// With weigh-ins this far apart, a 7-day average doesn't make sense, so the trend is a
// straight-line fit through the weigh-ins from the last 4 weeks (SPEC D80). At least two
// weigh-ins at least 10 days apart are needed before a projection is shown.

// About 4 weeks, with a little extra so a weigh-in from exactly 4 weeks ago still counts.
export const TREND_WINDOW_DAYS = 30;
export const MIN_SPAN_DAYS = 10;
export const WEIGH_IN_EVERY_DAYS = 14;

const MS_PER_DAY = 86_400_000;
const toTime = (iso) => new Date(iso).getTime();

/** Oldest first. */
export function sortWeights(weights) {
  return [...weights].sort((a, b) => toTime(a.date) - toTime(b.date));
}

/** The most recent weigh-in on or before a day key, or null. */
export function weightOnOrBefore(weights, dayKey) {
  return sortWeights(weights).filter((w) => w.dayKey <= dayKey).at(-1) ?? null;
}

/**
 * Trend from the last 4 weeks of weigh-ins.
 * @returns {{ enough: boolean, lbPerWeek: number|null, points: number }}
 */
export function weightTrend(weights, now = new Date()) {
  const cutoff = now.getTime() - TREND_WINDOW_DAYS * MS_PER_DAY;
  const recent = sortWeights(weights).filter((w) => toTime(w.date) >= cutoff && toTime(w.date) <= now.getTime());
  if (recent.length < 2) return { enough: false, lbPerWeek: null, points: recent.length };
  const span = (toTime(recent.at(-1).date) - toTime(recent[0].date)) / MS_PER_DAY;
  if (span < MIN_SPAN_DAYS) return { enough: false, lbPerWeek: null, points: recent.length };

  // Least-squares line: pounds against days.
  const xs = recent.map((w) => (toTime(w.date) - toTime(recent[0].date)) / MS_PER_DAY);
  const ys = recent.map((w) => w.pounds);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const slopePerDay = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) /
                      xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  return { enough: true, lbPerWeek: Math.round(slopePerDay * 7 * 100) / 100, points: n };
}

/**
 * When you'd reach your goal at the current pace. `referenceLb` = the weight in your stats.
 * @returns {{ status: 'not-enough-data'|'reached'|'not-heading-there'|'projected', date?: Date, weeks?: number }}
 */
export function projectGoal(weights, goalLb, now = new Date(), referenceLb = null) {
  const latest = sortWeights(weights).at(-1);
  if (!latest || !(goalLb > 0)) return { status: 'not-enough-data' };
  // Losing or gaining is judged from the highest weight seen (or your stats' weight),
  // so it doesn't flip once you pass your goal.
  const highest = Math.max(referenceLb ?? -Infinity, ...weights.map((x) => x.pounds));
  const losing = goalLb < highest;
  if (losing ? latest.pounds <= goalLb : latest.pounds >= goalLb) return { status: 'reached' };
  const trend = weightTrend(weights, now);
  if (!trend.enough) return { status: 'not-enough-data' };
  const towardGoal = losing ? trend.lbPerWeek < 0 : trend.lbPerWeek > 0;
  if (!towardGoal || Math.abs(trend.lbPerWeek) < 0.05) return { status: 'not-heading-there' };
  const weeks = Math.abs(latest.pounds - goalLb) / Math.abs(trend.lbPerWeek);
  return { status: 'projected', weeks: Math.round(weeks * 10) / 10, date: new Date(toTime(latest.date) + weeks * 7 * MS_PER_DAY) };
}

/** When the next weigh-in is due (2 weeks after the last). */
export function nextWeighIn(weights) {
  const latest = sortWeights(weights).at(-1);
  return latest ? new Date(toTime(latest.date) + WEIGH_IN_EVERY_DAYS * MS_PER_DAY) : null;
}
