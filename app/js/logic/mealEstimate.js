// mealEstimate.js
// Everything about the AI meal estimate that doesn't touch the network:
// the instructions we give Claude, the exact JSON shape we ask for, building the request,
// reading the reply, and turning errors into plain words. (The network call is in
// services/anthropic.js.) Kept pure so it can be unit tested.

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-opus-5-5';
export const API_VERSION = '2026-10-21';
/** Lets the API retry on a fallback model if the request is declined (SPEC D55). */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export const SYSTEM_PROMPT = `You estimate the nutrition of meals for a personal food log.

The user describes what they ate in plain language. Return one combined estimate for everything they describe: total calories (kcal) and grams of protein, carbohydrates and fat.

How to estimate:
- Use the amounts the user gives. When they don't give one, assume a typical US portion and say so.
- Use standard, brand-neutral nutrition values (USDA-style) unless a brand or restaurant is named.
- Count cooking fats, sauces, dressings, milk and sweeteners when the description implies them.
- Round calories to the nearest 5 and grams to whole numbers.

Fields:
- name: a short meal name the user will recognize later (2 to 5 words), e.g. "Eggs, toast and oat latte".
- assumptions: one line per item with the portion you assumed and its rough calories, e.g. "2 large eggs, scrambled with 1 tsp butter (~190 kcal)".
- confidence: "high" when amounts are given and the foods are standard; "medium" when portions are guessed; "low" when the description is vague or the dish varies a lot.
- is_food: false only if the message is not about food or drink. Then set the numbers to 0 and use assumptions to say briefly what you need.

When the user replies with a correction (a different portion, a swap, an addition or removal), return the full updated estimate for the whole meal, not just the change.`;

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
    is_food: { type: 'boolean' },
  },
  required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence', 'assumptions', 'is_food'],
  additionalProperties: false,
};

/** The request body for one estimate. `messages` is the conversation so far (append-only). */
export function buildRequestBody(messages, { withFallback = true } = {}) {
  const body = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages,
    output_config: {
      effort: 'low', // a short, simple task: quick and inexpensive
      format: { type: 'json_schema', schema: ESTIMATE_SCHEMA },
    },
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

/** An error whose message is safe to show the user as-is. */
export class EstimateError extends Error {}

/**
 * Reads a successful API response.
 * @returns {{ estimate: object, assistantContent: Array }} assistantContent must be sent back,
 *          unchanged, as the assistant turn of the next request.
 */
export function parseEstimateResponse(response) {
  if (response?.stop_reason === 'refusal') {
    throw new EstimateError('Claude couldn’t estimate that one. Try describing the meal differently.');
  }
  if (response?.stop_reason === 'max_tokens') {
    throw new EstimateError('The estimate was cut short. Please try again.');
  }
  const textBlocks = (response?.content ?? []).filter((block) => block.type === 'text');
  const text = textBlocks.at(-1)?.text;
  if (!text) throw new EstimateError('The reply was empty. Please try again.');

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new EstimateError('The reply couldn’t be read. Please try again.');
  }
  return { estimate: normalizeEstimate(data), assistantContent: response.content };
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

/** When you edited the card before replying, tell Claude your numbers. */
export function editedNote(estimate) {
  return `(I adjusted the last estimate to: ${estimate.name}, ${estimate.calories} kcal, ` +
         `${estimate.proteinG} g protein, ${estimate.carbsG} g carbs, ${estimate.fatG} g fat.)`;
}
