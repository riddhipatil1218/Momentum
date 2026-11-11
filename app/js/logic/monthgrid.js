// monthgrid.js
// Works out the cells of a month calendar: blank cells before the 1st (so the 1st
// lands under the right weekday), one cell per day, then blanks to finish the last row.

/**
 * @param {Date} date any date inside the month
 * @param {number} firstWeekday 0 = weeks start Sunday, 1 = Monday, …
 * @returns {{ monthStart: Date, cells: (Date|null)[], leadingBlanks: number }}
 */
export function monthGrid(date, firstWeekday = 0) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const dayCount = new Date(year, month + 1, 0).getDate(); // "day 0" of next month = last day of this one

  const leadingBlanks = (monthStart.getDay() - firstWeekday + 7) % 7;
  const cells = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= dayCount; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return { monthStart, cells, leadingBlanks };
}

/** Single-letter weekday headers starting on `firstWeekday`. */
export function weekdayLetters(firstWeekday = 0) {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday first
  return [...letters.slice(firstWeekday), ...letters.slice(0, firstWeekday)];
}

/** The phone's preferred first day of the week (0 = Sunday, 1 = Monday). Defaults to Sunday. */
export function preferredFirstWeekday(localeName = globalThis.navigator?.language ?? 'en-US') {
  try {
    const locale = new Intl.Locale(localeName);
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info?.firstDay) return info.firstDay % 7; // Intl uses 1 = Monday … 7 = Sunday
  } catch { /* older browsers: fall through */ }
  return 0;
}
