// today.js — welcome screen, Today tab (quote, streaks, week strip, logging, supplements)
// and the press-and-hold editors.

import { check, dayAgo, hold, newPhone, onboard, putRecords, scrollsSideways, text } from '../helpers.js';

export async function todaySuite(browser, { appUrl, screenshots }) {
  const { context, page } = await newPhone(browser);
  await page.goto(appUrl);

  // Welcome screen
  await page.waitForSelector('[data-stats]');
  check('welcome screen hides the tab bar', !(await page.isVisible('.tab-bar')));
  await page.click('text=Calculate my targets');
  check('empty welcome form explains what’s missing', (await page.textContent('.form-problems')).includes('Choose female or male'));
  await page.click('.segmented >> text=Female');
  await page.fill('#stat-age', '30'); await page.fill('#stat-feet', '5'); await page.fill('#stat-inches', '6');
  await page.fill('#stat-weight', '150'); await page.fill('#stat-goal', '140');
  await page.click('.radio-row >> text=3–4 workouts a week');
  await page.click('text=Calculate my targets');
  await page.waitForSelector('.targets-hero');
  check('example person gets 1,660 kcal · 128P · 183C · 46F', (await text(page, '.targets-hero')).includes('1,660') && (await text(page, '.hero-macros')) === '128g protein 183g carbs 46g fat', await text(page, '.targets-hero'));
  await page.click('[data-start]');
  await page.waitForSelector('.week-card');

  // Quote of the day
  const firstQuote = await page.textContent('.quote-text');
  await page.click('.quote');
  check('quote of the day shows, with a credit, and tapping shows another', firstQuote !== (await page.textContent('.quote-text')) && (await page.textContent('.quote-credit')).startsWith('— '));
  check('header has no emoji', !/\p{Extended_Pictographic}/u.test(await page.textContent('.page-header')));

  // One-tap logging with details
  await page.click('.quick-chip >> text=Running');
  await page.waitForSelector('.confirmation');
  check('tapping a chip logs it and cheers', (await page.textContent('.confirmation h2')).includes('Running logged'));
  await page.click('[data-toggle-details]');
  await page.click('.chip >> text=30');
  await page.fill('[data-field="distanceMiles"]', '3');
  check('pace is calculated from duration and distance', (await page.textContent('[data-pace]')) === '10:00 /mi');
  await page.click('.sheet-right button');
  await page.waitForTimeout(300);
  check('workout shows its summary', (await page.textContent('.workout-row .row-subtitle')) === '30 min · 3 mi · 10:00 /mi');

  // Undo
  await page.locator('.quick-chip >> text=Pilates').scrollIntoViewIfNeeded();
  await page.click('.quick-chip >> text=Pilates');
  await page.waitForSelector('[data-undo]');
  await page.click('[data-undo]');
  await page.click('.sheet-left button');
  await page.waitForTimeout(300);
  check('Undo removes the workout', (await page.locator('.workout-row').count()) === 1);

  // Week strip names and streaks (add a workout yesterday)
  const y = dayAgo(1, 7);
  await putRecords(page, { workouts: [{ id: 'y1', ...y, activityName: 'Hot Yoga', emoji: '🔥', detailKind: 'hotYoga', durationMinutes: 60, notes: '' }] });
  await page.click('[data-tab="calendar"]'); await page.click('[data-tab="today"]'); await page.waitForTimeout(300);
  check('week strip lists today’s workout names', (await page.locator('.week-day.today .week-names span').allTextContents()).includes('Running'));
  const pills = await page.locator('.streak-row .streak-pill').allTextContents();
  check('workout streak label shows', pills.some((p) => p.trim() === '2-day workout streak'), pills.join(' | '));

  // Supplements: check all / uncheck all
  await page.click('[data-action="check-all"]'); await page.waitForTimeout(300);
  check('Check all checks every supplement', (await page.locator('.supp-row.taken').count()) === 8);
  check('Uncheck all appears once something is checked', await page.isVisible('[data-action="uncheck-all"]'));
  await page.click('[data-action="uncheck-all"]'); await page.waitForTimeout(300);
  check('Uncheck all unchecks everything', (await page.locator('.supp-row.taken').count()) === 0);

  // Hold to edit supplements (must not check it)
  await hold(page, '.supp-row >> text=Iron');
  check('holding a supplement opens the editor without checking it', (await page.textContent('.sheet-title')) === 'Supplements' && (await page.locator('.supp-row.taken').count()) === 0);
  await page.fill('[data-add] input', 'Magnesium'); await page.click('[data-add] button'); await page.waitForTimeout(300);
  await page.locator('.edit-row:has([value="Biotin"]) [data-remove]').click(); await page.click('[data-confirm-remove]'); await page.waitForTimeout(300);
  check('removed supplements can be restored', await page.isVisible('[data-restore]'));
  await page.click('.sheet-right button'); await page.waitForTimeout(300);
  const supps = await page.locator('.supp-row .row-title').allTextContents();
  check('supplement added and removed', supps.includes('Magnesium') && !supps.includes('Biotin'), supps.join(', '));

  // Hold to edit workouts
  await hold(page, '.quick-chip >> text=Yoga');
  check('holding a workout chip opens the workouts editor', (await page.textContent('.sheet-title')) === 'Workouts');
  await page.fill('[data-add] input', 'Barre'); await page.click('[data-add] button'); await page.waitForTimeout(300);
  await page.locator('.edit-row:has([value="Barre"]) select').selectOption('strength');
  await page.click('.sheet-right button'); await page.waitForTimeout(300);
  await page.locator('.quick-chip >> text=Barre').scrollIntoViewIfNeeded();
  await page.click('.quick-chip >> text=Barre');
  await page.waitForSelector('.confirmation'); await page.click('[data-toggle-details]');
  check('a new workout type shows the details it tracks', (await page.locator('text=Body focus').count()) > 0);
  await page.click('.sheet-right button'); await page.waitForTimeout(300);

  check('Today never scrolls sideways', !(await scrollsSideways(page)));
  if (screenshots) await page.screenshot({ path: `${screenshots}/today.png`, fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  if (screenshots) await page.screenshot({ path: `${screenshots}/today-dark.png`, fullPage: true });
  check('Today: no page errors', page.errors.length === 0, page.errors.join('; '));
  await context.close();
}
