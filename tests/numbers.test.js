// numbers.test.js — running pace, number fields, workout summaries, and safe text.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatPace, paceMinutesPerMile, parseNumber } from '../app/js/logic/numbers.js';
import { escapeHTML, plural } from '../app/js/logic/text.js';
import { DetailKind, workoutSummary } from '../app/js/logic/workouts.js';

test('pace is minutes divided by miles', () => {
  assert.equal(paceMinutesPerMile(30, 3), 10);
});

test('pace needs both values', () => {
  assert.equal(paceMinutesPerMile(30, null), null);
  assert.equal(paceMinutesPerMile(null, 3), null);
  assert.equal(paceMinutesPerMile(30, 0), null);
});

test('pace formatting', () => {
  assert.equal(formatPace(9.5), '9:30 /mi');
  assert.equal(formatPace(8), '8:00 /mi');
  assert.equal(formatPace(9.999), '10:00 /mi'); // rounds up cleanly
});

test('parsing typed numbers', () => {
  assert.equal(parseNumber('3.5'), 3.5);
  assert.equal(parseNumber('3,5'), 3.5);
  assert.equal(parseNumber(' 45 '), 45);
  assert.equal(parseNumber('3.'), 3);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('1e5'), null);
});

test('formatting numbers for fields', () => {
  assert.equal(formatNumber(30), '30');
  assert.equal(formatNumber(3.1), '3.1');
  assert.equal(formatNumber(3.14159), '3.14');
  assert.equal(formatNumber(null), '');
});

test('workout summaries by activity type', () => {
  const base = { durationMinutes: null, notes: '' };
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.running, durationMinutes: 30, distanceMiles: 3 }),
               '30 min · 3 mi · 10:00 /mi');
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.stairMaster, durationMinutes: 20, stairLevel: 8, floors: 60 }),
               '20 min · Level 8 · 60 floors');
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.strength, bodyFocus: 'Glutes' }), 'Glutes');
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.hotYoga, durationMinutes: 60, temperatureF: 105 }),
               '60 min · 105°F');
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.general, notes: 'Felt strong' }), 'Felt strong');
  assert.equal(workoutSummary({ ...base, detailKind: DetailKind.general }), 'Tap to add details');
});

test('user text is made safe for display', () => {
  assert.equal(escapeHTML('<b>"hi" & \'bye\'</b>'), '&lt;b&gt;&quot;hi&quot; &amp; &#39;bye&#39;&lt;/b&gt;');
  assert.equal(escapeHTML(null), '');
});

test('plural', () => {
  assert.equal(plural(1, 'workout'), '1 workout');
  assert.equal(plural(3, 'day'), '3 days');
});

test('emoji are wrapped for black-and-white display', async () => {
  const { monoEmoji } = await import('../app/js/logic/text.js');
  assert.equal(monoEmoji('Keep going 🔥'), 'Keep going <span class="mono">🔥</span>');
  assert.equal(monoEmoji('No emoji here'), 'No emoji here');
  assert.equal(monoEmoji('🏃‍♀️ run'), '<span class="mono">🏃‍♀️</span> run');
});
