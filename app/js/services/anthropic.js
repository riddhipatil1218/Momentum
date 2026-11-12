// anthropic.js
// The one place Momentum talks to the internet: asking Claude to estimate a meal.
// The API key is read from the phone's storage and sent only to api.anthropic.com.
// It is never logged.

import { API_URL, buildHeaders, buildRequestBody, EstimateError, friendlyError, isFallbackRejection,
         isWebSearchRejection, parseEstimateResponse } from '../logic/mealEstimate.js';

const MAX_PAUSED_CONTINUES = 3;

/**
 * @param {string} apiKey
 * @param {Array} messages the conversation so far
 * @param {{ webLookup?: boolean }} options  allow Claude to search the web for nutrition
 * @returns {Promise<{ estimate, assistantContent, toolUseId, sources }>}
 */
export async function estimateMeal(apiKey, messages, { webLookup = true } = {}) {
  // The claude.ai prototype can't reach the internet, so it plugs in a demo estimator.
  if (typeof globalThis.momentumDemoEstimator === 'function') {
    return globalThis.momentumDemoEstimator(messages);
  }

  let options = { withFallback: true, webLookup };
  let conversation = messages;
  const pausedContent = [];
  let pauses = 0;

  for (let attempt = 0; attempt <= MAX_PAUSED_CONTINUES + 2; attempt++) {
    const result = await send(apiKey, conversation, options);

    if (!result.ok) {
      // Retry once without an option this account doesn't accept.
      if (options.withFallback && isFallbackRejection(result.status, result.body)) {
        options = { ...options, withFallback: false };
        continue;
      }
      if (options.webLookup && isWebSearchRejection(result.status, result.body)) {
        options = { ...options, webLookup: false };
        continue;
      }
      throw new EstimateError(friendlyError(result.status, result.body));
    }

    // A long web search can pause; send the paused reply back unchanged to let it finish.
    if (result.body?.stop_reason === 'pause_turn' && pauses < MAX_PAUSED_CONTINUES) {
      pauses++;
      pausedContent.push(...result.body.content);
      conversation = [...messages, { role: 'assistant', content: [...pausedContent] }];
      continue;
    }

    const parsed = parseEstimateResponse(result.body);
    // The whole turn (paused parts + final part) goes into the history as one assistant message.
    return { ...parsed, assistantContent: [...pausedContent, ...parsed.assistantContent] };
  }
  throw new EstimateError('The estimate took too long. Please try again.');
}

async function send(apiKey, messages, options) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: buildHeaders(apiKey, options),
      body: JSON.stringify(buildRequestBody(messages, options)),
    });
  } catch {
    return { ok: false, status: 0, body: null }; // offline or blocked
  }
  let body = null;
  try { body = await response.json(); } catch { /* not JSON */ }
  return { ok: response.ok, status: response.status, body };
}
