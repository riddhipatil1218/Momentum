// meals.test.js — macro totals, saved-meal ordering, and the AI meal estimate
// (request shape, reading replies, and plain-words errors). No network calls.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotals, macroLine, mealKey, sortSavedMeals } from '../app/js/logic/meals.js';
import { buildHeaders, buildRequestBody, editedNote, EstimateError, friendlyError, isFallbackRejection,
         MODEL, normalizeEstimate, parseEstimateResponse } from '../app/js/logic/mealEstimate.js';

// ---- Macro totals -------------------------------------------------------------------

test('day totals add up every meal', () => {
  const meals = [
    { calories: 420, proteinG: 30, carbsG: 41, fatG: 14 },
    { calories: 615, proteinG: 42.4, carbsG: 60, fatG: 20.6 },
    { calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3 },
  ];
  assert.deepEqual(dayTotals(meals), { calories: 1130, proteinG: 73, carbsG: 126, fatG: 35 });
});

test('day totals of no meals are zero, and bad values count as zero', () => {
  assert.deepEqual(dayTotals([]), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  assert.deepEqual(dayTotals([{ calories: '100', proteinG: null, carbsG: undefined, fatG: 'x' }]),
    { calories: 100, proteinG: 0, carbsG: 0, fatG: 0 });
});

test('macro line', () => {
  assert.equal(macroLine({ calories: 1420, proteinG: 30.4, carbsG: 41, fatG: 14 }), '1,420 kcal · 30P · 41C · 14F');
});

// ---- Saved meals ----------------------------------------------------------------------

test('meal names match regardless of case and spacing', () => {
  assert.equal(mealKey('  Greek Yogurt   Bowl '), 'greek yogurt bowl');
  assert.equal(mealKey('Greek yogurt bowl'), mealKey('GREEK YOGURT BOWL'));
});

test('favorites come first, then most recently used', () => {
  const saved = [
    { name: 'A', favorite: false, lastUsed: '2026-11-10T08:00:00Z' },
    { name: 'B', favorite: true, lastUsed: '2026-11-01T08:00:00Z' },
    { name: 'C', favorite: false, lastUsed: '2026-11-11T08:00:00Z' },
    { name: 'D', favorite: true, lastUsed: '2026-11-09T08:00:00Z' },
  ];
  assert.deepEqual(sortSavedMeals(saved).map((m) => m.name), ['D', 'B', 'C', 'A']);
});

// ---- Request shape ----------------------------------------------------------------------

test('request asks for structured JSON from the right model', () => {
  const body = buildRequestBody([{ role: 'user', content: '2 eggs' }]);
  assert.equal(body.model, MODEL);
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.output_config.format.schema.additionalProperties, false);
  assert.ok(body.output_config.format.schema.required.includes('assumptions'));
  assert.equal(body.fallbacks, 'default');
  assert.equal('temperature' in body, false); // rejected by the current API version
  assert.equal('fallbacks' in buildRequestBody([], { withFallback: false }), false);
});

test('headers carry the key only in x-api-key and allow browser access', () => {
  const headers = buildHeaders('sk-ant-example');
  assert.equal(headers['x-api-key'], 'sk-ant-example');
  assert.equal(headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(Object.values(headers).filter((v) => v.includes('sk-ant-example')).length, 1);
  assert.equal('anthropic-beta' in buildHeaders('k', { withFallback: false }), false);
});

// ---- Reading replies ------------------------------------------------------------------

const reply = (json, extra = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(json) }],
  ...extra,
});
const sample = {
  name: 'Eggs, toast and oat latte', calories: 512.4, protein_g: 21, carbs_g: 48, fat_g: 25.6,
  confidence: 'medium', assumptions: ['2 large eggs (~140 kcal)', '1 slice sourdough (~120 kcal)'], is_food: true,
};

test('a good reply becomes a clean estimate, and the full content is kept for the next turn', () => {
  const response = reply(sample);
  const { estimate, assistantContent } = parseEstimateResponse(response);
  assert.deepEqual(estimate, {
    name: 'Eggs, toast and oat latte', calories: 512, proteinG: 21, carbsG: 48, fatG: 26,
    confidence: 'medium', assumptions: ['2 large eggs (~140 kcal)', '1 slice sourdough (~120 kcal)'], isFood: true,
  });
  assert.equal(assistantContent, response.content); // thinking block included, unchanged
});

test('refusals, cut-off and unreadable replies give friendly errors', () => {
  assert.throws(() => parseEstimateResponse(reply(sample, { stop_reason: 'refusal' })), EstimateError);
  assert.throws(() => parseEstimateResponse(reply(sample, { stop_reason: 'max_tokens' })), /cut short/);
  assert.throws(() => parseEstimateResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'oops' }] }), /couldn’t be read/);
  assert.throws(() => parseEstimateResponse({ stop_reason: 'end_turn', content: [] }), /empty/);
});

test('odd values are cleaned up', () => {
  const e = normalizeEstimate({ name: '  ', calories: -5, protein_g: 'abc', carbs_g: 10.6, fat_g: null, confidence: 'unsure', is_food: false });
  assert.deepEqual(e, { name: 'Meal', calories: 0, proteinG: 0, carbsG: 11, fatG: 0, confidence: 'medium', assumptions: [], isFood: false });
});

// ---- Errors ---------------------------------------------------------------------------

test('errors are explained in plain words', () => {
  assert.match(friendlyError(401, { error: { type: 'authentication_error' } }), /API key wasn’t accepted/);
  assert.match(friendlyError(429, null), /Too many requests/);
  assert.match(friendlyError(529, { error: { type: 'overloaded_error' } }), /busy/);
  assert.match(friendlyError(400, { error: { message: 'Your credit balance is too low' } }), /out of credit/);
  assert.match(friendlyError(0, null), /No connection/);
});

test('a rejected fallback option is detected so it can be retried without it', () => {
  assert.equal(isFallbackRejection(400, { error: { message: 'fallbacks: not supported' } }), true);
  assert.equal(isFallbackRejection(400, { error: { message: 'messages: bad' } }), false);
  assert.equal(isFallbackRejection(500, { error: { message: 'fallbacks' } }), false);
});

test('edited card values are passed along with the next reply', () => {
  assert.equal(editedNote({ name: 'Oatmeal', calories: 350, proteinG: 12, carbsG: 55, fatG: 8 }),
    '(I adjusted the last estimate to: Oatmeal, 350 kcal, 12 g protein, 55 g carbs, 8 g fat.)');
});
