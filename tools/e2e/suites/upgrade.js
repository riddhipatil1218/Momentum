// upgrade.js — the database upgrades (numbered migrations) keep existing data.
// Builds an old version-1 and version-2 database by hand, opens the app, and checks
// that the old data is still there and the new tables were added.

import { check, newPhone } from '../helpers.js';

const V1_STORES = [['activityTypes'], ['workouts', true], ['supplements'], ['supplementLogs', true], ['meta', false, 'key']];
const V2_STORES = [...V1_STORES, ['meals', true], ['savedMeals']];

async function makeOldDatabase(page, version, stores) {
  await page.evaluate(({ version, stores }) => new Promise((resolve) => {
    const req = indexedDB.open('momentum', version);
    req.onupgradeneeded = () => {
      for (const [name, byDay, keyPath = 'id'] of stores) {
        const store = req.result.createObjectStore(name, { keyPath });
        if (byDay) store.createIndex('dayKey', 'dayKey');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['workouts', 'meta'], 'readwrite');
      const d = new Date();
      const dayKey = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      tx.objectStore('workouts').put({ id: 'old-workout', date: d.toISOString(), dayKey, activityName: 'Pilates', emoji: '🤸‍♀️', detailKind: 'general', notes: '' });
      tx.objectStore('meta').put({ key: 'setup.done', value: true });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), { version, stores });
}

export async function upgradeSuite(browser, { appUrl }) {
  for (const [version, stores] of [[1, V1_STORES], [2, V2_STORES]]) {
    const { context, page } = await newPhone(browser);
    await page.goto(`${appUrl}no-app-here`); // same site, app not running
    await makeOldDatabase(page, version, stores);
    await page.goto(appUrl);
    await page.waitForSelector('.workout-row');
    const info = await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('momentum');
      r.onsuccess = () => { res({ version: r.result.version, stores: [...r.result.objectStoreNames] }); r.result.close(); };
    }));
    check(`version ${version} database upgrades to the newest version`, info.version >= 3, info.version);
    check(`version ${version}: new tables added (meals, savedMeals, weights)`, ['meals', 'savedMeals', 'weights'].every((s) => info.stores.includes(s)), info.stores.join(','));
    check(`version ${version}: the old workout is still there`, (await page.textContent('.workout-row .row-title')) === 'Pilates');
    check(`version ${version}: no page errors`, page.errors.length === 0, page.errors.join('; '));
    await context.close();
  }
}
