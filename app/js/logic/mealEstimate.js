// mealEstimate.js
// Everything about the AI meal estimate that doesn't touch the network:
// the instructions we give Claude, the exact shape of the answer, building the request,
// reading the reply, and turning errors into plain words. (The network call is in
// services/anthropic.js.) Kept pure so it can be unit tested.
//
// How Claude answers (SPEC D69): it calls a strict tool, `record_meal_estimate`, whose
// input is guaranteed to match ESTIMATE_SCHEMA. It may first use web search to find
// official restaurant or packaged-food nutrition (D70), and it can read photos (D71).

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-opus-5-5';
export const API_VERSION = '2026-10-21';
/** Lets the API retry on a fallback model if the request is declined (SPEC D55). */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
export const ESTIMATE_TOOL_NAME = 'record_meal_estimate';

export const SYSTEM_PROMPT = `You estimate the nutrition of meals for a personal food log.

The user describes what they ate in plain language, and may attach a photo. Work out one combined estimate for everything they ate: total calories (kcal) and grams of protein, carbohydrates and fat. Give your answer by calling the record_meal_estimate tool exactly once.

Getting the numbers right:
- Use the amounts the user gives. When they don't give one, assume a typical US portion and say so.
- Restaurants, chains, cafés, and branded or packaged products: if the web_search tool is available, search for the official published nutrition (the restaurant's nutrition page or the product's label or maker's site) and use those values, adjusted for the size, customizations and amount eaten. Prefer official sources over third-party sites. If you can't find official numbers, use the closest reliable source and lower your confidence.
- Generic or home-cooked foods: don't search; use standard USDA-style values.
- A photo of a nutrition label: read the per-serving values exactly and multiply by the servings eaten (assume 1 serving unless told otherwise, and say so). A photo of a plate or menu item: estimate portions from what you see.
- Count cooking fats, sauces, dressings, milk and sweeteners when the description implies them.
- Round calories to the nearest 5 and grams to whole numbers.

Fields:
- name: a short meal name the user will recognize later (2 to 5 words), e.g. "Chipotle chicken bowl".
- assumptions: one line per item with the portion you assumed and its rough calories, e.g. "2 large eggs, scrambled with 1 tsp butter (~190 kcal)".
- basis: a few words on where the numbers came from, e.g. "Chipotle official nutrition", "Nutrition label in photo", "USDA typical values".
- confidence: "high" for official or label numbers with known amounts; "medium" when portions are guessed; "low" when the description is vague or the dish varies a lot.
- is_food: false only if the message is not about food or drink. Then set the numbers to 0 and use assumptions to say briefly what you need.

When the user replies with a correction (a different portion, a swap, an addition or removal), call record_meal_estimate again with the full updated estimate for the whole meal, not just the change.`;

export const ESTIMATE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    calories: { type: 'number' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    assumptions: { type: 'array', items: { type: 'string' } },
    basis: { type: 'string' },
    is_food: { type: 'boolean' },
  },
  required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence', 'assumptions', 'basis', 'is_food'],
  additionalProperties: false,
};

export const ESTIMATE_TOOL = {
  name: ESTIMATE_TOOL_NAME,
  description: 'Record the nutrition estimate for the meal the user described. Call this exactly once per reply to give your answer.',
  strict: true, // the input is guaranteed to match the schema
  input_schema: ESTIMATE_SCHEMA,
};

/** Claude's web search (basic version), capped at 3 searches per reply to keep costs low. */
export const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 3 };

/** The request body for one estimate. `messages` is the conversation so far (append-only). */
export function buildRequestBody(messages, { withFallback = true, webLookup = true } = {}) {
  const body = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages,
    tools: webLookup ? [ESTIMATE_TOOL, WEB_SEARCH_TOOL] : [ESTIMATE_TOOL],
    output_config: { effort: 'medium' }, // a bit more care for accuracy (D72)
  };
  if (withFallback) body.fallbacks = 'default';
  return body;
}

/** The HTTP headers. The key only ever goes to Anthropic. */
export function buildHeaders(apiKey, { withFallback = true } = {}) {
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    // Required for calling the API straight from a browser/phone app.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (withFallback) headers['anthropic-beta'] = FALLBACK_BETA;
  return headers;
}

/**
 * The content of a user turn. If Claude's last reply called the estimate tool, the next
 * user turn must start by answering that call (a tool_result), then the new message.
 * @param {string} text
 * @param {{ pendingToolUseId?: string, image?: { mediaType: string, data: string } }} options
 */
