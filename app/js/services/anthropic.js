// anthropic.js
// The one place Momentum talks to the internet: asking Claude to estimate a meal.
// The API key is read from the phone's storage and sent only to api.anthropic.com.
// It is never logged.

import { API_URL, buildHeaders, buildRequestBody, EstimateError, friendlyError,
         isFallbackRejection, parseEstimateResponse } from '../logic/mealEstimate.js';

/**
 * @param {string} apiKey
 * @param {Array} messages the conversation so far (user text + full assistant content)
 * @returns {Promise<{ estimate: object, assistantContent: Array }>}
 */
export async function estimateMeal(apiKey, messages) {
  // The claude.ai prototype can't reach the internet, so it plugs in a demo estimator.
  if (typeof globalThis.momentumDemoEstimator === 'function') {
    return globalThis.momentumDemoEstimator(messages);
  }

  let result = await send(apiKey, messages, true);
  // If the account doesn't accept the fallback option, try once more without it.
  if (!result.ok && isFallbackRejection(result.status, result.body)) {
    result = await send(apiKey, messages, false);
  }
  if (!result.ok) throw new EstimateError(friendlyError(result.status, result.body));
  return parseEstimateResponse(result.body);
}

async function send(apiKey, messages, withFallback) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: buildHeaders(apiKey, { withFallback }),
      body: JSON.stringify(buildRequestBody(messages, { withFallback })),
    });
  } catch {
    return { ok: false, status: 0, body: null }; // offline or blocked
  }
  let body = null;
  try { body = await response.json(); } catch { /* not JSON */ }
  return { ok: response.ok, status: response.status, body };
}
