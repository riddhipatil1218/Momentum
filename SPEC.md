# Momentum — Spec

A personal app (one user, one iPhone) for logging workouts, supplements, meals/macros
and weight. It's a **web app**: you add it to the iPhone Home Screen and it runs full
screen like a regular app. All data is stored on the phone.

Status: **Milestone 1 built (web version), awaiting your review.** Sections marked
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

## 2. File structure

```
Momentum/
├── SPEC.md              ← this spec + decisions log
├── CLAUDE.md            ← rules for AI assistants working on the code
├── README.md            ← how to preview, test and put it on your phone
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
│       │   ├── progress.js      weekly goal, streaks, encouraging messages
│       │   ├── text.js          safe HTML text, plurals
│       │   └── workouts.js      activity kinds, defaults, summary line
│       ├── ui/              building blocks: sheets, haptics, icons, date formatting, press-and-hold
│       └── views/           screens: today, calendar, dayDetail, logWorkout,
│                            editWorkout, workoutFields, dayCards, manage (list editors), comingSoon
├── tools/prototype/     ← builds the claude.ai prototype (not part of the app)
├── tests/               ← npm test
│   ├── daykey.test.js
│   ├── monthgrid.test.js
│   ├── ordering.test.js
│   ├── progress.test.js
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

### Database version 2 *(planned; I'll ask before adding)*
New stores only, so existing data is untouched:
- **profile** (in `meta`): sex, age, heightCm, currentWeightLb, activityLevel, goalWeightLb.
- **goals** (in `meta`): calories, proteinG, carbsG, fatG.
- **meals**: id, date, dayKey, name, calories, proteinG, carbsG, fatG, confidence, assumptions, sourceText. Indexed by dayKey.
- **savedMeals**: favorites for one-tap re-logging (nutrition fields + lastUsed, useCount).
- **weights**: id, date, dayKey, pounds. Indexed by dayKey.

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
