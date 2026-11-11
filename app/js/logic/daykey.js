// daykey.js
// Converts dates to/from a "day key": a number like 20261110 meaning Nov 10, 2026.
// Storing days this way keeps a workout on the day you logged it (even if you
// travel across time zones) and makes "everything on this day/month" lookups simple.
// All functions use the phone's local time.

/** 2026-11-10 at any time → 20261110 */
export function dayKeyFromDate(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Today's day key. */
export function todayKey() {
  return dayKeyFromDate(new Date());
}

/** 20261110 → { year: 2026, month: 11, day: 10 } */
export function dayKeyParts(key) {
  return { year: Math.floor(key / 10000), month: Math.floor(key / 100) % 100, day: key % 100 };
}

/** 20261110 → Date for Nov 10, 2026 at local midnight. */
export function startOfDay(key) {
  const { year, month, day } = dayKeyParts(key);
  return new Date(year, month - 1, day);
}

/** The date of `key` combined with the clock time of `time`.
 *  Used when logging a workout onto a past day from the calendar. */
export function dateOnDayAtTime(key, time) {
  const { year, month, day } = dayKeyParts(key);
  return new Date(year, month - 1, day, time.getHours(), time.getMinutes(), time.getSeconds());
}

/** Day key `n` days after `key` (n can be negative). */
export function addDays(key, n) {
  const { year, month, day } = dayKeyParts(key);
  return dayKeyFromDate(new Date(year, month - 1, day + n));
}

/** Every key that could belong to the month containing `date`.
 *  Nov 2026 → { first: 20261101, last: 20261131 }. Day 31 doesn't exist in
 *  November, but no real key falls in that gap, so the range is still exact. */
export function monthRange(date) {
  const base = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100;
  return { first: base + 1, last: base + 31 };
}

/** Date → "2026-11-10T18:45", the format <input type="datetime-local"> uses. */
export function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "2026-11-10T18:45" → Date (local time), or null if the text isn't valid. */
export function fromLocalInputValue(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(text ?? '');
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return new Date(y, mo - 1, d, h, mi);
}
