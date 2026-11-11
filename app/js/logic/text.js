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

/** Wraps every emoji in already-escaped HTML so it shows in black and white (class "mono"). */
export function monoEmoji(html) {
  return String(html).replace(/(\p{Extended_Pictographic}(?:[️‍]|\p{Extended_Pictographic})*)/gu,
    '<span class="mono">$1</span>');
}
