// main.js
// Starts the app: opens the database, adds first-launch defaults, draws the tab bar,
// and redraws the current tab whenever data changes.

import { isSetupDone, seedIfNeeded } from './data.js';
import { openDB, requestPersistentStorage } from './db.js';
import { escapeHTML } from './logic/text.js';
import { icons } from './ui/icons.js';
import { installLongPress } from './ui/longpress.js';
import './views/manage.js'; // press-and-hold editing of supplements & workouts
import { renderCalendar } from './views/calendar.js';
import { comingSoon } from './views/comingSoon.js';
import { runOnboarding } from './views/onboarding.js';
import { renderSettings } from './views/settings.js';
import { renderToday } from './views/today.js';

const TABS = [
  { id: 'today', label: 'Today', icon: icons.sun, render: renderToday },
  { id: 'calendar', label: 'Calendar', icon: icons.calendar, render: renderCalendar },
  { id: 'macros', label: 'Macros', icon: icons.chat,
    render: comingSoon('Macros', '🥗', 'Describe a meal in plain words and get its calories and macros. (Milestone 3)') },
  { id: 'dashboard', label: 'Dashboard', icon: icons.chart,
    render: comingSoon('Dashboard', '📊', 'Daily macro progress and your 7-day streaks. (Milestone 4)') },
  { id: 'settings', label: 'Settings', icon: icons.gear, render: renderSettings },
];

const view = document.getElementById('view');
const tabBar = document.getElementById('tab-bar');
let currentTab = TABS[0];
let renderCount = 0;

/** Draws the current tab. If a newer draw starts meanwhile, the older one is dropped. */
async function refresh() {
  const myCount = ++renderCount;
  const isCurrent = () => myCount === renderCount;
  try {
    await currentTab.render(view, { isCurrent, refresh });
  } catch (error) {
    console.error(error);
    if (isCurrent()) showError(error);
  }
}

function showTab(tabId, { scrollToTop = true } = {}) {
  currentTab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  tabBar.querySelectorAll('button').forEach((b) => {
    const active = b.dataset.tab === currentTab.id;
    b.classList.toggle('active', active);
    b.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (scrollToTop) window.scrollTo(0, 0);
  refresh();
}

function showError(error) {
  view.innerHTML = `
    <section class="card error-card">
      <h2>Something went wrong</h2>
      <p>${escapeHTML(error?.message ?? error)}</p>
      <button class="soft-button" onclick="location.reload()">Reload</button>
    </section>`;
}

async function start() {
  installLongPress();
  tabBar.innerHTML = TABS.map((t) => `
    <button data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`).join('');
  tabBar.onclick = (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    history.replaceState(null, '', `#${button.dataset.tab}`);
    showTab(button.dataset.tab);
  };

  try {
    await openDB();
    await seedIfNeeded();
    requestPersistentStorage();
  } catch (error) {
    showError(error);
    return;
  }

  // First launch: the welcome screen asks for your stats before showing the tabs.
  if (!(await isSetupDone())) {
    await new Promise((resolve) => runOnboarding(view, resolve));
  }

  // Redraw when data changes, and when you come back to the app (e.g. the next morning).
  window.addEventListener('momentum:changed', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });

  showTab(location.hash.slice(1) || 'today');
}

// Offline support: lets the app open without internet once it has loaded before.
try {
  navigator.serviceWorker?.register('./sw.js').catch(() => { /* not available here — fine */ });
} catch { /* some previews block service workers — the app still works */ }

start();
