# Click-through tests (end-to-end)

These tests open the real Momentum app in a hidden browser that pretends to be an iPhone 13,
tap through every screen like a person would, and check what appears: logging workouts and
meals, the calendar, the Dashboard's calorie math, weigh-ins, backups, database upgrades,
and the claude.ai prototype build.

They complement the quick tests in `tests/` (which check the maths and run automatically on
GitHub before every publish). These take about a minute and need a browser, so you run them
yourself when you want to check the whole app.

**Safe by design:** they use a made-up example person (never your stats) and a **fake
Anthropic server** (never a real API key, never any charges).

## One-time setup

You need Node.js (nodejs.org, "LTS"). Then, in Terminal, from the Momentum folder:

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

(`--no-save` keeps Playwright out of the app itself; the app still uses no libraries.)

## Run

```bash
npm run e2e
```

Each check prints ✓ or ✗, then a summary like `100 passed, 0 failed.`

Other options:

- `npm run e2e -- macros dashboard` runs only those suites
  (upgrade, today, calendar, macros, dashboard, backup, prototype)
- `npm run e2e -- --screenshots` also saves phone screenshots to `tools/e2e/screenshots/`

## Files

- `run.js` starts a small web server for the `app` folder, runs the suites, prints the summary.
- `helpers.js` holds shared tools: the example person, filling the welcome screen, writing
  test data, press-and-hold, and the fake Anthropic server.
- `suites/` has one file per area of the app.
