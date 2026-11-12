// helpers.js — shared tools for the click-through (end-to-end) tests.
// These tests open the real app in a hidden browser that pretends to be an iPhone,
// tap through screens like a person would, and check what appears.
//
// Rules (see CLAUDE.md): only made-up example people, never personal stats; never a real
// API key — Anthropic is replaced by a fake server (`fakeAnthropic`).

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const require = createRequire(import.meta.url);

/** Loads Playwright (installed separately; see tools/e2e/README.md). */
export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    console.error('Playwright isn’t installed. See tools/e2e/README.md for the one-time setup.');
    process.exit(2);
  }
}

// ---- A tiny web server for the app folder (no Python needed) ---------------------------

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

/** Serves `folder` on a free port. Returns { url, close }. */
export async function serve(folder) {
  const root = resolve(folder);
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = normalize(join(root, path));
      if (!file.startsWith(root)) throw new Error('outside');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) };
}

// ---- Checks -------------------------------------------------------------------------------

const results = [];

/** Records one check. Prints ✓ or ✗ with what was expected. */
export function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && detail ? `  (got: ${detail})` : ''}`);
}
export const allResults = () => results;

// ---- Browser helpers --------------------------------------------------------------------

/** A new iPhone-sized page. Collects page errors so suites can check there were none. */
export async function newPhone(browser, { colorScheme = 'light', acceptDownloads = false } = {}) {
  const { devices } = loadPlaywright();
  const context = await browser.newContext({ ...devices['iPhone 13'], colorScheme, acceptDownloads });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return { context, page };
}

/** A made-up example person (never real stats). */
export const EXAMPLE_PERSON = { sex: 'Female', age: '30', feet: '5', inches: '6', weight: '150', goal: '140' };

/** Fills in the welcome screen with the example person and taps Start. */
export async function onboard(page) {
  await page.waitForSelector('[data-stats]');
  await page.click(`.segmented >> text=${EXAMPLE_PERSON.sex}`);
  await page.fill('#stat-age', EXAMPLE_PERSON.age);
  await page.fill('#stat-feet', EXAMPLE_PERSON.feet);
  await page.fill('#stat-inches', EXAMPLE_PERSON.inches);
  await page.fill('#stat-weight', EXAMPLE_PERSON.weight);
  await page.fill('#stat-goal', EXAMPLE_PERSON.goal);
  await page.click('.radio-row >> text=3–4 workouts a week');
  await page.click('text=Calculate my targets');
  await page.click('[data-start]');
  await page.waitForSelector('.week-card');
}

/**
 * Writes records straight into the app's database, then nudges the screen to redraw.
 * `rows` = { storeName: [record, …] }. Use `dayAgo(n, hour)` for dates.
 */
export async function putRecords(page, rows) {
  await page.evaluate((rows) => new Promise((resolve, reject) => {
    const req = indexedDB.open('momentum');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(Object.keys(rows), 'readwrite');
      for (const [store, items] of Object.entries(rows)) for (const item of items) tx.objectStore(store).put(item);
      tx.oncomplete = () => { db.close(); window.dispatchEvent(new CustomEvent('momentum:changed')); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), rows);
  await page.waitForTimeout(300);
}

/** { date, dayKey } for `daysAgo` days before today at `hour` (local time). */
export function dayAgo(daysAgo, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return { date: d.toISOString(), dayKey: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() };
}

/** Text with spaces squashed, for easier comparisons. */
export async function text(page, selector) {
  return (await page.textContent(selector)).replace(/\s+/g, ' ').trim();
}

/** Press and hold (for the hidden edit menus). */
export async function hold(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

/** True if the page scrolls sideways (it never should). */
export const scrollsSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

// ---- A fake Anthropic server --------------------------------------------------------------

/**
 * Replaces https://api.anthropic.com/v1/messages for this page.
 * `respond(body, requestNumber)` returns { status?, json } for each request.
 * Returns the list of request bodies the app sent.
 */
export async function fakeAnthropic(page, respond) {
  const requests = [];
  await page.unroute('https://api.anthropic.com/v1/messages').catch(() => {});
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    const body = JSON.parse(route.request().postData());
    requests.push({ body, headers: route.request().headers() });
    const { status = 200, json } = await respond(body, requests.length);
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(json) });
  });
  return requests;
}

/** A reply where Claude calls the estimate tool, optionally after a web search. */
export function estimateReply(input, { search = false, id = `toolu_${Math.random().toString(36).slice(2, 8)}`, stop = 'tool_use' } = {}) {
  return {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: stop,
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      ...(search ? [
        { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'nutrition' } },
        { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [
          { type: 'web_search_result', url: 'https://www.example-restaurant.com/nutrition', title: 'Nutrition | Example Restaurant', encrypted_content: 'enc' },
        ] },
      ] : []),
      ...(stop === 'pause_turn' ? [] : [{ type: 'tool_use', id, name: 'record_meal_estimate', input }]),
    ],
  };
}

/** A made-up meal estimate in the shape Claude returns. */
export const SAMPLE_ESTIMATE = {
  name: 'Chicken burrito bowl', calories: 640, protein_g: 42, carbs_g: 68, fat_g: 20, confidence: 'medium',
  assumptions: ['4 oz chicken (~180 kcal)', '1/2 cup rice (~105 kcal)'], basis: 'Restaurant published nutrition', is_food: true,
};
