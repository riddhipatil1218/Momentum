// calendar.js — month view, summary, month picker, and the day sheet.

import { check, dayAgo, loadPlaywright, newPhone, onboard, putRecords, scrollsSideways, text } from '../helpers.js';

export async function calendarSuite(browser, { appUrl, screenshots }) {
  for (const device of ['iPhone SE', 'iPhone 13', 'iPhone 15 Pro Max']) {
    const { devices } = loadPlaywright();
    const context = await browser.newContext(devices[device]);
    const page = await context.newPage();
    await page.goto(`${appUrl}#calendar`);
    await page.click('[data-skip]');
    await page.waitForSelector('.cal-grid');
    const fits = await page.evaluate(() => {
      const card = document.querySelector('.month-card').getBoundingClientRect();
      return [...document.querySelectorAll('.cal-cell')].every((c) => c.getBoundingClientRect().right <= card.right);
    });
    check(`calendar fits inside its card on ${device}`, fits);
    await context.close();
  }

  const { context, page } = await newPhone(browser);
  await page.goto(appUrl);
  await onboard(page);
  const today = dayAgo(0, 9);
  await putRecords(page, {
    workouts: [{ id: 'w1', ...today, activityName: 'Running', emoji: '🏃‍♀️', detailKind: 'running', durationMinutes: 30, notes: '' }],
    supplementLogs: [{ id: `${today.dayKey}:x`, supplementId: 'x', supplementName: 'Iron', dayKey: today.dayKey, loggedAt: today.date }],
  });
  await page.click('[data-tab="calendar"]');
  await page.waitForSelector('.cal-grid');
  check('today is tinted as an active day with workout and supplement dots',
    (await page.locator('.cal-cell.today.has-workout .dot.workout').count()) === 1 && (await page.locator('.cal-cell.today .dot.supplement').count()) === 1);
  check('month summary counts the workout', (await page.locator('.stat-tile strong').first().textContent()) === '1');
  check('workouts-by-type lists Running', (await text(page, '.breakdown-name')).includes('Running'));
  await page.click('[data-action="toggle-supplements"]'); await page.waitForTimeout(300);
  check('supplement dots can be hidden', (await page.locator('.cal-cell.today .dot.supplement').count()) === 0);
  await page.click('[data-action="toggle-supplements"]'); await page.waitForTimeout(300);

  await page.click('[data-action="pick-month"]'); await page.waitForSelector('.month-picker');
  await page.click('.month-option >> nth=0'); await page.waitForTimeout(300);
  check('month picker jumps to January', (await text(page, '.month-title')).startsWith('January'));
  await page.click('[data-action="today"]'); await page.waitForTimeout(300);

  // Day sheet: log onto the day and see it
  await page.click('.cal-cell.today');
  await page.waitForSelector('[data-action="log-for-day"]');
  await page.click('[data-action="log-for-day"]');
  await page.click('.activity-tile >> text=Pilates');
  await page.click('.sheet-backdrop:last-of-type .sheet-right button');
  await page.waitForTimeout(400);
  check('workouts can be logged from a calendar day', (await page.locator('.sheet .workout-row').count()) === 2);

  // Edit + delete with in-page confirmation
  await page.locator('.sheet .workout-row').last().click();
  await page.waitForSelector('[data-delete]');
  await page.click('[data-delete]'); await page.click('[data-confirm-delete]'); await page.waitForTimeout(400);
  check('deleting asks Keep/Delete in the sheet and removes the workout', (await page.locator('.sheet .workout-row').count()) === 1);
  await page.click('.sheet-right button'); await page.waitForTimeout(300);

  check('Calendar never scrolls sideways', !(await scrollsSideways(page)));
  if (screenshots) await page.screenshot({ path: `${screenshots}/calendar.png`, fullPage: true });
  check('Calendar: no page errors', page.errors.length === 0, page.errors.join('; '));
  await context.close();
}
