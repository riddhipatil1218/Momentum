// dashboard.js — calorie balance (math, streak, the "why" breakdown and past days),
// target progress, and the Weight card (logging, pace, goal date, history).

import { check, dayAgo, newPhone, onboard, putRecords, scrollsSideways, text } from '../helpers.js';

const meal = (id, daysAgo, hour, name, calories) => ({ id, ...dayAgo(daysAgo, hour), name, calories, proteinG: 30, carbsG: 40, fatG: 15, assumptions: [] });

export async function dashboardSuite(browser, { appUrl, screenshots }) {
  const { context, page } = await newPhone(browser);
  await page.goto(appUrl);
  await onboard(page); // example person: everyday burn 1,701 kcal

  await putRecords(page, {
    meals: [
      meal('t1', 0, 8, 'Breakfast', 400), meal('t2', 0, 12, 'Lunch', 600),
      meal('y1', 1, 8, 'Oatmeal', 300), meal('y2', 1, 19, 'Pasta', 900),         // + yoga → 637 deficit
      meal('a1', 2, 12, 'Burrito', 1100), meal('a2', 2, 20, 'Ice cream', 800),   // 199 surplus
    ],
    workouts: [
      { id: 'run', ...dayAgo(0, 7), activityName: 'Running', emoji: '🏃‍♀️', detailKind: 'running', durationMinutes: 30, distanceMiles: 3, notes: '' },
      { id: 'yoga', ...dayAgo(1, 7), activityName: 'Yoga', emoji: '🧘‍♀️', detailKind: 'general', durationMinutes: 60, notes: '' },
    ],
  });
  await page.click('[data-tab="dashboard"]');
  await page.waitForSelector('.balance-card');

  check('today: burn = 1,701 everyday + 299 run = 2,000', (await text(page, '.balance-parts')).includes('2,000'));
  check('today: 1,000 kcal left in a deficit', (await text(page, '.balance-main')).startsWith('1,000'));
  check('deficit streak is 1 day (yesterday yes, the day before no)', (await text(page, '.balance-card .streak-pill')) === '1-day deficit streak');

  // Breakdown for yesterday
  await page.locator('.balance-col').nth(5).click();
  await page.waitForSelector('.balance-result');
  check('yesterday: 637 kcal deficit', (await text(page, '.balance-result')) === '637 kcal deficit');
  const reasons = await page.locator('.reasons li').allTextContents();
  check('reasons explain eaten vs burned, the workout, the biggest meal and the target',
    reasons[0] === 'You ate 1,200 kcal, 637 less than the 1,837 you burned.' && reasons[1].includes('136 kcal') && reasons[2].includes('Pasta') && reasons[3].includes('under your 1,660'),
    reasons.join(' / '));
  await page.click('[data-step="-1"]'); await page.waitForTimeout(300);
  check('arrows step to the day before (199 kcal surplus)', (await text(page, '.balance-result')) === '199 kcal surplus');
  check('the next-day arrow is disabled on today', await (async () => {
    await page.click('.sheet-right button'); await page.waitForTimeout(300);
    await page.click('.balance-today'); await page.waitForSelector('.day-nav');
    return page.isDisabled('[data-step="1"]');
  })());
  await page.click('.sheet-right button'); await page.waitForTimeout(300);

  // Target progress
  check('today’s calorie bar shows 1,000 of 1,660', (await text(page, '.progress-row >> nth=0')).includes('1,000 / 1,660'));

  // Weight
  const logWeight = async (pounds, daysAgo) => {
    await page.click('.weight-card [data-action="log-weight"]');
    await page.waitForSelector('input[name="pounds"]');
    await page.fill('input[name="pounds"]', String(pounds));
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    const pad = (n) => String(n).padStart(2, '0');
    await page.fill('input[name="when"]', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:30`);
    await page.click('.sheet button[type="submit"]');
    await page.waitForTimeout(400);
  };
  check('Weight card starts empty', await page.isVisible('.weight-card .empty'));
  await logWeight(151, 28);
  check('one weigh-in: “Not enough data yet”', (await text(page, '.weight-pace')).startsWith('Not enough data yet'));
  await logWeight(150, 14);
  await logWeight(149, 0);
  check('pace and goal date appear after weigh-ins 2 weeks apart', (await text(page, '.weight-pace')).startsWith('At 0.5 lb/week'));
  check('chart shows 3 points, the goal line and the projection',
    (await page.locator('.chart-dot').count()) === 3 && (await page.locator('.chart-goal').count()) === 1 && (await page.locator('.chart-projection').count()) === 1);
  check('next weigh-in is 2 weeks after the last', (await text(page, '.weight-bottom span')).startsWith('Next weigh-in'));
  await page.click('[data-action="weight-history"]'); await page.waitForSelector('.sheet [data-delete]');
  await page.locator('.sheet [data-delete]').first().click(); await page.click('[data-confirm-delete]'); await page.waitForTimeout(300);
  check('a weigh-in can be deleted (with Keep/Delete)', (await page.locator('.sheet [data-delete]').count()) === 2);
  await page.click('.sheet-right button'); await page.waitForTimeout(300);
  await logWeight(149, 0);
  await page.click('[data-tab="settings"]');
  check('the newest weigh-in updates the weight in your stats', (await text(page, '[data-open="stats"] .row-subtitle')).endsWith('149 lb'));

  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  check('Dashboard never scrolls sideways', !(await scrollsSideways(page)));
  if (screenshots) await page.screenshot({ path: `${screenshots}/dashboard.png`, fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  if (screenshots) await page.screenshot({ path: `${screenshots}/dashboard-dark.png`, fullPage: true });
  check('Dashboard: no page errors', page.errors.length === 0, page.errors.join('; '));
  await context.close();
}
