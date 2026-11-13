// db.js
// Momentum's on-phone database, using the browser's built-in IndexedDB.
//
// ⚠️ Data safety rules (see CLAUDE.md):
//  - Never change DB_NAME (a new name = an empty database).
//  - Never edit or remove an existing migration. To change the data, ADD a new
//    function to the end of MIGRATIONS. The version number goes up automatically,
//    and phones that already have data run only the new steps.

const DB_NAME = 'momentum';

/** Numbered migrations. Index 0 = version 1, index 1 = version 2, … */
const MIGRATIONS = [
  // Version 1 — Milestone 1: workouts, activity types, supplements, supplement logs.
  (db) => {
    db.createObjectStore('activityTypes', { keyPath: 'id' });

    const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
    workouts.createIndex('dayKey', 'dayKey');

    db.createObjectStore('supplements', { keyPath: 'id' });

    // id is "<dayKey>:<supplementId>", so one supplement can only be logged once per day.
    const supplementLogs = db.createObjectStore('supplementLogs', { keyPath: 'id' });
    supplementLogs.createIndex('dayKey', 'dayKey');

    // Small key/value settings, e.g. "seeded.v1".
    db.createObjectStore('meta', { keyPath: 'key' });
  },

  // Version 2 — Milestone 3: logged meals, and saved meals for one-tap re-logging.
  // Only adds new stores; everything from version 1 is left untouched.
  (db) => {
    const meals = db.createObjectStore('meals', { keyPath: 'id' });
    meals.createIndex('dayKey', 'dayKey');

    db.createObjectStore('savedMeals', { keyPath: 'id' });
  },

  // Version 3 — Weight: weigh-ins (about every 2 weeks). Only adds a new store.
  (db) => {
    const weights = db.createObjectStore('weights', { keyPath: 'id' });
    weights.createIndex('dayKey', 'dayKey');
  },

  // Version 4 — Oura: one record per day of numbers read from an Oura screenshot
  // (id = the day key as text, so a newer screenshot for the same day replaces the older one).
  (db) => {
    const ouraDays = db.createObjectStore('ouraDays', { keyPath: 'id' });
    ouraDays.createIndex('dayKey', 'dayKey');
  },
];

export const DB_VERSION = MIGRATIONS.length;

let dbPromise = null;

/** Opens the database once, running any migrations the phone hasn't had yet. */
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      // Run every step from the phone's old version up to the newest one, in order.
      for (let version = event.oldVersion; version < DB_VERSION; version++) {
        MIGRATIONS[version](db, tx);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Momentum tabs and reopen the app.'));
  });
  return dbPromise;
}

// ---- Small promise helpers ----------------------------------------------------

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function read(storeName, work) {
  const db = await openDB();
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  return requestToPromise(work(store));
}

async function write(storeName, work) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    work(tx.objectStore(storeName));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  notifyChanged();
}

/** Tells every screen that data changed so it can redraw. */
export function notifyChanged() {
  window.dispatchEvent(new CustomEvent('momentum:changed'));
}

// ---- Public API ---------------------------------------------------------------

export const db = {
  getAll: (store) => read(store, (s) => s.getAll()),
  get: (store, id) => read(store, (s) => s.get(id)),
  count: (store) => read(store, (s) => s.count()),

  /** Everything logged on one day. */
  getByDay: (store, dayKey) => read(store, (s) => s.index('dayKey').getAll(dayKey)),

  /** Everything logged between two day keys (inclusive). */
  getByDayRange: (store, first, last) =>
    read(store, (s) => s.index('dayKey').getAll(IDBKeyRange.bound(first, last))),

  put: (store, value) => write(store, (s) => s.put(value)),
  putMany: (store, values) => write(store, (s) => values.forEach((v) => s.put(v))),
  delete: (store, id) => write(store, (s) => s.delete(id)),
  deleteMany: (store, ids) => write(store, (s) => ids.forEach((id) => s.delete(id))),

  async getMeta(key) {
    return (await read('meta', (s) => s.get(key)))?.value;
  },
  setMeta: (key, value) => write('meta', (s) => s.put({ key, value })),
};

/** Asks Safari to keep our data even when the phone is low on space. */
export async function requestPersistentStorage() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
