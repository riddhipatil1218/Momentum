// meals.test.js — macro totals, saved-meal ordering, and the AI meal estimate
// (request shape, reading replies, and plain-words errors). No network calls.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayTotals, macroLine, mealKey, sortSavedMeals } from '../app/js/logic/meals.js';
import { buildHeaders, buildRequestBody, editedNote, EstimateError, friendlyError, isFallbackRejection,
         isWebSearchRejection, MODEL, normalizeEstimate, parseEstimateResponse, searchSources, userTurnContent }
  from '../app/js/logic/mealEstimate.js';

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

test('request uses the strict estimate tool, web search, and the right model', () => {
  const body = buildRequestBody([{ role: 'user', content: '2 eggs' }]);
  assert.equal(body.model, MODEL);
  const [tool, search] = body.tools;
  assert.equal(tool.name, 'record_meal_estimate');
  assert.equal(tool.strict, true);
  assert.equal(tool.input_schema.additionalProperties, false);
  assert.ok(tool.input_schema.required.includes('basis'));
  assert.equal(search.type, 'web_search_20250305');
  assert.equal(search.max_uses, 3);
  assert.equal(body.output_config.effort, 'medium');
  assert.equal('format' in body.output_config, false); // can't be combined with web-search citations
  assert.equal(body.fallbacks, 'default');
  assert.equal('temperature' in body, false);
  assert.equal('tool_choice' in body, false); // forced tool choice isn't allowed on this model
  assert.equal(buildRequestBody([], { webLookup: false }).tools.length, 1);
  assert.equal('fallbacks' in buildRequestBody([], { withFallback: false }), false);
});

test('headers carry the key only in x-api-key and allow browser access', () => {
  const headers = buildHeaders('sk-ant-example');
  assert.equal(headers['x-api-key'], 'sk-ant-example');
  assert.equal(headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(Object.values(headers).filter((v) => v.includes('sk-ant-example')).length, 1);
  assert.equal('anthropic-beta' in buildHeaders('k', { withFallback: false }), false);
});

test('a reply answers the previous tool call first, and photos go before the text', () => {
  assert.deepEqual(userTurnContent('3 eggs'), [{ type: 'text', text: '3 eggs' }]);
  const reply = userTurnContent('make it 3 eggs', { pendingToolUseId: 'toolu_1' });
  assert.deepEqual(reply[0], { type: 'tool_result', tool_use_id: 'toolu_1', content: 'The estimate was shown to the user.' });
  assert.equal(reply[1].text, 'make it 3 eggs');
  const photo = userTurnContent('', { image: { mediaType: 'image/jpeg', data: 'AAAA' } });
  assert.equal(photo[0].type, 'image');
  assert.equal(photo[0].source.media_type, 'image/jpeg');
  assert.equal(photo[1].text, 'Estimate the food in this photo.');
});

// ---- Reading replies ------------------------------------------------------------------

const sample = {
  name: 'Chipotle chicken bowl', calories: 652.4, protein_g: 48, carbs_g: 61, fat_g: 23.6,
  confidence: 'high', assumptions: ['Chicken (~180 kcal)', 'White rice (~210 kcal)'], basis: 'Chipotle official nutrition', is_food: true,
};
const reply = (input, extra = {}) => ({
  stop_reason: 'tool_use',
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'chipotle nutrition' } },
    { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [
      { type: 'web_search_result', url: 'https://www.chipotle.com/nutrition-calculator', title: 'Nutrition Calculator | Chipotle', encrypted_content: 'x' },
      { type: 'web_search_result', url: 'https://www.chipotle.com/nutrition-calculator', title: 'duplicate', encrypted_content: 'y' },
      { type: 'web_search_result', url: 'javascript:alert(1)', title: 'bad link', encrypted_content: 'z' },
    ] },
    { type: 'text', text: 'Based on Chipotle’s published nutrition…', citations: [] },
    { type: 'tool_use', id: 'toolu_9', name: 'record_meal_estimate', input },
  ],
  ...extra,
});

test('the estimate comes from the tool call; sources from the search results', () => {
  const response = reply(sample);
  const { estimate, assistantContent, toolUseId, sources } = parseEstimateResponse(response);
  assert.deepEqual(estimate, {
    name: 'Chipotle chicken bowl', calories: 652, proteinG: 48, carbsG: 61, fatG: 24, confidence: 'high',
    assumptions: ['Chicken (~180 kcal)', 'White rice (~210 kcal)'], basis: 'Chipotle official nutrition', isFood: true,
  });
  assert.equal(assistantContent, response.content); // kept unchanged for the next turn
  assert.equal(toolUseId, 'toolu_9');
  assert.deepEqual(sources, [{ title: 'Nutrition Calculator | Chipotle', url: 'https://www.chipotle.com/nutrition-calculator' }]);
});

test('refusals, cut-off replies and missing estimates give friendly errors', () => {
  assert.throws(() => parseEstimateResponse(reply(sample, { stop_reason: 'refusal' })), EstimateError);
  assert.throws(() => parseEstimateResponse(reply(sample, { stop_reason: 'max_tokens' })), /cut short/);
  assert.throws(() => parseEstimateResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hi!' }] }), /didn’t return an estimate/);
});

test('odd values are cleaned up', () => {
  const e = normalizeEstimate({ name: '  ', calories: -5, protein_g: 'abc', carbs_g: 10.6, fat_g: null, confidence: 'unsure', is_food: false });
  assert.deepEqual(e, { name: 'Meal', calories: 0, proteinG: 0, carbsG: 11, fatG: 0, confidence: 'medium', assumptions: [], basis: '', isFood: false });
});

test('search results without sources give an empty list', () => {
  assert.deepEqual(searchSources([{ type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } }]), []);
});

// ---- Errors ---------------------------------------------------------------------------

test('errors are explained in plain words', () => {
  assert.match(friendlyError(401, { error: { type: 'authentication_error' } }), /API key wasn’t accepted/);
  assert.match(friendlyError(429, null), /Too many requests/);
  assert.match(friendlyError(529, { error: { type: 'overloaded_error' } }), /busy/);
  assert.match(friendlyError(400, { error: { message: 'Your credit balance is too low' } }), /out of credit/);
  assert.match(friendlyError(0, null), /No connection/);
});

test('a rejected web search is detected so it can be retried without it', () => {
  assert.equal(isWebSearchRejection(400, { error: { message: 'web search is not enabled for this organization' } }), true);
  assert.equal(isWebSearchRejection(400, { error: { message: 'messages: bad' } }), false);
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