export function userTurnContent(text, { pendingToolUseId = null, image = null } = {}) {
  const content = [];
  if (pendingToolUseId) {
    content.push({ type: 'tool_result', tool_use_id: pendingToolUseId, content: 'The estimate was shown to the user.' });
  }
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  }
  content.push({ type: 'text', text: text || 'Estimate the food in this photo.' });
  return content;
}

/** An error whose message is safe to show the user as-is. */
export class EstimateError extends Error {}

/**
 * Reads a successful API response.
 * @returns {{ estimate, assistantContent, toolUseId, sources }} assistantContent must be sent
 *          back unchanged as the assistant turn; toolUseId must be answered in the next turn.
 */
export function parseEstimateResponse(response) {
  if (response?.stop_reason === 'refusal') {
    throw new EstimateError('Claude couldn’t estimate that one. Try describing the meal differently.');
  }
  if (response?.stop_reason === 'max_tokens') {
    throw new EstimateError('The estimate was cut short. Please try again.');
  }
  const content = response?.content ?? [];
  const call = content.filter((b) => b.type === 'tool_use' && b.name === ESTIMATE_TOOL_NAME).at(-1);
  if (!call) {
    throw new EstimateError('Claude didn’t return an estimate that time. Please try again.');
  }
  return {
    estimate: normalizeEstimate(call.input),
    assistantContent: content,
    toolUseId: call.id,
    sources: searchSources(content),
  };
}

/** The web pages Claude looked at (title + link), so the card can show its sources. */
export function searchSources(content, limit = 3) {
  const seen = new Set();
  const sources = [];
  for (const block of content) {
    if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      if (result.type !== 'web_search_result' || !/^https:\/\//.test(result.url ?? '') || seen.has(result.url)) continue;
      seen.add(result.url);
      sources.push({ title: String(result.title || new URL(result.url).hostname), url: result.url });
    }
  }
  return sources.slice(0, limit);
}

/** Cleans up the numbers and fields so the rest of the app can trust them. */
export function normalizeEstimate(data) {
  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };
  const confidence = ['high', 'medium', 'low'].includes(data?.confidence) ? data.confidence : 'medium';
  return {
    name: String(data?.name ?? '').trim() || 'Meal',
    calories: number(data?.calories),
    proteinG: number(data?.protein_g),
    carbsG: number(data?.carbs_g),
    fatG: number(data?.fat_g),
    confidence,
    assumptions: Array.isArray(data?.assumptions) ? data.assumptions.map(String).filter(Boolean) : [],
    basis: String(data?.basis ?? '').trim(),
    isFood: data?.is_food !== false,
  };
}

/** Plain-words message for a failed request. */
export function friendlyError(status, body) {
  const type = body?.error?.type;
  if (status === 401 || type === 'authentication_error') {
    return 'Your API key wasn’t accepted. Check it in Settings → Anthropic API key.';
  }
  if (status === 403 || type === 'permission_error') {
    return 'This API key isn’t allowed to use that model. Check your Anthropic account.';
  }
  if (status === 429 || type === 'rate_limit_error') {
    return 'Too many requests right now. Wait a minute and try again.';
  }
  if (status === 402 || /credit|billing/i.test(body?.error?.message ?? '')) {
    return 'Your Anthropic account is out of credit. Add credit at console.anthropic.com.';
  }
  if (status === 413) return 'That photo is too large. Try a smaller one.';
  if (status === 529 || type === 'overloaded_error' || status >= 500) {
    return 'Anthropic is busy right now. Try again in a moment.';
  }
  if (status === 0) return 'No connection. Meal estimates need the internet.';
  return 'Something went wrong getting the estimate. Please try again.';
}

/** True if a 400 error is about the fallback option (so we can retry without it). */
export function isFallbackRejection(status, body) {
  return status === 400 && /fallback/i.test(body?.error?.message ?? '');
}

/** True if a 400 error is about web search (e.g. turned off for the organization). */
export function isWebSearchRejection(status, body) {
  return status === 400 && /web.?search/i.test(body?.error?.message ?? '');
}

/** When you edited the card before replying, tell Claude your numbers. */
export function editedNote(estimate) {
  return `(I adjusted the last estimate to: ${estimate.name}, ${estimate.calories} kcal, ` +
         `${estimate.proteinG} g protein, ${estimate.carbsG} g carbs, ${estimate.fatG} g fat.)`;
}
