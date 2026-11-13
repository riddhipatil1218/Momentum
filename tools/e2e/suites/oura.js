// oura.js — Oura ring screenshots (FAKE Anthropic server, never a real key): the setting,
// pasting a screenshot (Claude recognizes it by itself, no switch), the card (numbers + workouts, already-logged ones
// unticked), saving, the Dashboard using Oura's total burn, and turning Oura off again.

import { check, dayAgo, fakeAnthropic, newPhone, onboard, putRecords, text } from '../helpers.js';

const ouraReply = (input, id = 'toolu_oura') => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'tool_use',
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id, name: 'record_oura_activity', input }],
});
const SCREENSHOT = {
  date: '', total_burn: 2150, active_calories: 520, steps: 10234, activity_minutes: 83, is_oura: true, notes: '',
  workouts: [{ name: 'Strength training', minutes: 45, calories: 240 }, { name: 'Walking', minutes: 30, calories: 110 }],
};

export async function ouraSuite(browser, { appUrl, iconPath, screenshots }) {
  const { context, page } = await newPhone(browser);
  await page.goto(appUrl);
  await onboard(page); // example person: everyday estimate 1,701 kcal
  await putRecords(page, {
    meta: [{ key: 'anthropicApiKey', value: 'sk-ant-test-not-a-real-key-0000' }],
    meals: [{ id: 'm1', ...dayAgo(0, 12), name: 'Lunch', calories: 900, proteinG: 40, carbsG: 90, fatG: 30, assumptions: [] }],
    workouts: [{ id: 'w1', ...dayAgo(0, 7), activityName: 'Strength Training', emoji: '🏋️‍♀️', detailKind: 'strength', durationMinutes: 45, notes: '' }],
  });

  // Off by default: the estimate is used, and a photo is sent as food
  await page.click('[data-tab="macros"]');
  await page.setInputFiles('[data-photo]', iconPath);
  await page.waitForSelector('.photo-preview img');
  check('photos have no Meal/Oura switch to pick', (await page.locator('input[name="photoKind"]').count()) === 0);
  check('there’s no separate Paste button', (await page.locator('[data-action="paste-photo"]').count()) === 0);
  await page.click('[data-action="remove-photo"]');

  // Turn it on
  await page.click('[data-tab="settings"]');
  check('Oura is off by default in Settings', !(await page.isChecked('[data-oura-enabled]')));
  await page.click('[data-oura-enabled]');
  await page.waitForTimeout(300);
  check('Oura can be turned on any time', await page.isChecked('[data-oura-enabled]'));

  // The fake Claude first answers in words (no tool), then fills in the Oura form when reminded.
  const requests = await fakeAnthropic(page, (body, n) => ({
    json: n === 1
      ? { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'This looks like your Oura activity screen.' }] }
      : ouraReply(SCREENSHOT),
  }));
  await page.click('[data-tab="macros"]');

  // Pasting straight into the message box attaches the picture (text would paste as normal).
  await page.evaluate(async (url) => {
    const blob = await (await fetch(url)).blob();
    const data = new DataTransfer();
    data.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
    document.querySelector('textarea[name="message"]').dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, 'icons/icon-180.png');
  await page.waitForSelector('.photo-preview img');
  check('pasting a screenshot into the message box attaches it', await page.isVisible('.photo-preview img'));
  await page.click('.send-button');
  await page.waitForSelector('.oura-card');

  const req = requests[0].body;
  check('the request offers the Oura tool', req.tools.some((t) => t.name === 'record_oura_activity' && t.strict === true));
  check('the message lets Claude decide food or Oura and gives today’s date',
    req.messages[0].content.some((b) => b.type === 'text' && b.text.startsWith('This photo is either food') && b.text.includes('Today is')));
  check('if Claude answers in words, it’s reminded once and the card still appears (no error)',
    requests.length === 2 && (await page.locator('.bubble.error').count()) === 0);
  check('the card shows total burn, active calories, steps and activity time',
    (await page.inputValue('.oura-card input[name="totalBurn"]')) === '2150' &&
    (await page.inputValue('.oura-card input[name="activeCalories"]')) === '520' &&
    (await page.inputValue('.oura-card input[name="steps"]')) === '10234' &&
    (await page.inputValue('.oura-card input[name="activityMinutes"]')) === '83');
  if (screenshots) await page.screenshot({ path: `${screenshots}/oura-card.png` });
  const boxes = page.locator('.oura-card input[name="pickWorkout"]');
  check('a workout already in your log starts unticked; a new one starts ticked',
    !(await boxes.nth(0).isChecked()) && (await boxes.nth(1).isChecked()));
  check('Oura’s workout names are matched to your workout types', (await text(page, '.oura-workout >> nth=0')).startsWith('Strength Training'));

  // Fix a number, then save
  await page.fill('.oura-card input[name="totalBurn"]', '2200');
  await page.click('[data-save-oura]');
  await page.waitForSelector('.oura-card .logged-note');
  check('saving confirms and says the Dashboard was updated', (await text(page, '.oura-card .logged-note')).includes('Dashboard updated'));

  await page.click('[data-tab="today"]');
  await page.waitForSelector('.workout-row');
  await page.waitForTimeout(300);
  const rows = await page.locator('.workout-row .row-title').allTextContents();
  check('the ticked Oura workout was added to the log (and not the duplicate)',
    rows.filter((r) => r === 'Strength Training').length === 1 && rows.includes('Walking'), rows.join(', '));

  // Dashboard uses Oura's burn: 2,200 − 900 eaten = 1,300 left
  await page.click('[data-tab="dashboard"]');
  await page.waitForSelector('.balance-card');
  const parts = await text(page, '.balance-parts');
  check('the Dashboard uses Oura’s total burn for today', parts.includes('Burned (Oura)') && parts.includes('2,200'), parts);
  check('kcal left uses Oura’s burn', (await text(page, '.balance-main')).startsWith('1,300'));
  await page.click('.balance-today');
  await page.waitForSelector('.reasons');
  check('the day’s reasons say Oura measured the burn', (await page.locator('.reasons li').allTextContents()).some((r) => r.startsWith('Your Oura ring measured 2,200 kcal')));
  check('the breakdown shows activity time', (await text(page, '.ledger >> nth=0')).includes('Activity time'));
  check('the breakdown lists Oura’s total and marks workouts as included',
    (await text(page, '.ledger >> nth=0')).includes('Total burn, measured by Oura') && (await text(page, '.ledger >> nth=0')).includes('included'));
  await page.click('.sheet-right button'); await page.waitForTimeout(300);
  if (screenshots) await page.screenshot({ path: `${screenshots}/oura-dashboard.png`, fullPage: true });

  // Turn Oura off → back to the estimate (Oura numbers kept)
  await page.click('[data-tab="settings"]');
  await page.click('[data-oura-enabled]');
  await page.waitForTimeout(300);
  await page.click('[data-tab="dashboard"]');
  await page.waitForSelector('.balance-card');
  check('turning Oura off goes back to the estimate', (await text(page, '.balance-parts')).includes('Burned (est.)'));
  check('Oura: no page errors', page.errors.length === 0, page.errors.join('; '));
  await context.close();
}
