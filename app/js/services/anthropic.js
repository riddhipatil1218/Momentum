// anthropic.js
// The one place Momentum talks to the internet: asking Claude to estimate a meal.
// The API key is read from the phone's storage and sent only to api.anthropic.com.
// It is never logged.

import { ANSWER_WITH_TOOL_NOTE, API_URL, buildHeaders, buildRequestBody, EstimateError, friendlyError, isFallbackRejection,
         isWebSearchRejection, parseEstimateResponse } from '../logic/mealEstimate.js';

const MAX_PAUSED_CONTINUES = 3;

/**
 * @param {string} apiKey
 * @param {Array} messages the conversation so far
 * @param {{ webLookup?: boolean, ouraEnabled?: boolean }} options  allow web search; offer the Oura tool
 * @returns {Promise<{ kind, estimate?, oura?, newMessages, toolUseId, sources }>}
 *          newMessages: append these to the conversation (normally just Claude's reply; plus a
 *          reminder and a second reply if Claude first answered in words instead of the tool).
 */
export async function estimateMeal(apiKey, messages, { webLookup = true, ouraEnabled = false } = {}) {
  // The claude.ai prototype can't reach the internet, so it plugs in a demo estimator.
  if (typeof globalThis.momentumDemoEstimator === 'function') {
    return globalThis.momentumDemoEstimator(messages, { ouraEnabled });
  }

  let options = { withFallback: true, webLookup, ouraEnabled };
  let base = messages;      // the conversation, plus the reminder below if it was needed
  let conversation = messages;
  let pausedContent = [];
  let pauses = 0;
  let reminded = false;

  for (let attempt = 0; attempt <= MAX_PAUSED_CONTINUES + 4; attempt++) {
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
      conversation = [...base, { role: 'assistant', content: [...pausedContent] }];
      continue;
    }

    let parsed;
    try {
      parsed = parseEstimateResponse(result.body);
    } catch (error) {
      // Claude answered in words instead of filling in the form: remind it once and ask again.
      if (!error.noToolCall || reminded) {
        if (error.noToolCall && error.replyText) throw new EstimateError(shorten(error.replyText));
        throw error;
      }
      reminded = true;
      base = [...base,
        { role: 'assistant', content: [...pausedContent, ...(result.body?.content ?? [])] },
        { role: 'user', content: [{ type: 'text', text: ANSWER_WITH_TOOL_NOTE }] }];
      conversation = base;
      pausedContent = [];
      pauses = 0;
      continue;
    }
    // The whole turn (paused parts + final part) goes into the history as one assistant message.
    const reply = { role: 'assistant', content: [...pausedContent, ...parsed.assistantContent] };
    return { ...parsed, assistantContent: reply.content, newMessages: [...base.slice(messages.length), reply] };
  }
  throw new EstimateError('The estimate took too long. Please try again.');
}

/** Claude's own words, kept short enough for a chat note. */
function shorten(text, max = 400) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
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
