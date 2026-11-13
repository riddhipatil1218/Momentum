# Momentum — Spec

A personal app (one user, one iPhone) for logging workouts, supplements, meals/macros
and weight. It's a **web app**: you add it to the iPhone Home Screen and it runs full
screen like a regular app. All data is stored on the phone.

Status: **All planned milestones live. Oura screenshots and multi-muscle-group strength workouts in the prototype, awaiting review.** Sections marked
*(planned)* are proposals for later milestones and will be confirmed before they're built.

---

## 1. Decisions log

Newest at the bottom. Superseded decisions are kept (struck through) so the history is clear.

| # | Decision | Why |
|---|----------|-----|
| D1 | App, folder and project are named **Momentum**. | One name everywhere. |
| ~~D2~~ | ~~SwiftUI, iOS 17+.~~ Superseded by D19. | |
| ~~D3~~ | ~~SwiftData storage.~~ Superseded by D20. | |
| D4 | Every data-model change is a **numbered migration**. Old steps are never edited or removed. | Future changes upgrade your data instead of erasing it. |
| D5 | If the database can't open, the app shows an error and stops. It never deletes and recreates the database. | Losing data silently is worse than an error we can fix. |
| D6 | Days are stored as a number **day key** `YYYYMMDD` (e.g. `20261110`) next to the exact timestamp. | A workout logged at 11:50 pm stays on that day, even if you travel. Easy to look up and test. |
| D7 | Workout logs keep a **copy** of the activity's name, emoji and detail kind at logging time. | Renaming or archiving an activity never changes old history. |
| D8 | Activity types and supplements are **archived, never deleted**. | History stays intact. |
| D9 | Units: pounds, miles, minutes, °F. | US units. |
| D10 | Tapping an activity logs it immediately; details are an optional "Add details" section on the confirmation screen. | 2 taps to log. |
| D11 | Calendar: burgundy dot (see D44) = at least one workout; dusty-rose dot (see D44) = at least one supplement checked. The green dot can be hidden with a toggle (remembered on the phone). | As requested; "any supplement" is easy to change to "all". |
| D12 | The calendar week starts on the day your phone's region uses (Sunday in the US). | Respects phone settings. |
| ~~D13~~ | ~~SwiftUI `.sensoryFeedback` haptics.~~ Superseded by D23. | |
| ~~D14~~ | ~~Warm theme~~ (superseded by D35): cream background, white rounded cards (22 px corners), coral accent, soft blue and sage dots; dark versions of every color, following the phone's setting. | "Warm and inviting" + light/dark. |
| ~~D15~~ | ~~Swift Testing.~~ Superseded by D24. | |
| ~~D16~~ | ~~Stats pre-filled in code.~~ Superseded by D30. | |
| D17 | Calorie target = Mifflin–St Jeor BMR × 1.375 (3–4 workouts/week) × 0.85 (15% deficit), rounded to the nearest 10. Protein = 0.85 g per lb of current weight; fat = 25% of calories; carbs = the rest *(Milestone 2)*. | Matches the owner's agreed starting targets (numbers kept off the public repo, see D30). |
| D18 | The Anthropic API key is entered in Settings and stored **only on the phone** (in the app's own storage). It's never in code, files or git *(Milestone 3)*. | Security. A web app can't use the iPhone Keychain, so this is the safest option available. |
| D19 | **Platform: web app (Progressive Web App)**, added to the Home Screen. Plain HTML, CSS and JavaScript (ES modules), **no libraries and no build step**. | The owner's Mac can't run the Xcode version their iPhone needs. A web app needs no Mac tools; no libraries = nothing to install or break. |
| D20 | Storage: the browser's built-in **IndexedDB** database named `momentum`, opened once with numbered migrations in `db.js`. The app asks Safari for persistent storage. | Built in, works offline, survives app updates. The name must never change. |
| D21 | **Apple Health sync is dropped.** Weight and workouts stay in Momentum only. | Web apps can't access Apple Health. |
| D22 | Data screens redraw automatically after any save (a `momentum:changed` event). Forms save on every keystroke and aren't redrawn while you type. | Bars and lists are always current; typing never gets interrupted. |
| D23 | Haptics: a hidden switch-toggle trick that gives a real haptic tick in iOS 18+ Safari; on other browsers it silently does nothing. | iPhone Safari doesn't let websites vibrate directly. |
| D24 | Tests use Node's built-in test runner (`npm test`) on the pure logic in `app/js/logic/`, run in Los Angeles time. | No test libraries needed; results don't depend on your computer's time zone. |
| D25 | Offline support uses a service worker with a "network first" strategy: online = newest version, offline = saved copy. | App updates show up right away, and it still opens without signal. |
| D26 | Activities use emoji icons (🏃‍♀️ 🪜 🏋️‍♀️ 🔥 🧘‍♀️ 🤸‍♀️ 💪). | Warm, and you can choose any emoji for custom activities later. |
| D27 | Deleting a workout is done from its edit sheet, with a confirmation. (No long-press menu.) | Long-press on iPhone web pages triggers text selection, not menus. |
| D28 | The earlier SwiftUI code is kept, unused, in `ios-native/`. | In case you get an Apple Silicon Mac later. |
| D29 | Backups: an export/import button is planned *(Milestone 6, possibly sooner)*. | Deleting the Home Screen icon deletes the app's data. |
| D30 | **No personal stats or targets anywhere in the repo** (code, tests, docs). A first-launch setup screen asks for sex, age, height, weight, activity and goal weight; they're stored only on the phone. Tests use made-up example people. *(Milestone 2)* | The repo is public (D31). |
| D31 | Hosting: **GitHub Pages** from a public repo. A GitHub Actions workflow (`.github/workflows/publish.yml`) runs `npm test` on every push and publishes `app/` only if all tests pass. | Free and reliable; broken versions never reach the phone. |
| D32 | Renamed the app from HealthNut to **Momentum** everywhere (app name, repo `momentum`, folder, database `momentum`). | Owner's choice. Done before first install, so changing the database name lost no data. From now on the database name is fixed (D20). |
| D33 | **Prototype first, then publish.** Changes are tried in a private claude.ai prototype (the same app code plus a bar with "Add sample data" / "Clear", built by `tools/prototype/build.sh`). Only after the owner approves are they pushed to GitHub and the phone. | Lets the owner try changes safely without touching the real app or its data. |
| D34 | Delete confirmations are built into the page (Keep / Delete) instead of the browser's pop-up `confirm()`. | Pop-ups are blocked in the prototype and look out of place in an app. |
| ~~D35~~ | ~~**Fresh theme**~~ (colors superseded by D39) (prototype v2): crisp off-white with a hint of green, emerald for progress/actions, **blue = workouts, orange = supplements** (strongly contrasting, colour-blind friendly), rounded iPhone font for headings, smaller type, lighter cards. New rising-line icon. | Owner asked for cleaner, less large, fresh and motivating, with contrasting dots. |
| D36 | Motivation on Today: an encouraging line, a "This week" strip with a goal bar (default **4 workouts/week**, editable in Milestone 2), and a streak chip from 2 days up. A streak still counts until midnight if you worked out yesterday. | Encouraging and motivating. |
| D37 | **One-tap logging:** activity chips on Today log immediately and open the confirmation (details / log another / undo). The activity grid remains for logging onto calendar days. | Fewer taps. |
| D38 | Supplements show as a compact two-column grid. | Cleaner and shorter. |
| ~~D39~~ | ~~**Plum palette**~~ (dots and gold superseded by D44) chosen by the owner: #1A1A1D, #3B1C32, #6A1E55, #A64D79. Dark mode uses it directly (ink background, deep-plum cards, mauve accents); light mode puts the plums on a soft blush. Dots: **mauve = workouts, gold = supplements** (gold added for contrast against plum). Icon recolored to match. | Owner's palette; dots still need to contrast (D35). |
| D40 | All emoji display in **black and white** (CSS grayscale), including in messages. | Owner's request; fits the palette. |
| D41 | Today header: greeting in title case ("Good Evening"), the date underneath, then the encouraging line. | Owner's request. |
| D42 | **Press and hold** a supplement, or a workout chip/tile, to open an editor: rename, dose note / icon / details to track, reorder (up/down), add, remove (archive, with Keep/Remove confirmation) and restore. The only hint is a faint "Hold to edit" label. | Edit options available but not in the way. |
| D43 | Supplements start unchecked every day; "Check all" stays available. Sample data never checks today's supplements. | Owner's request. |
| D44 | **No orange or gold anywhere.** Palette extended with **burgundy #7B2944** and a light **dusty rose** (mauve tint). Surfaces are neutral (warm off-white / charcoal in dark mode) so the home screen isn't one saturated color; plum = buttons and today, burgundy = workouts (dark dot, week ticks, goal bar), dusty rose = supplements (light dot, checks). Icon recolored. | Owner: remove orange, add a burgundy/mauve tone, less saturated home screen; dots contrast by light vs dark. |
| D45 | Appearance follows the phone's light/dark setting (confirmed by owner). Weekly workout goal defaults to **4** (confirmed), editable in Settings and on the welcome screen (1–14). | Owner's answers. |
| D46 | Stats, targets, weekly goal and API key are stored as entries in the existing `meta` store (`profile`, `targets`, `weeklyGoal`, `setup.done`, `anthropicApiKey`). **No database migration needed.** | Adds settings without touching saved data. |
| D47 | **Welcome screen** on first launch (or after the app's data is cleared): step 1 stats, step 2 suggested targets (editable) + weekly goal. "Skip for now" is always available; everything can be changed later in Settings. | Owner types stats on the phone; nothing personal in the code (D30). |
| D48 | Activity choices: little or no exercise ×1.2, 3–4 workouts a week ×1.375, 5–6 a week ×1.55, hard training every day ×1.725. No deficit if the goal weight is at or above current weight. Calories never go below 1,200 (women) / 1,500 (men). | Matches D17; the floor keeps suggestions safe. |
| D49 | Settings shows values only; editing happens in sheets (stats, targets, API key). Saving stats offers "Save and update targets" or "Save stats only". Targets show how many kcal the macros add up to. | Tabs redraw on every save, so typing belongs in sheets (D22). |
| D50 | The API key must start with `sk-ant-`; only its last 4 characters are ever shown. It will be excluded from export (Milestone 6). | Security (D18). |
| D51 | The prototype's Clear button also clears stats/settings and reloads, so the welcome screen can be tried again. | Easy re-testing. |
| D52 | **Database version 2** (owner approved): adds `meals` (indexed by dayKey) and `savedMeals` stores. Nothing in version 1 changes. Tested by upgrading a version-1 database that holds a workout. | Meals need their own tables. |
| D53 | Meal estimates call the Anthropic Messages API directly from the phone with plain `fetch` (no SDK, per D19), using the `anthropic-dangerous-direct-browser-access` header. The key goes only to api.anthropic.com in `x-api-key`; it is never logged. | No server needed; key stays with the owner. |
| D54 | Model **Claude Opus 5.5** (`claude-opus-5-5`) at effort `low`, with **structured outputs** (`output_config.format` JSON schema: name, calories, protein_g, carbs_g, fat_g, confidence, assumptions, is_food). About 1–2¢ per estimate. | Reliable JSON, fast and inexpensive for a short task. |
| D55 | Server-side refusal fallback on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); if an account rejects it, the request is retried once without it. | Keeps estimates working if a request is declined. |
| D56 | Replies adjust the current meal: the whole conversation is re-sent (append-only, assistant replies unchanged). Numbers edited on the card are passed along with the next reply. After logging, the next message starts a new meal. The chat itself lives in memory; logged meals are saved. | Natural back-and-forth without confusing separate meals. |
| D57 | Every logged meal is remembered in **saved meals** (one per name). "Log again" chips show favorites first, then most recent; tap logs it today (with Undo); hold to favorite or remove from the list (history unaffected). | One-tap re-logging. |
| D58 | Logged meals appear on the Macros tab (with today's totals vs targets) and in the calendar's day sheet, where they can be edited or deleted (Keep/Delete). | Meals are editable like everything else. |
| D59 | The prototype can't reach the internet, so it uses a small built-in **demo estimator** (labelled "Demo estimate"); the real app asks Claude. | Lets the owner try the chat flow in the prototype. |
| D60 | Milestone order changed (owner): **Backup & restore** built together with the **Dashboard**, before Weight. | Protects real data before daily logging starts. |
| D61 | Dashboard "on target" = within **10%** of the goal either way, same rule for calories and each macro; below = under, above = over. Bars cap at 100%. The 7-day view covers the last 7 days (rolling) and leaves days without meals blank. | Simple, predictable rule. |
| D62 | Status colors (no orange): on target = plum, under = dusty rose, over = red (`--danger`). | Clear states within the palette. |
| D63 | Backup = one JSON file of every table + stats/targets/settings, **never the API key**. Saved through the iPhone Share sheet (Save to Files, iCloud Drive, Mail) or downloaded. "Last backup" date shown in Settings. | Move to a new phone or recover after deleting the app. |
| D64 | Restore **adds/updates** every row from the backup and keeps anything already on the phone (no deletions). Files are checked first (app, version, damaged rows) and a summary is shown before restoring. The welcome screen offers "New phone? Restore from a backup". | Safe on a new phone and on the same phone. |
| D65 | Spreadsheet export: three CSV files (workouts, meals, supplement check-ins), oldest first; formula-like cells are prefixed with ' so spreadsheet apps don't run them. | Data you can open in Numbers/Excel/Sheets. |
| D66 | Calendar redesign: large rounded day cells, workout days tinted burgundy with dots, today in plum; "<Month> at a glance" tiles (workouts, active days, best streak, supplement days) in burgundy/plum/mauve/rose; workouts-by-type bars; tap the month name to jump to any month/year. Mauve added as a color token. | Bigger, easier to read, more color, more useful. |
| D67 | Today's "This week" strip shows each day's date and, under it, the names of that day's workouts in small text. Supplements offer both **Check all** and **Uncheck all**. | Owner's request. |
| D68 | **Calorie balance**: burned = BMR × 1.2 (stats; everyday life) + each logged workout's calories; balance = burned − eaten (positive = deficit). 1.2 instead of the activity level so workouts aren't counted twice. Workout kcal = (MET − 1) × kg × hours, MET by activity name (running by pace), 45 min assumed when no duration (shown). Days without meals are unknown. **Deficit streak** counts days in a row in a deficit from yesterday back (today isn't over). Shown on the Dashboard (today's kcal left, burn breakdown, 7-day bars, week total ≈ lb at 3,500 kcal/lb) and as a chip on Today. | Owner asked for deficit + streak using stats, food and workouts together. |
| D69 | Meal estimates now come back through a **strict tool** (`record_meal_estimate`, schema-guaranteed) instead of `output_config.format`. Each reply starts by answering the previous tool call (`tool_result`). | Anthropic's docs: web search always adds citations, which can't be combined with `output_config.format`. |
| D70 | **Online lookups**: Claude may use web search (basic `web_search_20250305`, max 3 per reply) for named restaurants, chains and branded/packaged products, preferring official nutrition pages; generic foods aren't searched. Sources are shown as links on the card, plus a "Based on" line. On by default; toggle in Settings. If an account rejects web search, the request is retried without it. Long searches that pause (`pause_turn`) are continued automatically. | Owner asked for restaurant and packaged-food data. ~1¢ per search. |
| D71 | **Photos**: attach a photo of a plate, menu item or nutrition label from the Macros message box; it's shrunk to ≤1,280 px JPEG on the phone and sent to Claude (labels are read exactly × servings eaten). | Most accurate for packaged foods. |
| D72 | Estimate effort raised from low to **medium** for accuracy (~2–3¢ per estimate before searches). | Owner asked for more accurate estimates. |
| D73 | Macros tab order: today's totals → **Today's meals** (grouped into Breakfast <11am, Lunch 11–3, Dinner 5–10pm, Snacks otherwise, each with a subtotal) → Log again → "Estimate a meal" chat. Meals can be moved to another time in their edit sheet (which also moves the section/day). | Owner asked for meals above Log again and more sections. |
| D74 | Streaks are shown the same way everywhere: one line on Today under the encouraging message with matching labels ("2-day workout streak", "1-day deficit streak"; each shown from 1 day), and the same label style on the Dashboard. | Owner asked for standardized streak messages. |
| D75 | **No emoji outside workouts.** Emoji appear only as workout-type icons (chips, workout rows, the log picker, workouts-by-type). Messages, streaks and empty states use plain text; plain symbols (✓ ↑ ↓ ★) stay. Supersedes D40's emoji in messages. | Owner's request. |
| D76 | **Quote of the day** replaces the encouraging message on Today: 26 short lines from well-known books on discipline, courage, ambition and self-respect (e.g. Atomic Habits, Jane Eyre, Frankenstein, The 48 Laws of Power, The Bell Jar, Meditations), each the book's exact wording or named translation, credited with author and title. About half have a darker edge; the list alternates moods. One per calendar day; tap for the next. Popular misattributions are avoided (e.g. the "excellence is a habit" line is credited to Will Durant, not Aristotle). List in `logic/quotes.js`. | Owner asked for motivating quotes with a "smart, intellectual, dark-feminine" feel, not all dark. |
| D77 | **Calorie balance for past days**: tap any day in the Dashboard chart (or today's numbers, or the balance line in the calendar's day sheet) to open that day's breakdown — result, a few plain reasons ("why"), and every number behind it (everyday burn at that day's weight, each workout with minutes/kcal, each meal). Arrows step back up to 90 days. | Owner wants to see past days and why each was a deficit or surplus. |
| D78 | "Why" reasons (`explainBalance`): eaten vs burned; what workouts added (or that there were none); the biggest meal if it was ≥35% of the day; for a small no-workout surplus, how much it would have taken to tip into a deficit; and eaten vs the calorie target. | Short, factual, specific to the day. |
| D79 | **Database version 3** (owner approved the Weight milestone): adds a `weights` store (id, date, dayKey, pounds), indexed by dayKey. Nothing earlier changes; upgrade tested from a version-2 database. Weigh-ins are in backups and a weights CSV. | Weigh-ins need their own table. |
| D80 | **Weight kept minor** (owner logs about every 2 weeks): Dashboard card with latest weight, change since the first weigh-in, lb to goal, a small chart (goal line + dashed projection), pace and estimated goal date, and "Next weigh-in" (14 days after the last). Because weigh-ins are far apart, the trend is a straight-line fit through weigh-ins in the last ~4 weeks (30 days) instead of a 7-day average; it needs two weigh-ins ≥10 days apart, otherwise "Not enough data yet". Losing vs gaining is judged from the highest weight seen. Weigh-ins can be viewed and deleted (Keep/Delete). | Fits a biweekly habit; replaces the planned 7-day average. |
| D81 | The newest weigh-in updates the weight in your stats; daily targets don't change by themselves. Calorie burn for each day uses the latest weigh-in on or before that day. | More accurate burn without surprising target changes. |
| D82 | **Click-through tests saved in the repo** (`tools/e2e/`, run with `npm run e2e`): 7 suites, 100 checks, covering database upgrades, Today, Calendar, Macros (fake Anthropic server), Dashboard (calorie math, "why", weight), backup/restore on a fresh "phone", and the prototype build. Playwright is installed separately with `npm install --no-save playwright` so the app stays library-free; GitHub's publish step still runs only the fast `npm test`. | Keeps the checks for future sessions and for the owner to rerun. |
| D83 | `docs/MAKE-YOUR-OWN.md`: a step-by-step guide for a friend to fork the repo, turn on GitHub Pages and Actions, install it, add her own API key, and customize (in-app settings, editing files on GitHub: colors, quotes and their test rules, name, icon, defaults; Claude Code for bigger changes), plus syncing, troubleshooting and privacy. CLAUDE.md tells a fork to make its own prototype page. | Owner wants friends to be able to make their own version. |
| D84 | **Several muscle groups per strength workout**: body focus is now a list (e.g. Upper body + Core), picked with multi-select chips ("pick all that apply"). Older workouts that stored one group as text still work everywhere (`bodyFocusList`). No database change needed. | Owner's request. |
| D85 | **Oura ring support is optional and per phone**: Settings → "I use an Oura ring", off by default, can be turned on any time (for friends who get a ring later). Off: everything uses Momentum's estimate. Turning it off again keeps the Oura numbers but goes back to estimates. | Several people use the app; only some have Oura. |
| D86 | **Oura screenshots in the Macros chat**: with Oura on, an attached photo gets a Meal / Oura screenshot switch. Oura photos are sent with "This is a screenshot from my Oura app. Today is …" and Claude answers through a second strict tool, `record_oura_activity` (date, total_burn, active_calories, steps, workouts[name, minutes, calories], is_oura, notes), offered only when Oura is on. Claude copies numbers, it doesn't estimate them. | Reliable reading with the same safe answer format as meals. |
| D87 | **Database version 4** (owner approved): adds `ouraDays` (id = day key as text, so a newer screenshot for the same day replaces the older one; totalBurn, activeCalories, steps, workouts). In backups and an Oura CSV. Upgrade tested from versions 1, 2 and 3. | Oura numbers need their own table. |
| D88 | For a day with Oura data (and Oura on), **Oura's measured Total Burn replaces the estimate** in the balance, streak, chart, "why" and breakdown (workouts shown as "included", nothing counted twice); other days keep the estimate. Oura's workouts are offered with checkboxes to add to the log (owner: ask each time); ones whose type is already logged that day start unticked; names are matched to your workout types (e.g. "Strength training" → Strength Training), unmatched ones are added as their own workout. | Owner's choices: measured burn for Oura users; no duplicate workouts. |

## 2. File structure

```
Momentum/
├── SPEC.md              ← this spec + decisions log
├── CLAUDE.md            ← rules for AI assistants working on the code
├── README.md            ← how to preview, test and put it on your phone
├── docs/MAKE-YOUR-OWN.md ← guide for friends: fork it, publish it, customize it
├── .github/workflows/publish.yml  ← runs tests, then publishes app/ to GitHub Pages
├── package.json         ← just the "npm test" / "npm start" shortcuts (no dependencies)
├── app/                 ← THE APP (this folder is what gets published)
│   ├── index.html           page skeleton + Home Screen settings
│   ├── manifest.webmanifest app name, icon, full-screen mode
│   ├── sw.js                offline support
│   ├── icons/               app icon (180/192/512 PNG + SVG)
│   ├── css/styles.css       all styling, light + dark colors
│   └── js/
│       ├── main.js          starts the app, tab bar, redraws
│       ├── db.js            database + numbered migrations
│       ├── data.js          actions: log workout, toggle supplement, first-launch defaults
│       ├── logic/           pure code with no screen parts → unit tested
│       │   ├── daykey.js        Date ⇄ YYYYMMDD
│       │   ├── monthgrid.js     calendar cells + weekday letters
│       │   ├── numbers.js       pace, number ⇄ text
│       │   ├── ordering.js      move items up/down in a list
│       │   ├── targets.js       Mifflin–St Jeor calories + macro targets
│       │   ├── meals.js         daily totals, saved-meal order
│       │   ├── mealEstimate.js  AI prompt, JSON schema, request/response, errors
│       │   ├── goals.js         under / on target / over, 7-day grid
│       │   ├── backup.js        backup file build/check, CSV
│       │   ├── energy.js        calorie burn (stats + workouts), balance, deficit streak
│       │   ├── oura.js          Oura screenshot data, workout matching
│       │   ├── weight.js        weigh-in trend, goal projection, next weigh-in
│       │   ├── quotes.js        quote of the day
│       │   ├── progress.js      weekly goal, streaks, logging cheer
│       │   ├── text.js          safe HTML text, plurals
│       │   └── workouts.js      activity kinds, defaults, summary line
│       ├── services/        anthropic.js: the only network call (meal estimates)
│       ├── ui/              building blocks: sheets, haptics, icons, date formatting, press-and-hold,
│                            toast, photo (shrinks photos before sending)
│       └── views/           screens: today, calendar, dayDetail, logWorkout,
│                            editWorkout, workoutFields, dayCards, manage (list editors),
│                            onboarding (welcome), settings, statsForm, macros, mealCards,
│                            dashboard, balanceData, balanceDay, weightView, backupView, comingSoon
├── tools/prototype/     ← builds the claude.ai prototype (not part of the app)
├── tools/e2e/           ← click-through tests in a phone-sized browser (npm run e2e)
├── tests/               ← npm test
│   ├── daykey.test.js
│   ├── energy.test.js
│   ├── goals-backup.test.js
│   ├── meals.test.js
│   ├── oura.test.js
│   ├── monthgrid.test.js
│   ├── ordering.test.js
│   ├── progress.test.js
│   ├── quotes.test.js
│   ├── weight-breakdown.test.js
│   ├── targets.test.js
│   └── numbers.test.js
└── ios-native/          ← earlier SwiftUI version (unused, see D28)
```

Later milestones add `views/macros.js`, `views/dashboard.js`, `views/weight.js`,
`views/settings.js`, `logic/targets.js`, `logic/macros.js`, `logic/trend.js`,
`services/anthropic.js`, `services/backup.js`, and matching tests.

## 3. Data model

### Database version 1 (Milestone 1, built)

**activityTypes**: one entry in the "Log workout" menu
| field | type | notes |
|---|---|---|
| id | text (UUID) | |
| name | text | "Running" |
| emoji | text | "🏃‍♀️" |
| detailKind | text | `running` / `stairMaster` / `strength` / `hotYoga` / `general` |
| sortOrder | number | menu order |
| archived | true/false | hidden from the menu, history kept |

Seeded: Running (running), Stair Master (stairMaster), Strength Training (strength),
Hot Yoga (hotYoga), Yoga, Pilates, Sculpt (general).

**workouts**: one logged workout (many per day allowed). Indexed by `dayKey`.
| field | type | notes |
|---|---|---|
| id | text (UUID) | |
| date | text (ISO time) | exact time |
| dayKey | number | `YYYYMMDD` (D6) |
| activityName, emoji, detailKind | text | copied from the activity (D7) |
| durationMinutes | number or null | all kinds |
| distanceMiles | number or null | running; pace = duration ÷ distance (calculated) |
| stairLevel, floors | number or null | stair master |
| bodyFocus | text or null | strength: Full body, Upper body, Lower body, Glutes, Arms, Back, Core |
| temperatureF | number or null | hot yoga |
| notes | text | strength, yoga, pilates, sculpt |
| createdAt | text (ISO time) | |

**supplements**: an item in the daily checklist
| field | type | notes |
|---|---|---|
| id | text (UUID) | |
| name | text | |
| doseNote | text | optional, "" if none |
| sortOrder | number | |
| archived | true/false | |
| createdAt | text (ISO time) | |

Seeded: Multivitamin, Probiotic, Omega-3, Collagen, Protein, Biotin, Iron, Creatine.

**supplementLogs**: "I took this supplement on this day". Indexed by `dayKey`.
| field | type | notes |
|---|---|---|
| id | text | `"<dayKey>:<supplementId>"`, so each supplement is logged at most once a day |
| supplementId | text | |
| supplementName | text | copy for history/export |
| dayKey | number | |
| loggedAt | text (ISO time) | |

Unchecking deletes the row.

**meta**: small settings as `{ key, value }`, e.g. `seeded.v1`.

### Settings in `meta` (Milestone 2, no migration — D46)
- **profile**: { sex, age, heightIn, weightLb, goalWeightLb, activity }
- **targets**: { calories, proteinG, carbsG, fatG }
- **weeklyGoal**: number (default 4) · **setup.done**: true · **anthropicApiKey**: text

### Database version 2 (Milestone 3, built — D52)
- **meals**: id, date, dayKey, name, calories, proteinG, carbsG, fatG, confidence, assumptions[], sourceText, createdAt. Indexed by dayKey.
- **savedMeals**: id, name, calories, proteinG, carbsG, fatG, assumptions[], favorite, useCount, lastUsed, createdAt.

### Database version 3 (Weight, built — D79)
- **weights**: id, date, dayKey, pounds, createdAt. Indexed by dayKey.

### Database version 4 (Oura, built — D87)
- **ouraDays**: id (= dayKey as text), dayKey, totalBurn, activeCalories, steps, workouts[{name, minutes, calories}], savedAt. Indexed by dayKey.

## 4. Milestones

1. **Today + Calendar** *(built)*: workout check-in with details, supplement checklist,
   month calendar with dots, day sheet with edit/delete/add. Tests: day keys, calendar grid, pace, summaries.
2. **Settings + targets**: your stats, Mifflin–St Jeor calculator, macro goals, manage supplements &
   workout types (add, rename, archive, reorder, dose notes), API key. Tests: calorie calc. *(database v2)*
3. **Macros AI chat**: describe a meal → Anthropic API → editable card → log; reply to adjust; favorites. Tests: macro totals, response parsing.
4. **Dashboard**: today's progress bars (under / on target / over) and a 7-day goal grid. Tests: goal status.
5. **Weight**: quick entry, 7-day average trend line, goal-weight line, dashed projection with estimated date
   (or "not enough data yet"). Tests: pace projection.
6. **Export / import**: CSV and JSON export, JSON import (backup & restore).

## 5. Behaviour details (Milestone 1)

- **Today tab**: date, greeting, big coral "Log workout" button, today's workouts, supplement checklist with "x of y" and "Check all".
- **Log workout sheet**: 2-column grid of big emoji tiles. Tap = logged instantly + haptic.
  The confirmation screen offers "Add details (optional)", "Log another workout" and "Undo".
- **Details by kind**: duration (with 20/30/45/60/75 min quick picks) for all; running → distance + live pace;
  stair master → level, floors; strength → body focus chips + notes; hot yoga → temperature °F; others → notes.
- **Editing**: tap any workout to change its date/time and details, or delete it (Delete → Keep / Delete).
- **Calendar**: month grid, arrows or swipe to change month, "Today" button, today circled in coral,
  dots under days, legend + supplement-dot toggle, monthly workout count. Tap a day → sheet with that
  day's workouts (edit/delete/add) and its supplement checklist (past days editable).
- Today's date rolls over automatically when you reopen the app the next day.
