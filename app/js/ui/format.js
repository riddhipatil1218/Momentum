// format.js
// Friendly date/time text, in the phone's language.

const fmt = (options) => new Intl.DateTimeFormat(undefined, options);

const longDate = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
const mediumDate = fmt({ weekday: 'long', month: 'short', day: 'numeric' });
const shortDate = fmt({ month: 'short', day: 'numeric' });
const monthYear = fmt({ month: 'long', year: 'numeric' });
const time = fmt({ hour: 'numeric', minute: '2-digit' });

/** "Tuesday, November 10" */
export const formatLongDate = (date) => longDate.format(date);
/** "Tuesday, Nov 10" */
export const formatMediumDate = (date) => mediumDate.format(date);
/** "Nov 10" */
export const formatShortDate = (date) => shortDate.format(date);
/** "November 2026" */
export const formatMonthYear = (date) => monthYear.format(date);
/** "6:45 PM" */
export const formatTime = (date) => time.format(date);

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning ☀️';
  if (hour >= 12 && hour < 17) return 'Good afternoon 🌿';
  return 'Good evening 🌙';
}
