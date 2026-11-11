// numbers.js
// Running pace, and converting between numbers and the text typed into number fields.

/** 30 min over 3 mi → 10. Returns null when either value is missing or zero. */
export function paceMinutesPerMile(durationMinutes, distanceMiles) {
  if (!(durationMinutes > 0) || !(distanceMiles > 0)) return null;
  return durationMinutes / distanceMiles;
}

/** 9.5 → "9:30 /mi". Rounds to the nearest second (9.999 → "10:00 /mi"). */
export function formatPace(minutesPerMile) {
  const totalSeconds = Math.round(minutesPerMile * 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${Math.floor(totalSeconds / 60)}:${seconds} /mi`;
}

/** "3.5" → 3.5, "3,5" → 3.5, "" → null, "abc" → null */
export function parseNumber(text) {
  const cleaned = String(text ?? '').trim().replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** 30 → "30", 3.10 → "3.1", 3.14159 → "3.14", null → "" */
export function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(Math.round(value * 100) / 100);
}
