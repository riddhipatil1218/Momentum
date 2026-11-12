// macros.js — the Macros tab with a FAKE Anthropic server (never a real key or real calls):
// request shape, estimate card, sources, replies, photos, paused searches, web search turned
// off, the online-lookup setting, errors, logging, Log again, favorites, and meal sections.

import { check, dayAgo, estimateReply, fakeAnthropic, hold, newPhone, onboard, putRecords, SAMPLE_ESTIMATE, scrollsSideways, text }
  from '../helpers.js';

const FAKE_KEY = 'sk-ant-test-not-a-real-key-0000';

export async function macrosSuite(browser, { appUrl, screenshots, iconPath }) {
  const { context, page } = await newPhone(browser);
  await page.goto(appUrl);
  await onboard(page);

  await page.click('[data-tab="macros"]');
  await page.waitForSelector('.key-needed');
  check('without a key, the Macros tab asks for one', await page.isVisible('text=Add API key'));
  await page.click('text=Add API key');
  await page.fill('input[name="key"]', 'hello'); await page.click('text=Save key');
  check('a key that isn’t an Anthropic key is rejected', await page.isVisible('.sheet .form-problems'));
  await page.fill('input[name="key"]', FAKE_KEY); await page.click('text=Save key');
  await page.waitForSelector('[data-composer]');

  // A restaurant meal with a web search
  let mode = 'search';
  const requests = await fakeAnthropic(page, (body) => {
    if (mode === 'search') return { json: estimateReply(SAMPLE_ESTIMATE, { search: true, id: 'toolu_first' }) };
    if (mode === 'reply') return { json: estimateReply({ ...SAMPLE_ESTIMATE, calories: 500, fat_g: 10 }, { id: 'toolu_second' }) };
    if (mode === 'pause') {
      const resumed = body.messages.at(-1).role === 'assistant';
      return { json: resumed ? estimateReply({ ...SAMPLE_ESTIMATE, name: 'Finished after pause' }) : estimateReply(SAMPLE_ESTIMATE, { search: true, stop: 'pause_turn' }) };
    }
    if (mode === 'nosearch') {
      if (body.tools.some((t) => t.name === 'web_search')) {
        return { status: 400, json: { type: 'error', error: { type: 'invalid_request_error', message: 'Web search is not enabled for this organization.' } } };
      }
      return { json: estimateReply({ ...SAMPLE_ESTIMATE, name: 'Without search' }) };
    }
    if (mode === 'badkey') return { status: 401, json: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } };
    return { json: estimateReply({ ...SAMPLE_ESTIMATE, name: 'Granola bar', calories: 200, basis: 'Nutrition label in photo' }) };
  });

  await page.click('.examples .chip >> nth=1');
  await page.click('.send-button');
  await page.waitForSelector('.estimate-card');
  const first = requests[0];
  check('request uses claude-opus-5-5 at medium effort', first.body.model === 'claude-opus-5-5' && first.body.output_config.effort === 'medium');
  check('request offers the strict estimate tool and web search (max 3)',
    first.body.tools[0].name === 'record_meal_estimate' && first.body.tools[0].strict === true && first.body.tools[1].type === 'web_search_20250305' && first.body.tools[1].max_uses === 3);
  check('request has no output_config.format, temperature or forced tool choice',
    !('format' in first.body.output_config) && !('temperature' in first.body) && !('tool_choice' in first.body));
  check('key goes only in x-api-key, with browser access allowed',
    first.headers['x-api-key'] === FAKE_KEY && first.headers['anthropic-dangerous-direct-browser-access'] === 'true');
  check('estimate card shows the numbers, basis and source link',
    (await page.inputValue('[data-estimate] input[name="calories"]')) === '640' &&
    (await page.textContent('.estimate-basis')).includes('Restaurant published nutrition') &&
    (await page.getAttribute('.estimate-sources a', 'href')) === 'https://www.example-restaurant.com/nutrition');

  // Edit then reply: the reply answers the previous tool call and passes the edit along
  await page.fill('[data-estimate] input[name="fatG"]', '12');
  mode = 'reply';
  await page.fill('[data-composer] textarea', 'no sour cream');
  await page.click('.send-button');
  await page.waitForFunction(() => document.querySelectorAll('.estimate-card').length === 2);
  const reply = requests[1].body.messages;
  check('a reply starts with the tool result for the previous estimate', reply.at(-1).content[0].type === 'tool_result' && reply.at(-1).content[0].tool_use_id === 'toolu_first');
  check('a reply mentions numbers you edited on the card', reply.at(-1).content.at(-1).text.startsWith('(I adjusted'));
  check('the earlier reply (with search results) is sent back unchanged', reply[1].content.some((b) => b.type === 'web_search_tool_result'));

  // Log it
  await page.locator('[data-log-estimate]').last().click();
  await page.waitForSelector('.toast.visible');
  await page.waitForTimeout(300);
  check('logging shows Undo and adds the meal to Today’s meals', (await page.textContent('.toast span')).startsWith('Logged') && (await page.locator('[data-edit-meal]').count()) === 1);
  check('the meal becomes a Log again chip', (await page.locator('.meal-chip').count()) === 1);
  const order = await page.evaluate(() => [...document.querySelectorAll('.view > section')].map((s) => s.className.split(' ')[1] || s.className));
  check('Today’s meals comes before Log again', order.indexOf('meals-card') < order.indexOf('quick-log'), order.join(','));

  // Photo
  mode = 'photo';
  await page.setInputFiles('[data-photo]', iconPath);
  await page.waitForSelector('.photo-preview img');
  await page.click('.send-button');
  await page.waitForFunction(() => document.querySelectorAll('.estimate-card').length === 3);
  const photoTurn = requests.at(-1).body.messages;
  check('after logging, the next message starts a new meal', photoTurn.length === 1);
  check('a photo is sent as an image before the text', photoTurn[0].content[0].type === 'image' && photoTurn[0].content[0].source.media_type === 'image/jpeg');

  // Paused search, web search turned off, lookup setting off, bad key
  mode = 'pause';
  await page.click('[data-action="new-meal"]');
  await page.fill('[data-composer] textarea', 'restaurant bowl'); await page.click('.send-button');
  await page.waitForSelector('.estimate-card');
  check('a paused search is continued automatically', (await page.inputValue('.estimate-name')) === 'Finished after pause');
  mode = 'nosearch';
  await page.click('[data-action="new-meal"]');
  await page.fill('[data-composer] textarea', 'restaurant bowl'); await page.click('.send-button');
  await page.waitForSelector('.estimate-card');
  check('if web search is turned off for the account, it retries without it', (await page.inputValue('.estimate-name')) === 'Without search');
  await page.click('[data-tab="settings"]'); await page.click('[data-web-lookup]'); await page.waitForTimeout(300);
  await page.click('[data-tab="macros"]');
  mode = 'reply';
  await page.click('[data-action="new-meal"]');
  await page.fill('[data-composer] textarea', 'oatmeal'); await page.click('.send-button');
  await page.waitForSelector('.estimate-card');
  check('turning off online lookups removes web search from the request', requests.at(-1).body.tools.length === 1);
  mode = 'badkey';
  await page.click('[data-action="new-meal"]');
  await page.fill('[data-composer] textarea', 'pasta'); await page.click('.send-button');
  await page.waitForSelector('.bubble.error');
  check('a rejected key shows a plain message', (await page.textContent('.bubble.error')).includes('API key wasn’t accepted'));

  // Log again + favorite
  await page.click('.meal-chip'); await page.waitForTimeout(400);
  check('tapping Log again logs the meal again', (await page.locator('[data-edit-meal]').count()) === 2);
  await hold(page, '.meal-chip');
  await page.click('[data-favorite]'); await page.waitForTimeout(200);
  await page.click('.sheet-right button'); await page.waitForTimeout(300);
  check('a held saved meal can be made a favorite', (await page.locator('.meal-chip .star').count()) === 1);

  // Sections and moving a meal
  const morning = dayAgo(0, 8);
  await putRecords(page, { meals: [{ id: 'breakfast-1', ...morning, name: 'Oatmeal', calories: 300, proteinG: 10, carbsG: 50, fatG: 6, assumptions: [] }] });
  check('meals are grouped into sections', (await page.locator('.meal-section-head').allTextContents()).some((t) => t.includes('Breakfast')));
  await page.click('[data-edit-meal="breakfast-1"]'); await page.waitForSelector('.sheet input[name="when"]');
  const when = await page.inputValue('.sheet input[name="when"]');
  await page.fill('.sheet input[name="when"]', `${when.slice(0, 11)}19:30`);
  await page.click('.sheet-right button'); await page.waitForTimeout(400);
  check('changing a meal’s time moves it to the right section', (await page.locator('.meal-section-head span:first-child').allTextContents()).includes('Dinner'));

  check('Macros never scrolls sideways', !(await scrollsSideways(page)));
  if (screenshots) await page.screenshot({ path: `${screenshots}/macros.png`, fullPage: true });
  check('Macros: no page errors', page.errors.filter((e) => !/40[01]/.test(e)).length === 0, page.errors.join('; '));
  await context.close();
}
