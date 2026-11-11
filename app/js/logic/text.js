// text.js
// Text helpers.

/** Makes text safe to put inside HTML, so a note like "<b>" shows as typed instead of
 *  being treated as code. Use it on EVERY piece of user-typed text we display. */
export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** "workout" + 2 → "2 workouts" */
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
